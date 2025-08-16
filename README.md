# Collaborative Editor — Starter

This repository is a starter template for a real-time collaborative document editor.
It includes a simple backend (Node.js + Express + Socket.IO + MongoDB) and a React frontend (Vite + Quill).

## Features included in this starter
- Real-time delta sync (Quill -> Socket.IO -> save in MongoDB)
- Presence notifications
- Cursor update events (basic)
- Document REST endpoints (create, fetch)
- Developer-friendly file structure and instructions

## What this starter does NOT (yet) include
- Production-ready OT/CRDT algorithm (this starter uses Quill deltas and append-only ops)
- Full authentication & RBAC (stubbed in)
- Offline-first advanced reconciliation
- Export (PDF/DOCX), comments, threaded discussions (these can be built on top)

## Setup

Requirements:
- Node.js 18+
- MongoDB running (local or Atlas)

1. Backend
```
cd backend
cp .env.example .env
# edit .env if needed to set MONGO_URI
npm install
npm run dev
```

2. Frontend
```
cd frontend
npm install
npm run dev
# open http://localhost:3000
```

The backend listens on port 4000 by default. The frontend expects the backend at http://localhost:4000 but you can set environment variable VITE_SERVER_URL.

## Next steps to advance this starter
- Replace delta-append with a CRDT (Yjs or Automerge) or server-side OT engine for robust conflict handling.
- Add authentication (JWT + OAuth providers).
- Implement revision history and snapshots in the backend.
- Add comments, mentions, change-tracking and export features.
- Add offline caching and PWA support.
- Add tests and CI pipeline.

## License
MIT
