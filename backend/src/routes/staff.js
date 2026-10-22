const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.get('/', auth, async (req, res) => {
  try {
    const staff = await prisma.user.findMany({ select: { id: true, name: true, phone: true, role: true, isActive: true, createdAt: true } });
    res.json(staff);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, phone, password: hashed, role }, select: { id: true, name: true, phone: true, role: true } });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    let data = rest;
    if (password) data.password = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({ where: { id: parseInt(req.params.id) }, data, select: { id: true, name: true, phone: true, role: true, isActive: true } });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Clock in
router.post('/attendance/clockin', auth, async (req, res) => {
  try {
    const att = await prisma.attendance.create({ data: { userId: req.user.id } });
    res.json(att);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Clock out
router.put('/attendance/:id/clockout', auth, async (req, res) => {
  try {
    const att = await prisma.attendance.update({ where: { id: parseInt(req.params.id) }, data: { clockOut: new Date() } });
    res.json(att);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete staff member
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Staff member deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
