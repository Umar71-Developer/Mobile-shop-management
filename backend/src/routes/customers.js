const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { badRequest, notFound } = require('../lib/errors');

function buildCustomerData(body, { partial }) {
  const data = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) throw badRequest('Customer name is required');
    data.name = name.slice(0, 100);
  }
  if (!partial || body.phone !== undefined) {
    const phone = String(body.phone || '').trim();
    if (!phone) throw badRequest('Customer phone is required');
    data.phone = phone.slice(0, 30);
  }
  if (body.address !== undefined) {
    data.address = body.address ? String(body.address).slice(0, 300) : null;
  }

  return data;
}

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      where.OR = [{ name: { contains: search } }, { phone: { contains: search } }];
    }
    const customers = await prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const customer = await prisma.customer.create({ data: buildCustomerData(req.body || {}, { partial: false }) });
    res.status(201).json(customer);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid customer id');
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: { orderBy: { createdAt: 'desc' } },
        repairJobs: { orderBy: { createdAt: 'desc' } },
        udharRecords: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) throw notFound('Customer not found');
    res.json(customer);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid customer id');
    const customer = await prisma.customer.update({
      where: { id },
      data: buildCustomerData(req.body || {}, { partial: true }),
    });
    res.json(customer);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid customer id');

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { sales: true, repairJobs: true, udharRecords: true } } },
    });
    if (!customer) throw notFound('Customer not found');

    const history = customer._count.sales + customer._count.repairJobs + customer._count.udharRecords;
    if (history > 0) {
      throw badRequest('Customer has sales, repairs or udhar history and cannot be deleted');
    }
    if (Math.abs(customer.outstandingBalance) > 0.01) {
      throw badRequest('Customer has an outstanding balance and cannot be deleted');
    }

    await prisma.customer.delete({ where: { id } });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
