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

// Guest join: name only, no password/email required
router.post('/guest-join/:code', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const event = db.prepare("SELECT * FROM events WHERE join_code = ? AND status = 'active'").get(req.params.code.toUpperCase());
  if (!event) return res.status(404).json({ error: 'Event not found or not active' });

  // Create a guest user (email derived from name + random suffix, no real password)
  const guestId = uuidv4();
  const guestEmail = `guest_${guestId.slice(0, 8)}@connectquest.guest`;
  const hash = await bcrypt.hash(uuidv4(), 4); // throwaway password

  const QRCode = require('qrcode');
  const qr = await QRCode.toDataURL(`connectquest://user/${guestId}`);

  db.prepare(`INSERT INTO users (id, email, password, role, name, qr_code) VALUES (?, ?, ?, 'participant', ?, ?)`)
    .run(guestId, guestEmail, hash, name.trim(), qr);

  // Auto-join the event
  const challenges = db.prepare('SELECT * FROM challenges WHERE event_id = ?').all(event.id);
  const shuffled = challenges.sort(() => Math.random() - 0.5).slice(0, 25);
  const bingoCard = JSON.stringify(shuffled.map(c => c.id));
  const epId = uuidv4();
  db.prepare(`INSERT INTO event_participants (id, event_id, user_id, bingo_card, completed_challenges) VALUES (?, ?, ?, ?, '[]')`)
    .run(epId, event.id, guestId, bingoCard);

  const token = jwt.sign({ id: guestId, email: guestEmail, role: 'participant' }, JWT_SECRET, { expiresIn: '30d' });
  const participant = db.prepare('SELECT * FROM event_participants WHERE id = ?').get(epId);
  const user = db.prepare('SELECT id, name, role, points, qr_code FROM users WHERE id = ?').get(guestId);

  res.json({ token, user, event, participant });
});

module.exports = router;
