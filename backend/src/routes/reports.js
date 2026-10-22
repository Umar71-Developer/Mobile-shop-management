const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { parseLocalDate, startOfDay, endOfDay, toLocalISODate } = require('../lib/dates');
const { roundMoney } = require('../lib/money');
const { badRequest } = require('../lib/errors');

function sumSales(sales) {
  let itemsRevenue = 0;
  let cogs = 0;
  let discount = 0;

  for (const sale of sales) {
    discount += sale.discount || 0;
    for (const item of sale.saleItems) {
      itemsRevenue += item.total || 0;
      cogs += (item.product?.purchasePrice || 0) * item.quantity;
    }
  }

  const revenue = roundMoney(sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0));
  const grossProfit = roundMoney(itemsRevenue - cogs - discount);

  return {
    count: sales.length,
    revenue,
    itemsRevenue: roundMoney(itemsRevenue),
    cogs: roundMoney(cogs),
    discount: roundMoney(discount),
    grossProfit,
  };
}

function sumRepairs(jobs) {
  return {
    count: jobs.length,
    total: roundMoney(jobs.reduce((sum, job) => sum + (job.finalCost || 0), 0)),
  };
}

function sumExpenses(expenses) {
  return {
    count: expenses.length,
    total: roundMoney(expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)),
  };
}

function sumCommissions(rows) {
  return {
    count: rows.length,
    commission: roundMoney(rows.reduce((sum, row) => sum + (row.commission || 0), 0)),
  };
}

async function loadReport({ start, end }) {
  const [sales, expenses, repairJobs, easyload, jazzcash, pendingUdhar] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'completed' },
      include: { saleItems: { include: { product: { select: { purchasePrice: true } } } } },
    }),
    prisma.expense.findMany({ where: { date: { gte: start, lte: end } } }),
    prisma.repairJob.findMany({ where: { status: 'delivered', deliveredAt: { gte: start, lte: end } } }),
    prisma.easyLoadSale.findMany({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.jazzCashTransaction.findMany({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.udharRecord.findMany({ where: { status: { not: 'cleared' } } }),
  ]);

  const salesSummary = sumSales(sales);
  const repairs = sumRepairs(repairJobs);
  const expensesSummary = sumExpenses(expenses);
  const easyloadSummary = sumCommissions(easyload);
  const jazzcashSummary = sumCommissions(jazzcash);

  return {
    sales: salesSummary,
    repairs,
    expenses: expensesSummary,
    easyload: easyloadSummary,
    jazzcash: jazzcashSummary,
    udhar: {
      pending: pendingUdhar.length,
      total: roundMoney(pendingUdhar.reduce((sum, record) => sum + (record.remainingAmount || 0), 0)),
    },
    // Net profit uses gross margin (selling price minus purchase cost), not
    // gross revenue. Udhar is a receivable, not income, so it is excluded.
    netProfit: roundMoney(
      salesSummary.grossProfit +
      repairs.total +
      easyloadSummary.commission +
      jazzcashSummary.commission -
      expensesSummary.total
    ),
  };
}

// Most recent calendar day that has any shop activity. Used by the dashboard
// to offer a one-click jump when today has no records yet.
router.get('/latest-activity', auth, async (req, res) => {
  try {
    const [sales, repairs, expenses, easyload, jazzcash, purchases] = await Promise.all([
      prisma.sale.aggregate({ where: { status: 'completed' }, _max: { createdAt: true } }),
      prisma.repairJob.aggregate({ where: { status: 'delivered' }, _max: { deliveredAt: true } }),
      prisma.expense.aggregate({ _max: { date: true } }),
      prisma.easyLoadSale.aggregate({ _max: { createdAt: true } }),
      prisma.jazzCashTransaction.aggregate({ _max: { createdAt: true } }),
      prisma.purchase.aggregate({ _max: { createdAt: true } }),
    ]);

    const dates = [
      sales._max.createdAt,
      repairs._max.deliveredAt,
      expenses._max.date,
      easyload._max.createdAt,
      jazzcash._max.createdAt,
      purchases._max.createdAt,
    ].filter(Boolean);

    const latest = dates.length
      ? new Date(Math.max(...dates.map((value) => new Date(value).getTime())))
      : null;

    res.json({ date: latest ? toLocalISODate(latest) : null });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Daily summary report
router.get('/daily', auth, async (req, res) => {
  try {
    const base = req.query.date ? parseLocalDate(req.query.date) : new Date();
    const start = startOfDay(base);
    const end = endOfDay(base);
    if (!start || !end) throw badRequest('Invalid date');

    const report = await loadReport({ start, end });
    res.json({ date: start.toDateString(), ...report });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Monthly report
router.get('/monthly', auth, async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    if (month < 1 || month > 12) throw badRequest('Month must be between 1 and 12');

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const report = await loadReport({ start, end });
    res.json({
      period: `${year}-${String(month).padStart(2, '0')}`,
      from: start.toISOString(),
      to: end.toISOString(),
      ...report,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
