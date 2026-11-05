# Closet Swap

**Good style is meant to be shared.** Borrow more. Buy less. Share your style.

Closet Swap is a wardrobe-sharing app for friends. Browse each other's closets, request pieces for a date, lend your favorites, and always know who has what.

**[Open the live app →](https://avasimoneaa.github.io/closet-swap/)**

![Closet Swap on desktop and phone: the My Closet grid and the Add a Piece screen with AI auto-fill](docs/screenshots/hero.jpg)

## Why I built it

I'm the friend everyone borrows clothes from. That meant a lot of "do you still have that dress?" texts, photos sent back and forth to show what I own, and pieces I'd forget I'd lent out. Closet Swap puts every closet in one place: you can see what your friends own, ask to borrow something for a specific night, and track who has what and for how long.

## How I built it

I came up with the concept, directed the design and product decisions, and built it with Claude as my AI coding partner, going from the first idea to a working app with a backend.

- **Design.** I wanted it to feel like a fashion brand, not a spreadsheet. It mixes Pinterest-style browsing, Depop's community feel and Vogue's editorial type: Bodoni Moda headlines over Jost body text, white and violet, with lots of whitespace. I reviewed it on desktop and phone and kept cutting labels until each piece shows only what matters: a name, a description, a color and a size.
- **Real content.** The closet uses my own wardrobe. Each photo is cropped to the garment so the focus stays on the clothes.
- **AI auto-fill.** Adding a piece should take seconds. You upload a photo, drag and zoom to frame it, and tap Auto-fill. Claude looks at the photo and writes the name, category, color and a one-line description, and you can edit anything before saving. It only runs when you ask, so the form never fills itself in unexpectedly.
- **Frontend.** One HTML file with plain JavaScript and CSS and no framework. It has a masonry grid, filters for size, color, print and metallic, a wishlist, a drag-to-crop photo tool and a profile that remembers your sizes.
- **Backend.** A small Node.js server with a built-in SQLite database, photo uploads and an API that calls Claude for labeling. It needs no npm packages, so it runs anywhere Node 22 does.
- **Two ways to run.** With the server, everything saves to the database. Without it, as on GitHub Pages, the app switches to a demo mode that saves in your browser.

### What I'd build next

- Sign-in, so each friend has their own closet instead of sample ones
- Notifications when a friend asks to borrow something or a piece comes home
- Outfit suggestions that mix pieces from your closet and your friends' closets

## Screenshots

| Home | Friends' closets |
| --- | --- |
| ![Home page with the welcome headline and your closet](docs/screenshots/home.jpg) | ![Friends' closets with filters for friend, category, size and color](docs/screenshots/friends-closets.jpg) |
| **Swaps** | **Piece detail** |
| ![Swaps page showing what you're borrowing and lending](docs/screenshots/swaps.jpg) | ![Detail view of a piece with its description, color and size](docs/screenshots/piece-detail.jpg) |

![Closet Swap on phones: My Closet, Add a Piece and Friends' Closets](docs/screenshots/mobile.jpg)

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

## Good to know

- **No sign-in yet.** The server is one shared closet with no login, so only run it for yourself or people you trust.
- **Sample friends.** The friends' closets are illustrated samples until friends can sign up and add their own pieces.

## License

The code is released under the [MIT License](LICENSE). The photos in `public/img/` are personal and not included in that license; all rights reserved.
