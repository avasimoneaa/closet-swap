# Closet Swap

**Good style is meant to be shared.** Borrow more. Buy less. Share your style.

Closet Swap is a wardrobe-sharing app for friends. Browse each other's closets, request pieces for a date, lend your favorites, and always know who has what.

## Features

- **Home** with a pinned welcome, your closet scrolling over it, and a summary of what you're borrowing, lending and being asked for
- **Friends' Closets** in a Pinterest-style grid, filtered by friend, category, size and color (including Print and Metallic), sorted by most recent or most popular
- **My Closet** with who has anything that's lent out and since when, plus editing for name, description, color, size and category
- **Add a piece**: upload a photo, drag and zoom to crop it, and optionally auto-fill the details with AI
- **Swaps** to approve or decline requests and track what's out
- **Wishlist** for pieces you've hearted in friends' closets
- **Profile** with your height and sizes for tops, dresses, bottoms, jeans and shoes

## How it's built

```
closet-swap/
├── public/            Frontend (one HTML file: markup, styles and JavaScript)
│   ├── index.html
│   └── img/           Closet photos
├── server/            Backend (Node.js, no npm packages)
│   ├── server.js      Web server and JSON API
│   ├── db.js          SQLite database
│   ├── ai.js          AI auto-fill using the Claude API
│   └── env.js         Reads settings from .env
├── uploads/           Photos you add (created automatically, not committed)
├── data/              The database file (created automatically, not committed)
├── .env.example       Settings template
└── package.json
```

The backend uses only what comes with Node.js 22.5 or newer, including its built-in SQLite database, so there is nothing to install.

## Run it on your computer

1. Install [Node.js](https://nodejs.org) version 22.5 or newer.
2. In this folder, copy the settings template:
   ```
   cp .env.example .env
   ```
3. To turn on AI auto-fill, open `.env` and paste your key from [console.anthropic.com](https://console.anthropic.com) after `ANTHROPIC_API_KEY=`. You can skip this; everything else works without it.
4. Start the app:
   ```
   npm start
   ```
5. Open **http://localhost:3000**.

Pieces you add, swaps, your profile and your wishlist are saved in `data/closet.db`, and new photos go in `uploads/`. Use `npm run dev` to restart the server automatically when you edit a file.

## API

| Method | Route | What it does |
| --- | --- | --- |
| GET | `/api/health` | Checks the server is up and whether AI auto-fill is on |
| GET | `/api/state` | Everything saved, grouped by collection |
| PUT | `/api/:collection/:id` | Saves a record (`items`, `requests`, `exState`, `prefs`, `profile`, `wishlist`) |
| DELETE | `/api/:collection/:id` | Deletes a record |
| POST | `/api/upload` | Saves a photo (`{ "dataUrl": "data:image/jpeg;base64,…" }`) and returns its URL |
| POST | `/api/label` | Sends a photo to Claude and returns name, category, color and description |

## Demo mode (GitHub Pages)

If you open the frontend without the server, for example on GitHub Pages, it runs in demo mode. Everything works except AI auto-fill, and changes are saved in that browser only. To publish the demo, go to **Settings → Pages**, choose **Deploy from a branch**, pick **main**, and save.

## Putting it online for real

GitHub Pages can't run the server. To share the full app, deploy this folder to a host that runs Node.js, such as [Render](https://render.com) or [Railway](https://railway.app):

- Start command: `npm start`
- Environment variable: `ANTHROPIC_API_KEY`
- Add a persistent disk mounted at the project folder (or set `DB_FILE`) so the database and `uploads/` survive restarts.

## What's next

- **Accounts and sign-in.** Right now the server is a single shared closet with no login, so only run it for yourself or people you trust.
- **Real friends' closets.** The friends shown are sample closets until friends can sign up and add their own pieces.
