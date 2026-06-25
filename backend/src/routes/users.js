const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { db } = require('../database');
const { auth, requireRole } = require('../middleware/auth');

router.put('/profile', auth, async (req, res) => {
  const { name, company, job_role, skills, interests, bio, linkedin, twitter } = req.body;
  db.prepare(`UPDATE users SET name=?, company=?, job_role=?, skills=?, interests=?, bio=?, linkedin=?, twitter=?, updated_at=datetime('now') WHERE id=?`)
    .run(name, company, job_role, skills, interests, bio, linkedin, twitter, req.user.id);

  // Generate QR code if not exists
  const user = db.prepare('SELECT qr_code FROM users WHERE id = ?').get(req.user.id);
  if (!user.qr_code) {
    const qr = await QRCode.toDataURL(`connectquest://user/${req.user.id}`);
    db.prepare('UPDATE users SET qr_code = ? WHERE id = ?').run(qr, req.user.id);
  }

  const updated = db.prepare('SELECT id, email, role, name, company, job_role, skills, interests, avatar, bio, linkedin, twitter, points, streak, qr_code FROM users WHERE id = ?').get(req.user.id);
  res.json(updated);
});

router.get('/:id', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, company, job_role, skills, interests, avatar, bio, linkedin, twitter, points, qr_code FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Admin: list all users
router.get('/', auth, requireRole('admin'), (req, res) => {
  const users = db.prepare('SELECT id, email, role, name, company, points, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// Admin: update user role
router.put('/:id/role', auth, requireRole('admin'), (req, res) => {
  const { role } = req.body;
  if (!['participant', 'organizer', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ success: true });
});

module.exports = router;
