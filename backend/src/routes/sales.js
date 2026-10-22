const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { startOfDay, endOfDay } = require('../lib/dates');
const { getPagination, paginated } = require('../lib/pagination');
const { roundMoney } = require('../lib/money');
const { badRequest, notFound } = require('../lib/errors');

const saleInclude = {
  customer: true,
  user: { select: { id: true, name: true, role: true } },
  saleItems: { include: { product: true } },
  udharRecord: true,
};

// List sales (paginated) with optional status, date and search filters
router.get('/', auth, async (req, res) => {
  try {
    const { status, from, to, search } = req.query;
    const pagination = getPagination(req.query);
    const where = {};

    if (status) where.status = status;

    if (from || to) {
      where.createdAt = {};
      if (from) {
        const start = startOfDay(from);
        if (!start) throw badRequest('Invalid "from" date');
        where.createdAt.gte = start;
      }
      if (to) {
        const end = endOfDay(to);
        if (!end) throw badRequest('Invalid "to" date');
        where.createdAt.lte = end;
      }
    }

    if (search) {
      const numeric = Number(search);
      where.OR = [
        ...(Number.isInteger(numeric) && numeric > 0 ? [{ id: numeric }] : []),
        { customer: { is: { name: { contains: search } } } },
        { customer: { is: { phone: { contains: search } } } },
      ];
    }

    const [total, items] = await prisma.$transaction([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: saleInclude,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    res.json(paginated(items, total, pagination));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Create a sale atomically: validates stock, writes items, decrements stock
// and, for a credit sale, records the outstanding balance against the customer.
router.post('/', auth, async (req, res) => {
  try {
    const body = req.body || {};
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) throw badRequest('A sale must contain at least one item');

    const customerId = body.customerId ? Number(body.customerId) : null;
    if (customerId !== null && (!Number.isInteger(customerId) || customerId <= 0)) {
      throw badRequest('Invalid customer');
    }

    const discount = roundMoney(body.discount);
    if (discount < 0) throw badRequest('Discount cannot be negative');

    const paymentMode = body.paymentMode === 'jazzcash' ? 'jazzcash' : 'cash';
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : null;

    // Merge duplicate lines so stock is validated once per product.
    const qtyByProduct = new Map();
    for (const item of rawItems) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || productId <= 0) throw badRequest('Invalid product in sale');
      if (!Number.isInteger(quantity) || quantity <= 0) throw badRequest('Item quantity must be a positive whole number');
      qtyByProduct.set(productId, (qtyByProduct.get(productId) || 0) + quantity);
    }

    const productIds = [...qtyByProduct.keys()];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    if (products.length !== productIds.length) {
      throw badRequest('One or more products are no longer available');
    }

    const lines = products.map((product) => {
      const quantity = qtyByProduct.get(product.id);
      const unitPrice = roundMoney(product.sellingPrice);
      return {
        productId: product.id,
        quantity,
        unitPrice,
        total: roundMoney(unitPrice * quantity),
        name: `${product.brand} ${product.model}`,
        stockQty: product.stockQty,
      };
    });

    for (const line of lines) {
      if (line.quantity > line.stockQty) {
        throw badRequest(`Not enough stock for ${line.name} (${line.stockQty} left)`);
      }
    }

    const itemsRevenue = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
    if (discount > itemsRevenue) throw badRequest('Discount cannot be greater than the sale total');
    const totalAmount = roundMoney(itemsRevenue - discount);

    const requestedPaid = body.paidAmount === undefined || body.paidAmount === null || body.paidAmount === ''
      ? totalAmount
      : Number(body.paidAmount);
    if (!Number.isFinite(requestedPaid) || requestedPaid < 0) {
      throw badRequest('Invalid amount received');
    }
    if (requestedPaid > totalAmount + 0.01) {
      throw badRequest('Amount received cannot be greater than the total');
    }
    const paidAmount = roundMoney(Math.min(requestedPaid, totalAmount));
    const balance = roundMoney(totalAmount - paidAmount);

    if (balance > 0 && !customerId) {
      throw badRequest('Select a customer to record the unpaid balance as udhar');
    }

    const sale = await prisma.$transaction(async (tx) => {
      if (customerId) {
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) throw badRequest('Customer not found');
      }

      const created = await tx.sale.create({
        data: {
          customerId,
          userId: req.user.id,
          totalAmount,
          paidAmount,
          discount,
          paymentMode,
          notes,
          saleItems: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              total: line.total,
            })),
          },
        },
      });

      // Decrement stock inside the transaction and fail the whole sale if a
      // concurrent sale consumed the remaining stock first.
      for (const line of lines) {
        const updated = await tx.product.update({
          where: { id: line.productId },
          data: { stockQty: { decrement: line.quantity } },
        });
        if (updated.stockQty < 0) {
          throw badRequest(`Not enough stock for ${line.name}`);
        }
      }

      if (balance > 0) {
        await tx.udharRecord.create({
          data: {
            customerId,
            saleId: created.id,
            totalAmount,
            paidAmount,
            remainingAmount: balance,
            description: `Credit sale #${created.id}`,
            status: 'pending',
          },
        });
        await tx.customer.update({
          where: { id: customerId },
          data: { outstandingBalance: { increment: balance } },
        });
      }

      return tx.sale.findUnique({ where: { id: created.id }, include: saleInclude });
    });

    res.status(201).json(sale);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Refund a completed sale: restores stock, cancels any linked udhar balance
// and marks the sale as refunded.
router.post('/:id/refund', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid sale id');

    const sale = await prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({
        where: { id },
        include: { saleItems: true, udharRecord: true },
      });
      if (!existing) throw notFound('Sale not found');
      if (existing.status === 'refunded') throw badRequest('This sale has already been refunded');

      for (const item of existing.saleItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity } },
        });
      }

      if (existing.udharRecord) {
        if (existing.udharRecord.remainingAmount > 0) {
          await tx.customer.update({
            where: { id: existing.udharRecord.customerId },
            data: { outstandingBalance: { decrement: existing.udharRecord.remainingAmount } },
          });
        }
        await tx.udharPayment.deleteMany({ where: { udharId: existing.udharRecord.id } });
        await tx.udharRecord.delete({ where: { id: existing.udharRecord.id } });
      }

      return tx.sale.update({
        where: { id },
        data: { status: 'refunded', refundedAt: new Date() },
        include: saleInclude,
      });
    });

    res.json(sale);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid sale id');
    const sale = await prisma.sale.findUnique({ where: { id }, include: saleInclude });
    if (!sale) throw notFound('Sale not found');
    res.json(sale);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
