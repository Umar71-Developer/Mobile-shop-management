const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { network, from, to } = req.query;
    let where = {};
    if (network) where.network = network;
    if (from && to) where.createdAt = { gte: new Date(from), lte: new Date(to) };
    const sales = await prisma.easyLoadSale.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(sales);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const sale = await prisma.easyLoadSale.create({ data: req.body });
    res.json(sale);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const sale = await prisma.easyLoadSale.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(sale);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.easyLoadSale.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
