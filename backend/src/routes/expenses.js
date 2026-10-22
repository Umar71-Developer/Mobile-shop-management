const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    let where = {};
    if (from && to) where.date = { gte: new Date(from), lte: new Date(to) };
    const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } });
    res.json(expenses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const expense = await prisma.expense.create({ data: req.body });
    res.json(expense);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(expense);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
