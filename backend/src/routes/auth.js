const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { email, password, name, role = 'participant' } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  const allowed = role === 'admin' ? false : ['participant', 'organizer'].includes(role);
  if (!allowed) return res.status(400).json({ error: 'Invalid role' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const id = uuidv4();
  const hash = await bcrypt.hash(password, 10);
  db.prepare(`INSERT INTO users (id, email, password, role, name) VALUES (?, ?, ?, ?, ?)`).run(id, email, hash, role, name);

  const token = jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '7d' });
  const user = db.prepare('SELECT id, email, role, name, company, job_role, skills, interests, avatar, points FROM users WHERE id = ?').get(id);
  res.json({ token, user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', require('../middleware/auth').auth, (req, res) => {
  const user = db.prepare('SELECT id, email, role, name, company, job_role, skills, interests, avatar, bio, linkedin, twitter, points, streak, qr_code FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
