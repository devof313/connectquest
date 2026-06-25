const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { db } = require('../database');
const { auth, requireRole } = require('../middleware/auth');

const DEFAULT_CHALLENGES = [
  { title: 'Say Hello', description: 'Introduce yourself to someone new', icon: '👋', points: 10, challenge_type: 'networking' },
  { title: 'Find a Developer', description: 'Connect with a software developer', icon: '💻', points: 15, challenge_type: 'networking', requires_scan: 1 },
  { title: 'Find a Designer', description: 'Connect with a UX/UI designer', icon: '🎨', points: 15, challenge_type: 'networking', requires_scan: 1 },
  { title: 'Elevator Pitch', description: 'Give your 30-second pitch to 3 people', icon: '🎤', points: 20, challenge_type: 'personal' },
  { title: 'Business Card Exchange', description: 'Exchange contact info with 5 people', icon: '📇', points: 25, challenge_type: 'networking' },
  { title: 'Find a Mentor', description: 'Connect with someone 5+ years senior', icon: '🧠', points: 20, challenge_type: 'networking', requires_scan: 1 },
  { title: 'Team Up', description: 'Find someone with complementary skills', icon: '🤝', points: 20, challenge_type: 'teambuilding', requires_scan: 1 },
  { title: 'Industry Insider', description: 'Talk to someone from a different industry', icon: '🌐', points: 15, challenge_type: 'networking', requires_scan: 1 },
  { title: 'Selfie Squad', description: 'Take a group selfie with 3 new people', icon: '📸', points: 15, challenge_type: 'fun' },
  { title: 'LinkedIn Connect', description: 'Connect on LinkedIn with someone here', icon: '🔗', points: 10, challenge_type: 'networking' },
  { title: 'Coffee Chat', description: 'Schedule a coffee meeting with someone', icon: '☕', points: 25, challenge_type: 'networking' },
  { title: 'Startup Founder', description: 'Meet someone building their own company', icon: '🚀', points: 20, challenge_type: 'networking', requires_scan: 1 },
  { title: 'Keynote Discussion', description: 'Discuss the keynote with 2 people', icon: '💡', points: 15, challenge_type: 'learning' },
  { title: 'Remote Worker', description: 'Connect with someone who works remotely', icon: '🏠', points: 15, challenge_type: 'networking', requires_scan: 1 },
  { title: 'First Timer', description: 'Meet someone attending this event for the first time', icon: '🌟', points: 15, challenge_type: 'networking' },
  { title: 'Speaker Meet', description: 'Introduce yourself to a speaker', icon: '🎙️', points: 30, challenge_type: 'networking' },
  { title: 'Cross-Company Connect', description: 'Connect with someone from a Fortune 500', icon: '🏢', points: 20, challenge_type: 'networking', requires_scan: 1 },
  { title: 'Problem Solver', description: 'Discuss a challenge your company faces', icon: '🧩', points: 20, challenge_type: 'learning' },
  { title: 'Skill Share', description: 'Teach someone something in 2 minutes', icon: '📚', points: 20, challenge_type: 'learning' },
  { title: 'International Connect', description: 'Meet someone from another country', icon: '🌍', points: 25, challenge_type: 'networking', requires_scan: 1 },
  { title: 'Volunteer Helper', description: 'Help an event volunteer with something', icon: '🙌', points: 15, challenge_type: 'fun' },
  { title: 'Workshop Join', description: 'Attend a workshop or breakout session', icon: '🎓', points: 20, challenge_type: 'learning' },
  { title: 'Feedback Giver', description: 'Give constructive feedback to a presenter', icon: '✍️', points: 20, challenge_type: 'learning' },
  { title: 'Table Captain', description: 'Facilitate a conversation at a table of 5+', icon: '🪑', points: 25, challenge_type: 'teambuilding' },
  { title: 'BINGO CENTER', description: 'Special: Connect with the event organizer!', icon: '⭐', points: 50, challenge_type: 'special', requires_scan: 1 },
];

// Public: get event info by join code (no auth needed for guest join page)
router.get('/info/:code', (req, res) => {
  const event = db.prepare("SELECT id, name, description, event_type, location, theme_color, join_code FROM events WHERE join_code = ? AND status = 'active'").get(req.params.code.toUpperCase());
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// Create event
router.post('/', auth, requireRole('organizer', 'admin'), async (req, res) => {
  const { name, description, event_type, start_date, end_date, location, max_participants, theme_color } = req.body;
  const id = uuidv4();
  const join_code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const qr = await QRCode.toDataURL(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${join_code}`);

  db.prepare(`INSERT INTO events (id, name, description, organizer_id, event_type, start_date, end_date, location, max_participants, join_code, qr_code, theme_color, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`).run(id, name, description, req.user.id, event_type || 'conference', start_date, end_date, location, max_participants || 1000, join_code, qr, theme_color || '#6366f1');

  // Add default challenges
  const insertChallenge = db.prepare(`INSERT INTO challenges (id, event_id, title, description, icon, points, challenge_type, requires_scan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  DEFAULT_CHALLENGES.forEach(c => {
    insertChallenge.run(uuidv4(), id, c.title, c.description, c.icon, c.points, c.challenge_type, c.requires_scan || 0);
  });

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  res.json(event);
});

// List events (organizer sees their own, admin sees all, participants see active)
router.get('/', auth, (req, res) => {
  let events;
  if (req.user.role === 'admin') {
    events = db.prepare('SELECT e.*, u.name as organizer_name, (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count FROM events e LEFT JOIN users u ON e.organizer_id = u.id ORDER BY e.created_at DESC').all();
  } else if (req.user.role === 'organizer') {
    events = db.prepare('SELECT e.*, (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count FROM events e WHERE e.organizer_id = ? ORDER BY e.created_at DESC').all(req.user.id);
  } else {
    events = db.prepare('SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.status = ? ORDER BY e.created_at DESC').all('active');
  }
  res.json(events);
});

// Get single event
router.get('/:id', auth, (req, res) => {
  const event = db.prepare('SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// Join event by code
router.post('/join/:code', auth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE join_code = ? AND status = ?').get(req.params.code.toUpperCase(), 'active');
  if (!event) return res.status(404).json({ error: 'Event not found or not active' });

  const alreadyJoined = db.prepare('SELECT id FROM event_participants WHERE event_id = ? AND user_id = ?').get(event.id, req.user.id);
  if (alreadyJoined) {
    const ep = db.prepare('SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?').get(event.id, req.user.id);
    return res.json({ event, participant: ep, alreadyJoined: true });
  }

  const challenges = db.prepare('SELECT * FROM challenges WHERE event_id = ?').all(event.id);
  // Build 5x5 bingo card (25 challenges)
  const shuffled = challenges.sort(() => Math.random() - 0.5).slice(0, 25);
  const bingoCard = shuffled.map(c => c.id);

  const epId = uuidv4();
  db.prepare(`INSERT INTO event_participants (id, event_id, user_id, bingo_card, completed_challenges) VALUES (?, ?, ?, ?, '[]')`).run(epId, event.id, req.user.id, JSON.stringify(bingoCard));

  const ep = db.prepare('SELECT * FROM event_participants WHERE id = ?').get(epId);
  res.json({ event, participant: ep });
});

// Get event challenges
router.get('/:id/challenges', auth, (req, res) => {
  const challenges = db.prepare('SELECT * FROM challenges WHERE event_id = ?').all(req.params.id);
  res.json(challenges);
});

// Get event leaderboard
router.get('/:id/leaderboard', auth, (req, res) => {
  const leaders = db.prepare(`
    SELECT ep.*, u.name, u.company, u.job_role, u.avatar,
      (SELECT COUNT(*) FROM connections c WHERE c.event_id = ep.event_id AND (c.user1_id = ep.user_id OR c.user2_id = ep.user_id)) as connection_count,
      json_array_length(ep.completed_challenges) as challenge_count
    FROM event_participants ep
    JOIN users u ON ep.user_id = u.id
    WHERE ep.event_id = ?
    ORDER BY ep.points DESC
    LIMIT 50
  `).all(req.params.id);
  res.json(leaders);
});

// Get my participation in event
router.get('/:id/me', auth, (req, res) => {
  const ep = db.prepare('SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!ep) return res.status(404).json({ error: 'Not joined' });
  res.json(ep);
});

// Complete challenge (scan QR or self-report)
router.post('/:id/complete/:challengeId', auth, (req, res) => {
  const { verified_by } = req.body;
  const ep = db.prepare('SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!ep) return res.status(400).json({ error: 'Not joined' });

  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ? AND event_id = ?').get(req.params.challengeId, req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  const alreadyDone = db.prepare('SELECT id FROM challenge_completions WHERE event_id = ? AND user_id = ? AND challenge_id = ?').get(req.params.id, req.user.id, req.params.challengeId);
  if (alreadyDone) return res.status(409).json({ error: 'Already completed' });

  const completionId = uuidv4();
  db.prepare(`INSERT INTO challenge_completions (id, event_id, user_id, challenge_id, verified_by) VALUES (?, ?, ?, ?, ?)`).run(completionId, req.params.id, req.user.id, req.params.challengeId, verified_by || null);

  const completed = JSON.parse(ep.completed_challenges || '[]');
  completed.push(req.params.challengeId);
  const newPoints = (ep.points || 0) + challenge.points;

  db.prepare('UPDATE event_participants SET completed_challenges = ?, points = ? WHERE id = ?').run(JSON.stringify(completed), newPoints, ep.id);
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(challenge.points, req.user.id);

  // Record connection if verified_by exists
  if (verified_by) {
    try {
      db.prepare(`INSERT OR IGNORE INTO connections (id, event_id, user1_id, user2_id, challenge_id) VALUES (?, ?, ?, ?, ?)`).run(uuidv4(), req.params.id, req.user.id, verified_by, req.params.challengeId);
    } catch {}
  }

  const updatedEp = db.prepare('SELECT * FROM event_participants WHERE id = ?').get(ep.id);
  res.json({ participant: updatedEp, pointsEarned: challenge.points });
});

// Get event connections (participants list)
router.get('/:id/participants', auth, (req, res) => {
  const participants = db.prepare(`
    SELECT u.id, u.name, u.company, u.job_role, u.skills, u.interests, u.avatar, u.bio, u.qr_code, ep.points, ep.joined_at,
      (SELECT COUNT(*) FROM connections c WHERE c.event_id = ? AND (c.user1_id = u.id OR c.user2_id = u.id)) as connections
    FROM event_participants ep
    JOIN users u ON ep.user_id = u.id
    WHERE ep.event_id = ?
    ORDER BY ep.points DESC
  `).all(req.params.id, req.params.id);
  res.json(participants);
});

// Organizer analytics
router.get('/:id/analytics', auth, requireRole('organizer', 'admin'), (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ? AND organizer_id = ?').get(req.params.id, req.user.id) ||
    (req.user.role === 'admin' ? db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) : null);
  if (!event) return res.status(403).json({ error: 'Forbidden' });

  const totalParticipants = db.prepare('SELECT COUNT(*) as count FROM event_participants WHERE event_id = ?').get(req.params.id).count;
  const totalConnections = db.prepare('SELECT COUNT(*) as count FROM connections WHERE event_id = ?').get(req.params.id).count;
  const totalCompletions = db.prepare('SELECT COUNT(*) as count FROM challenge_completions WHERE event_id = ?').get(req.params.id).count;
  const topParticipants = db.prepare(`SELECT u.name, u.company, ep.points FROM event_participants ep JOIN users u ON ep.user_id = u.id WHERE ep.event_id = ? ORDER BY ep.points DESC LIMIT 5`).all(req.params.id);
  const challengeStats = db.prepare(`SELECT c.title, c.icon, COUNT(cc.id) as completions FROM challenges c LEFT JOIN challenge_completions cc ON c.id = cc.challenge_id WHERE c.event_id = ? GROUP BY c.id ORDER BY completions DESC`).all(req.params.id);

  res.json({ totalParticipants, totalConnections, totalCompletions, topParticipants, challengeStats });
});

// Add custom challenge
router.post('/:id/challenges', auth, requireRole('organizer', 'admin'), (req, res) => {
  const { title, description, icon, points, challenge_type, requires_scan, is_sponsor, sponsor_name } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO challenges (id, event_id, title, description, icon, points, challenge_type, requires_scan, is_sponsor, sponsor_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, req.params.id, title, description, icon || '🎯', points || 10, challenge_type || 'networking', requires_scan || 0, is_sponsor || 0, sponsor_name);
  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(id);
  res.json(challenge);
});

// Update event
router.put('/:id', auth, requireRole('organizer', 'admin'), (req, res) => {
  const { name, description, status, theme_color, location, start_date, end_date } = req.body;
  db.prepare('UPDATE events SET name=?, description=?, status=?, theme_color=?, location=?, start_date=?, end_date=? WHERE id=?').run(name, description, status, theme_color, location, start_date, end_date, req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  res.json(event);
});

// Edit challenge
router.put('/:id/challenges/:challengeId', auth, requireRole('organizer', 'admin'), (req, res) => {
  const { title, description, icon, points, challenge_type, requires_scan } = req.body;
  db.prepare('UPDATE challenges SET title=?, description=?, icon=?, points=?, challenge_type=?, requires_scan=? WHERE id=? AND event_id=?')
    .run(title, description, icon, points, challenge_type, requires_scan ? 1 : 0, req.params.challengeId, req.params.id);
  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.challengeId);
  res.json(challenge);
});

// Delete challenge
router.delete('/:id/challenges/:challengeId', auth, requireRole('organizer', 'admin'), (req, res) => {
  db.prepare('DELETE FROM challenges WHERE id = ? AND event_id = ?').run(req.params.challengeId, req.params.id);
  res.json({ success: true });
});

// My connections in event
router.get('/:id/my-connections', auth, (req, res) => {
  const connections = db.prepare(`
    SELECT u.id, u.name, u.company, u.job_role, u.avatar, u.linkedin, u.twitter, c.created_at
    FROM connections c
    JOIN users u ON (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END) = u.id
    WHERE c.event_id = ? AND (c.user1_id = ? OR c.user2_id = ?)
  `).all(req.user.id, req.params.id, req.user.id, req.user.id);
  res.json(connections);
});

module.exports = router;
