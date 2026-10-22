const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const { badRequest, notFound } = require('../lib/errors');

const STATUSES = ['received', 'in_progress', 'ready', 'delivered', 'cancelled'];

function generateJobNumber() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const suffix = Date.now().toString(36).slice(-5).toUpperCase();
  return `REP-${date}-${suffix}`;
}

function parseOptionalMoney(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw badRequest('Cost values must be positive numbers');
  return Math.round(n * 100) / 100;
}

function parseOptionalString(value, max = 500) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return String(value).slice(0, max);
}

function parseOptionalDate(value) {
  if (value === undefined) return undefined;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest('Invalid due date');
  return date;
}

function buildData(body, { partial }) {
  const data = {};

  if (!partial || body.customerId !== undefined) {
    const customerId = Number(body.customerId);
    if (!Number.isInteger(customerId) || customerId <= 0) throw badRequest('A customer is required');
    data.customerId = customerId;
  }
  if (!partial || body.deviceBrand !== undefined) {
    const brand = String(body.deviceBrand || '').trim();
    if (!brand) throw badRequest('Device brand is required');
    data.deviceBrand = brand.slice(0, 100);
  }
  if (!partial || body.deviceModel !== undefined) {
    const model = String(body.deviceModel || '').trim();
    if (!model) throw badRequest('Device model is required');
    data.deviceModel = model.slice(0, 100);
  }
  if (!partial || body.problem !== undefined) {
    const problem = String(body.problem || '').trim();
    if (!problem) throw badRequest('Problem description is required');
    data.problem = problem.slice(0, 1000);
  }

  const imei = parseOptionalString(body.imei, 50);
  if (imei !== undefined) data.imei = imei || null;

  const diagnosis = parseOptionalString(body.diagnosis, 1000);
  if (diagnosis !== undefined) data.diagnosis = diagnosis || null;

  const notes = parseOptionalString(body.notes, 1000);
  if (notes !== undefined) data.notes = notes || null;

  const estimatedCost = parseOptionalMoney(body.estimatedCost);
  if (estimatedCost !== undefined) data.estimatedCost = estimatedCost;

  const finalCost = parseOptionalMoney(body.finalCost);
  if (finalCost !== undefined) data.finalCost = finalCost;

  if (body.advancePaid !== undefined) {
    const advance = parseOptionalMoney(body.advancePaid);
    data.advancePaid = advance === null ? 0 : advance;
  }

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw badRequest('Invalid repair status');
    data.status = body.status;
  }

  const dueDate = parseOptionalDate(body.dueDate);
  if (dueDate !== undefined) data.dueDate = dueDate;

  return data;
}

router.get('/', auth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { jobNumber: { contains: search } },
        { deviceModel: { contains: search } },
        { deviceBrand: { contains: search } },
        { customer: { is: { name: { contains: search } } } },
        { customer: { is: { phone: { contains: search } } } },
      ];
    }
    const jobs = await prisma.repairJob.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = buildData(req.body || {}, { partial: false });
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw badRequest('Customer not found');

    if (data.status === 'delivered') data.deliveredAt = new Date();

    const job = await prisma.repairJob.create({
      data: { ...data, jobNumber: generateJobNumber() },
      include: { customer: true },
    });
    res.status(201).json(job);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid repair id');

    const existing = await prisma.repairJob.findUnique({ where: { id } });
    if (!existing) throw notFound('Repair job not found');

    const data = buildData(req.body || {}, { partial: true });

    if (data.status === 'delivered') {
      data.deliveredAt = existing.deliveredAt || new Date();
    } else if (data.status) {
      data.deliveredAt = null;
    }

    const job = await prisma.repairJob.update({
      where: { id },
      data,
      include: { customer: true },
    });
    res.json(job);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid repair id');
    const job = await prisma.repairJob.findUnique({ where: { id }, include: { customer: true } });
    if (!job) throw notFound('Repair job not found');
    res.json(job);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) throw badRequest('Invalid repair id');
    await prisma.repairJob.delete({ where: { id } });
    res.json({ message: 'Repair job deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
