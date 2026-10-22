const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { getPagination, paginated } = require('../lib/pagination');
const { roundMoney } = require('../lib/money');
const { badRequest, notFound } = require('../lib/errors');

const purchaseInclude = {
  supplier: true,
  items: { include: { product: true } },
};

// List purchases, newest first
router.get('/', auth, async (req, res) => {
  try {
    const pagination = getPagination(req.query);
    const where = {};
    if (req.query.supplierId) {
      const supplierId = Number(req.query.supplierId);
      if (!Number.isInteger(supplierId)) throw badRequest('Invalid supplier');
      where.supplierId = supplierId;
    }

    const [total, items] = await prisma.$transaction([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        include: purchaseInclude,
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

// Record a stock purchase. Linked items increase product stock and refresh
// the product's purchase price; the unpaid amount is added to the supplier.
router.post('/', auth, async (req, res) => {
  try {
    const body = req.body || {};
    const supplierId = Number(body.supplierId);
    if (!Number.isInteger(supplierId) || supplierId <= 0) throw badRequest('A supplier is required');

    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) throw badRequest('Add at least one purchase item');

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw badRequest('Supplier not found');

    const productIds = rawItems
      .map((item) => Number(item.productId))
      .filter((id) => Number.isInteger(id) && id > 0);

    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: [...new Set(productIds)] } } })
      : [];
    const productMap = new Map(products.map((product) => [product.id, product]));

    const lines = rawItems.map((item) => {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw badRequest('Purchase quantities must be positive whole numbers');
      }

      const productId = Number(item.productId) || null;
      const product = productId ? productMap.get(productId) : null;
      if (productId && !product) throw badRequest('One of the selected products no longer exists');

      const rawPrice = item.unitPrice === undefined || item.unitPrice === ''
        ? (product ? product.purchasePrice : 0)
        : Number(item.unitPrice);
      if (!Number.isFinite(rawPrice) || rawPrice < 0) {
        throw badRequest('Unit price must be a positive number');
      }
      const unitPrice = roundMoney(rawPrice);

      const description = String(
        item.description || (product ? `${product.brand} ${product.model}` : '')
      ).trim();
      if (!description) throw badRequest('Each purchase item needs a description');

      return {
        productId: product ? product.id : null,
        description: description.slice(0, 200),
        quantity,
        unitPrice,
        total: roundMoney(unitPrice * quantity),
      };
    });

    const totalAmount = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
    if (totalAmount <= 0 && lines.some((line) => line.unitPrice > 0)) {
      throw badRequest('Purchase total must be greater than zero');
    }

    const requestedPaid = body.paidAmount === undefined || body.paidAmount === ''
      ? 0
      : Number(body.paidAmount);
    if (!Number.isFinite(requestedPaid) || requestedPaid < 0) {
      throw badRequest('Invalid amount paid');
    }
    if (requestedPaid > totalAmount + 0.01) {
      throw badRequest('Amount paid cannot be greater than the purchase total');
    }
    const paidAmount = roundMoney(Math.min(requestedPaid, totalAmount));
    const balance = roundMoney(totalAmount - paidAmount);
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : null;

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          supplierId,
          totalAmount,
          paidAmount,
          notes,
          items: { create: lines },
        },
      });

      for (const line of lines) {
        if (!line.productId) continue;
        await tx.product.update({
          where: { id: line.productId },
          data: {
            stockQty: { increment: line.quantity },
            ...(line.unitPrice > 0 ? { purchasePrice: line.unitPrice } : {}),
          },
        });
      }

      if (balance > 0) {
        await tx.supplier.update({
          where: { id: supplierId },
          data: { outstandingBalance: { increment: balance } },
        });
      }

      return tx.purchase.findUnique({ where: { id: created.id }, include: purchaseInclude });
    });

    res.status(201).json(purchase);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid purchase id');
    const purchase = await prisma.purchase.findUnique({ where: { id }, include: purchaseInclude });
    if (!purchase) throw notFound('Purchase not found');
    res.json(purchase);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
