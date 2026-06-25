const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'connectquest.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'participant',
      name TEXT,
      company TEXT,
      job_role TEXT,
      skills TEXT,
      interests TEXT,
      avatar TEXT,
      bio TEXT,
      linkedin TEXT,
      twitter TEXT,
      qr_code TEXT,
      points INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      last_active TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      organizer_id TEXT NOT NULL,
      event_type TEXT DEFAULT 'conference',
      start_date TEXT,
      end_date TEXT,
      location TEXT,
      max_participants INTEGER DEFAULT 1000,
      status TEXT DEFAULT 'draft',
      join_code TEXT UNIQUE,
      qr_code TEXT,
      theme_color TEXT DEFAULT '#6366f1',
      banner_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS event_participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at TEXT DEFAULT (datetime('now')),
      bingo_card TEXT,
      completed_challenges TEXT DEFAULT '[]',
      points INTEGER DEFAULT 0,
      rank INTEGER,
      UNIQUE(event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      challenge_type TEXT DEFAULT 'networking',
      points INTEGER DEFAULT 10,
      icon TEXT DEFAULT '🤝',
      requires_scan INTEGER DEFAULT 0,
      is_sponsor INTEGER DEFAULT 0,
      sponsor_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      challenge_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(event_id, user1_id, user2_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user1_id) REFERENCES users(id),
      FOREIGN KEY (user2_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      condition_type TEXT,
      condition_value INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      event_id TEXT,
      earned_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (badge_id) REFERENCES badges(id)
    );

    CREATE TABLE IF NOT EXISTS challenge_completions (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      verified_by TEXT,
      completed_at TEXT DEFAULT (datetime('now')),
      UNIQUE(event_id, user_id, challenge_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (challenge_id) REFERENCES challenges(id)
    );
  `);

  // Seed default badges
  const badgeCount = db.prepare('SELECT COUNT(*) as count FROM badges').get();
  if (badgeCount.count === 0) {
    const insertBadge = db.prepare(`INSERT INTO badges (id, name, description, icon, condition_type, condition_value) VALUES (?, ?, ?, ?, ?, ?)`);
    [
      ['b1', 'First Connection', 'Made your first connection', '🤝', 'connections', 1],
      ['b2', 'Social Butterfly', 'Connected with 10 people', '🦋', 'connections', 10],
      ['b3', 'Networker Pro', 'Connected with 25 people', '⭐', 'connections', 25],
      ['b4', 'Bingo!', 'Completed a full bingo row', '🎯', 'bingo_row', 1],
      ['b5', 'Challenge Master', 'Completed 10 challenges', '🏆', 'challenges', 10],
      ['b6', 'Point Collector', 'Earned 100 points', '💎', 'points', 100],
    ].forEach(b => insertBadge.run(...b));
  }

  // Seed admin user
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (id, email, password, role, name) VALUES (?, ?, ?, ?, ?)`).run(
      uuidv4(), 'admin@connectquest.io', hash, 'admin', 'Platform Admin'
    );
  }

  console.log('Database initialized');
}

module.exports = { db, initializeDatabase };
