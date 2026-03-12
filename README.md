# Zii Track

A local-first time tracking app with a modern glass morphism UI — built as a free alternative to Toggl Track.

Track your time, manage clients & projects, and export professional PDF reports to share with clients.

---

## Features

- **Live timer** — start/stop with one click, assign project & client on the fly
- **Manual entries** — add or edit time entries at any time
- **Projects & Clients** — organize work with color-coded projects linked to clients
- **Reports** — filter by date range, project, or client
- **PDF Export** — professional white-background report grouped by day with totals (ready to send to clients)
- **Local database** — all data stored on your machine in a SQLite file, no cloud, no account

---

## Requirements

- **Node.js** (v18 or later) — [Download at nodejs.org](https://nodejs.org) → choose **LTS**

To verify Node is installed, open Terminal and run:
```bash
node --version
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/host-jbarte/zii-track.git
cd zii-track
```

### 2. Install dependencies

```bash
npm install
```

> This only needs to be done once. Takes about 1–2 minutes.

### 3. Start the app

```bash
npm run dev
```

You'll see output like:
```
[vite]  ➜  Local:   http://localhost:5173/
[api]   ▲ Zii Track API  →  http://localhost:3001
```

### 4. Open in browser

Go to **http://localhost:5173**

---

## How to Use

### Starting the Timer

1. Click the input bar at the top — type what you're working on
2. Optionally select a **Project** and **Client** from the dropdowns
3. Press **Start** (or hit `Enter`)
4. Press **Stop** when you're done

### Adding a Manual Entry

- Click the **+ button** (top right of the timer bar) or the **+ Add Manual** button on the Timer page
- Fill in description, project, client, start time, and end time

### Editing an Entry

- **Click anywhere on an entry row** to open the edit form
- Or hover over a row and click the **pencil icon**

### Managing Projects

1. Go to **Projects** in the sidebar
2. Click **+ New Project**
3. Enter a name, optionally link to a client, pick a color
4. Click **Create Project**

### Managing Clients

1. Go to **Clients** in the sidebar
2. Click **+ New Client**
3. Enter a name and pick a color
4. Click **Create Client**

### Generating a Report

1. Go to **Reports** in the sidebar
2. Use the quick presets (This week, This month, Last month) or set a custom date range
3. Filter by project or client if needed
4. The summary cards and table update automatically

### Exporting to PDF

1. On the **Reports** page, set your filters
2. Click **Export PDF**
3. A PDF file downloads automatically — ready to send to your client

The PDF includes:
- Header with date range and generation timestamp
- Summary boxes (total time, entries, top project, top client)
- Entries table grouped by day with daily totals
- Project time breakdown at the bottom

---

## Stopping the App

Press `Ctrl + C` in the Terminal where `npm run dev` is running.

Your data is saved automatically — nothing is lost when you stop.

## Restarting

```bash
cd zii-track
npm run dev
```

---

## Where is my data stored?

All data lives in a local SQLite database at:

```
zii-track/data/zii-track.db
```

This file is excluded from git (`.gitignore`) so your time entries are never uploaded. To back it up, just copy that file.

---

## Troubleshooting

**`npm: command not found`**
→ Node.js is not installed. Download it from [nodejs.org](https://nodejs.org) and restart your terminal.

**Port already in use**
→ Another process is using port 5173 or 3001. Stop it or restart your machine, then run `npm run dev` again.

**App loads but shows no data**
→ Make sure both the `[vite]` and `[api]` lines appear in the terminal after running `npm run dev`. The API server must be running for data to load.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS (glass morphism) |
| Backend | Hono (Node.js) |
| Database | SQLite via better-sqlite3 |
| PDF Export | jsPDF + jspdf-autotable |
