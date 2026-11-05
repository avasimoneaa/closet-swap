# Closet Swap

**Good style is meant to be shared.** Borrow more. Buy less. Share your style.

Closet Swap is a wardrobe-sharing app for friends. Browse each other's digital closets, request pieces for a date, lend your favorites, and always know who has what.

## What's in it

- **Home** – pinned welcome with your closet scrolling over it, plus a summary of your closet, what you're borrowing and lending, and requests waiting on you
- **Friends' Closets** – a Pinterest-style grid you can filter by friend, category, size and color (including Print and Metallic), sorted by most recent or most popular
- **My Closet** – your pieces, who has anything that's lent out and since when, and editing for name, description, color, size and category
- **Add a piece** – upload a photo, drag and zoom to crop, and optionally auto-fill the details with AI
- **Swaps** – approve or decline requests, track what's out and how long it's been gone
- **Wishlist** – heart pieces from friends' closets to save them
- **Profile** – your height and sizes for tops, dresses, bottoms, jeans and shoes

## Running it

It's a single `index.html` with the photos in `img/`. Open the file in a browser, or turn on GitHub Pages (Settings → Pages → Deploy from branch → `main`).

Outside of Claude, AI auto-fill and saving aren't connected yet. The app still opens and works, but new pieces and swaps reset on refresh. Hooking up a database (like Supabase or Firebase) and an AI API through a small server would make those work anywhere.

## Built with

Plain HTML, CSS and JavaScript. Fonts: Bodoni Moda and Jost from Google Fonts.
