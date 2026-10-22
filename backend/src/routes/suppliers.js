const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { badRequest, notFound } = require('../lib/errors');

function buildSupplierData(body, { partial }) {
  const data = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) throw badRequest('Supplier name is required');
    data.name = name.slice(0, 100);
  }
  if (!partial || body.phone !== undefined) {
    const phone = String(body.phone || '').trim();
    if (!phone) throw badRequest('Supplier phone is required');
    data.phone = phone.slice(0, 30);
  }
  if (body.address !== undefined) {
    data.address = body.address ? String(body.address).slice(0, 300) : null;
  }

  return data;
}

router.get('/', auth, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true, purchases: true } } },
    });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const supplier = await prisma.supplier.create({ data: buildSupplierData(req.body || {}, { partial: false }) });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid supplier id');
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { products: true, purchases: { include: { items: true }, orderBy: { createdAt: 'desc' } } },
    });
    if (!supplier) throw notFound('Supplier not found');
    res.json(supplier);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid supplier id');
    const supplier = await prisma.supplier.update({
      where: { id },
      data: buildSupplierData(req.body || {}, { partial: true }),
    });
    res.json(supplier);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid supplier id');

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { products: true, purchases: true } } },
    });
    if (!supplier) throw notFound('Supplier not found');
    if (supplier._count.products > 0 || supplier._count.purchases > 0) {
      throw badRequest('Supplier has products or purchases linked and cannot be deleted');
    }

    await prisma.supplier.delete({ where: { id } });
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
