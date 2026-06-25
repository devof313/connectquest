# ConnectQuest 🎯

Gamified networking platform for events, conferences, and hackathons.

## Quick Start

### Backend
```bash
cd backend
npm install
node server.js        # runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev           # runs on http://localhost:5173
```

## Demo Accounts
| Email | Password | Role |
|-------|----------|------|
| admin@connectquest.io | admin123 | Admin |

Register new accounts at `/register` — choose Participant or Organizer.

## How It Works

1. **Organizer** creates an event → gets a join QR code + 6-character code
2. **Participants** scan QR or go to `/join/CODE` → get a 5×5 bingo card
3. Complete networking challenges by meeting people → earn points
4. Scan other attendees' QR codes to validate scan-required challenges
5. Track progress on the leaderboard in real time

## Architecture

```
connectquest/
├── backend/           Node.js + Express + SQLite (better-sqlite3)
│   ├── src/
│   │   ├── database.js        Schema + seed data
│   │   ├── middleware/auth.js  JWT auth middleware
│   │   └── routes/
│   │       ├── auth.js        Login / register / me
│   │       ├── users.js       Profile, admin user mgmt
│   │       └── events.js      Events, challenges, bingo, leaderboard
│   └── server.js              Express + Socket.IO server
│
└── frontend/          React + Vite + Tailwind CSS
    └── src/
        ├── pages/
        │   ├── Login.jsx / Register.jsx
        │   ├── Dashboard.jsx        Home + quick join
        │   ├── Events.jsx           Event browser
        │   ├── EventDetail.jsx      Event hub (join, navigate)
        │   ├── BingoCard.jsx        5×5 interactive bingo grid
        │   ├── Leaderboard.jsx      Live rankings + podium
        │   ├── Connections.jsx      People you've met
        │   ├── Profile.jsx          Edit profile + personal QR
        │   ├── CreateEvent.jsx      Organizer: new event form
        │   ├── OrganizerDashboard.jsx  Analytics, challenges, participants
        │   ├── AdminDashboard.jsx   User + event management
        │   └── JoinEvent.jsx        QR code landing page
        ├── components/Layout.jsx    Sidebar + bottom nav
        ├── store/authStore.js       Zustand auth + dark mode
        └── utils/api.js             Axios instance
```

## API Endpoints

### Auth
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — get JWT token
- `GET  /api/auth/me` — get current user

### Events
- `POST /api/events` — create event (organizer)
- `GET  /api/events` — list events
- `GET  /api/events/:id` — event detail
- `POST /api/events/join/:code` — join by 6-char code
- `GET  /api/events/:id/challenges` — list challenges
- `POST /api/events/:id/complete/:challengeId` — complete challenge
- `GET  /api/events/:id/leaderboard` — rankings
- `GET  /api/events/:id/participants` — attendee list
- `GET  /api/events/:id/my-connections` — your connections
- `GET  /api/events/:id/analytics` — organizer analytics
- `POST /api/events/:id/challenges` — add custom challenge

### Users
- `PUT  /api/users/profile` — update profile
- `GET  /api/users/:id` — public profile
- `GET  /api/users` — admin: list all users
- `PUT  /api/users/:id/role` — admin: change role

## Default Bingo Challenges (25)

Every event gets 25 challenges auto-generated, covering:
- Networking (connect with developers, designers, founders)
- Personal (elevator pitch, skill sharing)
- Team-building (table captain, group activities)
- Learning (workshop attendance, keynote discussions)
- Fun (selfie squad, volunteer helper)

The center cell (position 13) is a FREE SPACE worth 50 points.

## Deployment

### Environment Variables (backend)
```
PORT=3001
JWT_SECRET=your-secret-here
FRONTEND_URL=https://your-domain.com
```

For production, swap SQLite for PostgreSQL by replacing `better-sqlite3` calls with `pg` queries — the schema is identical.
