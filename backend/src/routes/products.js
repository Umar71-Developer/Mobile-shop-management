const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { roundMoney } = require('../lib/money');
const { badRequest, notFound } = require('../lib/errors');

const CATEGORIES = ['phone', 'accessory', 'sim'];

function parsePrice(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw badRequest(`${label} must be a positive number`);
  return roundMoney(n);
}

function buildProductData(body, { partial }) {
  const data = {};

  if (!partial || body.brand !== undefined) {
    const brand = String(body.brand || '').trim();
    if (!brand) throw badRequest('Brand is required');
    data.brand = brand.slice(0, 100);
  }
  if (!partial || body.model !== undefined) {
    const model = String(body.model || '').trim();
    if (!model) throw badRequest('Model is required');
    data.model = model.slice(0, 100);
  }
  if (!partial || body.purchasePrice !== undefined) {
    data.purchasePrice = parsePrice(body.purchasePrice, 'Purchase price');
  }
  if (!partial || body.sellingPrice !== undefined) {
    data.sellingPrice = parsePrice(body.sellingPrice, 'Selling price');
  }

  if (body.color !== undefined) {
    data.color = body.color ? String(body.color).slice(0, 50) : null;
  }
  if (body.storage !== undefined) {
    data.storage = body.storage ? String(body.storage).slice(0, 50) : null;
  }
  if (body.imei !== undefined) {
    // Empty strings must become NULL: SQLite allows many NULLs in a unique
    // index, but only one empty string.
    const imei = String(body.imei || '').trim();
    data.imei = imei || null;
  }
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) throw badRequest('Invalid category');
    data.category = body.category;
  }
  if (body.stockQty !== undefined) {
    const stockQty = Number(body.stockQty);
    if (!Number.isInteger(stockQty) || stockQty < 0) {
      throw badRequest('Stock quantity must be a whole number of zero or more');
    }
    data.stockQty = stockQty;
  }
  if (body.supplierId !== undefined) {
    if (body.supplierId === null || body.supplierId === '') {
      data.supplierId = null;
    } else {
      const supplierId = Number(body.supplierId);
      if (!Number.isInteger(supplierId) || supplierId <= 0) throw badRequest('Invalid supplier');
      data.supplierId = supplierId;
    }
  }

  return data;
}

router.get('/', auth, async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    const where = { isActive: true };
    if (category) where.category = category;
    if (lowStock === 'true') where.stockQty = { lte: 2 };
    if (search) {
      where.OR = [
        { brand: { contains: search } },
        { model: { contains: search } },
        { imei: { contains: search } },
      ];
    }
    const products = await prisma.product.findMany({
      where,
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = buildProductData(req.body || {}, { partial: false });
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid product id');
    const product = await prisma.product.findUnique({ where: { id }, include: { supplier: true } });
    if (!product) throw notFound('Product not found');
    res.json(product);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid product id');
    const product = await prisma.product.update({
      where: { id },
      data: buildProductData(req.body || {}, { partial: true }),
    });
    res.json(product);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid product id');
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
