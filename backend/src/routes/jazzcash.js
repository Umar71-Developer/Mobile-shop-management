const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    let where = {};
    if (from && to) where.createdAt = { gte: new Date(from), lte: new Date(to) };
    const txns = await prisma.jazzCashTransaction.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(txns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const txn = await prisma.jazzCashTransaction.create({ data: req.body });
    res.json(txn);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const txn = await prisma.jazzCashTransaction.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(txn);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.jazzCashTransaction.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
