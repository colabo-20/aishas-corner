# Aisha's Corner 🥀

A Windows 98-themed personal website with a dark burgundy aesthetic.

**Features:**
- Win98 window chrome, taskbar, desktop icons
- Drag & drop music player (HTML5 Audio)
- Guestbook with Supabase database (optional, localStorage fallback)
- Personality stats, interests, update log
- Fully responsive

## Setup

### 1. Deploy to GitHub Pages
This site is a static HTML/CSS/JS site — no build step needed.

1. Create a repo on GitHub (e.g. `aishas-corner`)
2. Push this code to the `main` branch
3. Go to **Settings → Pages → Source → Deploy from a branch → main / root**
4. Your site will be live at `https://<username>.github.io/<repo-name>/`

### 2. Supabase Guestbook (optional)
1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** and run:
```sql
CREATE TABLE guestbook (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE guestbook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON guestbook FOR SELECT USING (true);
CREATE POLICY "public insert" ON guestbook FOR INSERT WITH CHECK (true);
```
4. Go to **Settings → API** and copy your **Project URL** and **anon/public key**
5. Paste them in `script.js` under `CONFIG.SUPABASE_URL` and `CONFIG.SUPABASE_KEY`

Without Supabase, the guestbook falls back to localStorage (works but not shared across browsers).
