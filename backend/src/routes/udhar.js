const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { roundMoney } = require('../lib/money');
const { badRequest, notFound } = require('../lib/errors');

function parseOptionalDate(value) {
  if (value === undefined) return undefined;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest('Invalid due date');
  return date;
}

router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const records = await prisma.udharRecord.findMany({
      where,
      include: { customer: true, payments: true },
      orderBy: { remainingAmount: 'desc' },
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const body = req.body || {};
    const customerId = Number(body.customerId);
    const totalAmount = roundMoney(body.totalAmount);
    const description = String(body.description || '').trim();

    if (!Number.isInteger(customerId) || customerId <= 0) throw badRequest('A customer is required');
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw badRequest('Amount must be greater than zero');
    if (!description) throw badRequest('A description is required');

    const record = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw badRequest('Customer not found');

      const created = await tx.udharRecord.create({
        data: {
          customerId,
          totalAmount,
          remainingAmount: totalAmount,
          description: description.slice(0, 300),
          dueDate: parseOptionalDate(body.dueDate) ?? null,
        },
        include: { customer: true },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: { outstandingBalance: { increment: totalAmount } },
      });

      return created;
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Add a payment to an udhar record
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid udhar id');

    const amountPaid = roundMoney(req.body?.amountPaid);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      throw badRequest('Payment amount must be greater than zero');
    }
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 300) : null;

    const updated = await prisma.$transaction(async (tx) => {
      const udhar = await tx.udharRecord.findUnique({ where: { id } });
      if (!udhar) throw notFound('Udhar record not found');
      if (udhar.status === 'cleared') throw badRequest('This udhar is already cleared');
      if (amountPaid > udhar.remainingAmount + 0.005) {
        throw badRequest(`Payment cannot be more than the remaining Rs. ${udhar.remainingAmount}`);
      }

      const newPaid = roundMoney(udhar.paidAmount + amountPaid);
      const newRemaining = Math.max(0, roundMoney(udhar.totalAmount - newPaid));
      const status = newRemaining <= 0 ? 'cleared' : (newPaid > 0 ? 'partial' : 'pending');

      const record = await tx.udharRecord.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status,
          payments: { create: { amountPaid, note } },
        },
        include: { customer: true, payments: true },
      });

      await tx.customer.update({
        where: { id: udhar.customerId },
        data: { outstandingBalance: { decrement: amountPaid } },
      });

      return record;
    });

    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid udhar id');
    const record = await prisma.udharRecord.findUnique({
      where: { id },
      include: { customer: true, payments: true },
    });
    if (!record) throw notFound('Udhar record not found');
    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Only descriptive fields can be edited. Amounts must change through payments
// so the customer's outstanding balance stays correct.
router.put('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid udhar id');

    const data = {};
    if (req.body?.description !== undefined) {
      const description = String(req.body.description || '').trim();
      if (!description) throw badRequest('A description is required');
      data.description = description.slice(0, 300);
    }
    const dueDate = parseOptionalDate(req.body?.dueDate);
    if (dueDate !== undefined) data.dueDate = dueDate;

    const record = await prisma.udharRecord.update({
      where: { id },
      data,
      include: { customer: true, payments: true },
    });
    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid udhar id');

    await prisma.$transaction(async (tx) => {
      const record = await tx.udharRecord.findUnique({ where: { id } });
      if (!record) throw notFound('Udhar record not found');

      if (record.remainingAmount > 0) {
        await tx.customer.update({
          where: { id: record.customerId },
          data: { outstandingBalance: { decrement: record.remainingAmount } },
        });
      }
      await tx.udharPayment.deleteMany({ where: { udharId: id } });
      await tx.udharRecord.delete({ where: { id } });
    });

    res.json({ message: 'Udhar record deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
