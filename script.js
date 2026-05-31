/* ============================================================
   AISHA'S CORNER — script.js
   Drag & Drop Music Player + Spotify + Supabase Guestbook
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   CONFIG — Fill these in after setting up Supabase & Spotify
────────────────────────────────────────────────────────────── */
const CONFIG = {
  // Supabase (free at supabase.com)
  // 1. Create project → get URL & anon key
  // 2. Create table "guestbook" with columns: id (int8, identity), name (text), message (text), created_at (timestamptz, default now())
  // 3. Enable RLS → add policy: allow SELECT and INSERT for anon role
  SUPABASE_URL:  '',  // e.g. 'https://xxxx.supabase.co'
  SUPABASE_KEY:  '',  // your anon/public key

  // Spotify (developer.spotify.com)
  // 1. Create app → get Client ID
  // 2. Set redirect URI to your GitHub Pages URL
  SPOTIFY_CLIENT_ID: '',  // e.g. 'abc123...'
};

/* ──────────────────────────────────────────────────────────────
   SUPABASE CLIENT
────────────────────────────────────────────────────────────── */
let sb = null;

function initSupabase() {
  if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY && typeof supabase !== 'undefined') {
    try {
      sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    } catch (e) {
      console.warn('Supabase init failed:', e);
      sb = null;
    }
  }
}

/* ──────────────────────────────────────────────────────────────
   VISITOR COUNTER (localStorage)
────────────────────────────────────────────────────────────── */
function getVisitorCount() {
  let count = parseInt(localStorage.getItem('aisha_visitors') || '0', 10);
  if (!sessionStorage.getItem('aisha_visited')) {
    count++;
    localStorage.setItem('aisha_visitors', String(count));
    sessionStorage.setItem('aisha_visited', '1');
  }
  return count;
}

/* ──────────────────────────────────────────────────────────────
   CLOCK
────────────────────────────────────────────────────────────── */
function updateClock() {
  const now = new Date();
  const el = document.getElementById('taskClock');
  if (el) el.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

/* ──────────────────────────────────────────────────────────────
   WELCOME DIALOG
────────────────────────────────────────────────────────────── */
function initWelcomeDialog(count) {
  const overlay = document.getElementById('welcomeDialog');
  const span = document.getElementById('dialogVisitor');
  const vc = document.getElementById('visitorCount');
  if (span) span.textContent = count.toLocaleString();
  if (vc) vc.textContent = count.toLocaleString();

  function close() { overlay?.classList.add('hidden'); }
  document.getElementById('welcomeCloseX')?.addEventListener('click', close);
  document.getElementById('welcomeCloseOk')?.addEventListener('click', close);
  overlay?.addEventListener('click', e => { if (e.target === overlay) close(); });
}

/* ──────────────────────────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────────────────────────── */
function initScrollNav() {
  document.querySelectorAll('[data-scroll]').forEach(el => {
    el.addEventListener('click', () => {
      const t = document.querySelector(el.dataset.scroll);
      t?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initScrollSpy() {
  const ids = ['home','about','diary','interests','music','stats','guestbook','currently'];
  const items = document.querySelectorAll('.nav-tree li[data-scroll]');
  function update() {
    let cur = '#home';
    ids.forEach(id => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= 120) cur = '#' + id; });
    items.forEach(li => li.classList.toggle('active', li.dataset.scroll === cur));
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ──────────────────────────────────────────────────────────────
   QUOTES
────────────────────────────────────────────────────────────── */
const QUOTES = [
  '"less is more, except for outfits." 🥀',
  '"dark aesthetic, warm soul."',
  '"if the vibe is off, so am i."',
  '"curated chaos." 🖤',
  '"dress like nobody\'s watching."',
  '"roses are prettier in the dark."',
];

function initQuotes() {
  const el = document.getElementById('quoteBox');
  if (!el) return;
  let idx = 0;
  function next() {
    el.style.opacity = '0';
    setTimeout(() => { idx = (idx + 1) % QUOTES.length; el.textContent = QUOTES[idx]; el.style.opacity = '1'; }, 350);
  }
  setTimeout(() => { next(); setInterval(next, 5000); }, 5000);
}

/* ──────────────────────────────────────────────────────────────
   GUESTBOOK — Supabase with localStorage fallback
────────────────────────────────────────────────────────────── */
function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderEntries(entries) {
  const container = document.getElementById('gbEntries');
  const status = document.getElementById('gbStatus');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = '<div class="gb-empty">no messages yet. be the first.</div>';
    if (status) status.textContent = '0 messages';
    return;
  }

  container.innerHTML = entries.map(e => {
    const d = e.created_at ? new Date(e.created_at) : new Date();
    const ds = d.getDate().toString().padStart(2,'0') + '.' + (d.getMonth()+1).toString().padStart(2,'0') + '.' + d.getFullYear().toString().slice(-2);
    return `<div class="gb-entry">
      <div class="gb-header"><span class="gb-name">${esc(e.name)}</span><span class="gb-date">${ds}</span></div>
      <div class="gb-msg">${esc(e.message)}</div>
    </div>`;
  }).join('');

  if (status) status.textContent = entries.length + ' message' + (entries.length !== 1 ? 's' : '');
}

async function loadGuestbook() {
  if (sb) {
    try {
      const { data, error } = await sb.from('guestbook').select('*').order('created_at', { ascending: false }).limit(50);
      if (!error && data) { renderEntries(data); return; }
    } catch (e) { console.warn('Supabase load failed:', e); }
  }
  // fallback to localStorage
  const stored = JSON.parse(localStorage.getItem('aisha_gb') || '[]');
  renderEntries(stored);
}

async function submitGuestbook(name, message) {
  if (sb) {
    try {
      const { error } = await sb.from('guestbook').insert({ name, message });
      if (!error) { await loadGuestbook(); return true; }
    } catch (e) { console.warn('Supabase insert failed:', e); }
  }
  // fallback
  const stored = JSON.parse(localStorage.getItem('aisha_gb') || '[]');
  stored.unshift({ name, message, created_at: new Date().toISOString() });
  localStorage.setItem('aisha_gb', JSON.stringify(stored));
  renderEntries(stored);
  return true;
}

function initGuestbook() {
  loadGuestbook();
  document.getElementById('gbSubmit')?.addEventListener('click', async () => {
    const nameEl = document.getElementById('gbName');
    const msgEl = document.getElementById('gbMsg');
    const name = nameEl?.value.trim();
    const msg = msgEl?.value.trim();
    if (!name || !msg) return;
    await submitGuestbook(name, msg);
    if (nameEl) nameEl.value = '';
    if (msgEl) msgEl.value = '';
    const box = document.getElementById('gbEntries');
    if (box) box.scrollTop = 0;
  });
}

/* ──────────────────────────────────────────────────────────────
   MUSIC PLAYER — Drag & Drop with HTML5 Audio
────────────────────────────────────────────────────────────── */
const audio = new Audio();
let playlist = [];    // { name, url, duration }
let currentIdx = -1;
let isPlaying = false;
let animFrame = null;

function fmtTime(s) {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + sec.toString().padStart(2, '0');
}

function updatePlayerUI() {
  const track = playlist[currentIdx];
  const pTrack = document.getElementById('pTrack');
  const pArtist = document.getElementById('pArtist');
  const pTotal = document.getElementById('pTotal');
  const miniName = document.getElementById('miniTrackName');
  const miniArtist = document.getElementById('miniTrackArtist');

  if (track) {
    if (pTrack) pTrack.textContent = track.name;
    if (pArtist) pArtist.textContent = 'local file';
    if (pTotal) pTotal.textContent = fmtTime(audio.duration || 0);
    if (miniName) miniName.textContent = track.name;
    if (miniArtist) miniArtist.textContent = 'local file';
  } else {
    if (pTrack) pTrack.textContent = 'no track selected';
    if (pArtist) pArtist.textContent = '—';
    if (pTotal) pTotal.textContent = '0:00';
    if (miniName) miniName.textContent = 'nothing playing';
    if (miniArtist) miniArtist.textContent = '—';
  }
}

function updateProgress() {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  const fill = document.getElementById('pFill');
  const cur = document.getElementById('pCurrent');
  const miniFill = document.getElementById('miniProgFill');
  if (fill) fill.style.width = pct + '%';
  if (cur) cur.textContent = fmtTime(audio.currentTime);
  if (miniFill) miniFill.style.width = pct + '%';
  if (isPlaying) animFrame = requestAnimationFrame(updateProgress);
}

function playTrack(idx) {
  if (idx < 0 || idx >= playlist.length) return;
  currentIdx = idx;
  audio.src = playlist[idx].url;
  audio.play().then(() => {
    isPlaying = true;
    document.getElementById('playBtn').textContent = '⏸';
    document.getElementById('vinyl')?.classList.add('spinning');
    document.getElementById('miniVinyl')?.classList.add('spinning');
    updatePlayerUI();
    renderPlaylist();
    cancelAnimationFrame(animFrame);
    updateProgress();
  }).catch(() => {});
}

function pauseTrack() {
  audio.pause();
  isPlaying = false;
  document.getElementById('playBtn').textContent = '▶';
  document.getElementById('vinyl')?.classList.remove('spinning');
  document.getElementById('miniVinyl')?.classList.remove('spinning');
  cancelAnimationFrame(animFrame);
}

function renderPlaylist() {
  const box = document.getElementById('playlist');
  if (!box) return;
  if (!playlist.length) {
    box.innerHTML = '<div class="pl-empty">no tracks loaded</div>';
    return;
  }
  box.innerHTML = playlist.map((t, i) => `
    <div class="pl-item ${i === currentIdx ? 'active' : ''}" data-idx="${i}">
      <span class="pl-num">${i + 1}</span>
      <span class="pl-title">${esc(t.name)}</span>
      <span class="pl-dur">${t.duration || '—'}</span>
      <button class="pl-remove" data-rm="${i}" title="Remove">✕</button>
    </div>
  `).join('');

  box.querySelectorAll('.pl-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.classList.contains('pl-remove')) return;
      playTrack(parseInt(item.dataset.idx));
    });
  });
  box.querySelectorAll('.pl-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const rm = parseInt(btn.dataset.rm);
      // revoke URL
      URL.revokeObjectURL(playlist[rm].url);
      playlist.splice(rm, 1);
      if (rm === currentIdx) { pauseTrack(); currentIdx = -1; updatePlayerUI(); }
      else if (rm < currentIdx) currentIdx--;
      renderPlaylist();
    });
  });
}

function addFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('audio/')) return;
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^/.]+$/, ''); // strip extension
    playlist.push({ name, url, duration: '—' });

    // get duration
    const tempAudio = new Audio();
    tempAudio.preload = 'metadata';
    tempAudio.src = url;
    tempAudio.addEventListener('loadedmetadata', () => {
      const idx = playlist.findIndex(t => t.url === url);
      if (idx >= 0) { playlist[idx].duration = fmtTime(tempAudio.duration); renderPlaylist(); }
    });
  });
  renderPlaylist();
  // auto-play first track if nothing is playing
  if (!isPlaying && currentIdx < 0 && playlist.length > 0) {
    playTrack(0);
  }
}

function initPlayer() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  // drop zone events
  if (dropZone) {
    dropZone.addEventListener('click', () => fileInput?.click());

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => { if (fileInput.files.length) addFiles(fileInput.files); fileInput.value = ''; });
  }

  // controls
  document.getElementById('playBtn')?.addEventListener('click', () => {
    if (isPlaying) { pauseTrack(); }
    else if (currentIdx >= 0) { audio.play(); isPlaying = true; document.getElementById('playBtn').textContent = '⏸'; document.getElementById('vinyl')?.classList.add('spinning'); document.getElementById('miniVinyl')?.classList.add('spinning'); updateProgress(); }
    else if (playlist.length) { playTrack(0); }
  });

  document.getElementById('prevBtn')?.addEventListener('click', () => {
    if (playlist.length === 0) return;
    const idx = (currentIdx - 1 + playlist.length) % playlist.length;
    playTrack(idx);
  });

  document.getElementById('nextBtn')?.addEventListener('click', () => {
    if (playlist.length === 0) return;
    const idx = (currentIdx + 1) % playlist.length;
    playTrack(idx);
  });

  document.getElementById('volDown')?.addEventListener('click', () => { audio.volume = Math.max(0, audio.volume - 0.1); });
  document.getElementById('volUp')?.addEventListener('click', () => { audio.volume = Math.min(1, audio.volume + 0.1); });

  // seek on progress bar click
  document.querySelector('.prog-track')?.addEventListener('click', e => {
    if (!audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  });

  // auto-advance
  audio.addEventListener('ended', () => {
    if (playlist.length === 0) return;
    const next = (currentIdx + 1) % playlist.length;
    playTrack(next);
  });

  // update duration display when metadata loads
  audio.addEventListener('loadedmetadata', () => {
    const pTotal = document.getElementById('pTotal');
    if (pTotal) pTotal.textContent = fmtTime(audio.duration);
  });

  renderPlaylist();
  updatePlayerUI();
}

/* ──────────────────────────────────────────────────────────────
   SPOTIFY — PKCE Auth Flow (no server needed)
────────────────────────────────────────────────────────────── */
function randomString(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(arr, v => chars[v % chars.length]).join('');
}

async function sha256(plain) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
}

function base64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function spotifyAuth() {
  if (!CONFIG.SPOTIFY_CLIENT_ID) { alert('Spotify Client ID not configured. Set it in script.js CONFIG.'); return; }
  const verifier = randomString(128);
  const challenge = base64url(await sha256(verifier));
  localStorage.setItem('sp_verifier', verifier);
  const redirectUri = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    client_id: CONFIG.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'user-read-currently-playing user-read-playback-state',
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  window.location.href = 'https://accounts.spotify.com/authorize?' + params;
}

async function handleSpotifyCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code || !CONFIG.SPOTIFY_CLIENT_ID) return false;
  const verifier = localStorage.getItem('sp_verifier');
  if (!verifier) return false;

  try {
    const redirectUri = window.location.origin + window.location.pathname;
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CONFIG.SPOTIFY_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('sp_access', data.access_token);
      localStorage.setItem('sp_refresh', data.refresh_token);
      localStorage.setItem('sp_expires', String(Date.now() + data.expires_in * 1000));
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
  } catch (e) { console.warn('Spotify token exchange failed:', e); }
  return false;
}

async function refreshSpotifyToken() {
  const rt = localStorage.getItem('sp_refresh');
  if (!rt || !CONFIG.SPOTIFY_CLIENT_ID) return false;
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CONFIG.SPOTIFY_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: rt,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('sp_access', data.access_token);
      localStorage.setItem('sp_expires', String(Date.now() + data.expires_in * 1000));
      if (data.refresh_token) localStorage.setItem('sp_refresh', data.refresh_token);
      return true;
    }
  } catch (e) {}
  return false;
}

async function getSpotifyToken() {
  const exp = parseInt(localStorage.getItem('sp_expires') || '0');
  if (Date.now() >= exp - 60000) {
    if (!await refreshSpotifyToken()) return null;
  }
  return localStorage.getItem('sp_access');
}

async function fetchNowPlaying() {
  const token = await getSpotifyToken();
  if (!token) return null;
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (res.status === 204 || res.status === 401) return null;
    if (!res.ok) return null;
    return res.json();
  } catch (e) { return null; }
}

function disconnectSpotify() {
  localStorage.removeItem('sp_access');
  localStorage.removeItem('sp_refresh');
  localStorage.removeItem('sp_expires');
  localStorage.removeItem('sp_verifier');
  updateSpotifyUI(false);
}

function updateSpotifyUI(connected) {
  const widget = document.getElementById('spotifyWidget');
  const np = document.getElementById('spotifyNowPlaying');
  if (connected) {
    if (widget) widget.style.display = 'none';
    if (np) np.classList.remove('hidden');
  } else {
    if (widget) widget.style.display = '';
    if (np) np.classList.add('hidden');
  }
}

let spotifyPollTimer = null;

async function pollSpotify() {
  const data = await fetchNowPlaying();
  const trackEl = document.getElementById('spotifyTrackName');
  const artistEl = document.getElementById('spotifyArtistName');
  const artEl = document.getElementById('spotifyAlbumArt');

  if (data && data.item) {
    if (trackEl) trackEl.textContent = data.item.name || '—';
    if (artistEl) artistEl.textContent = (data.item.artists || []).map(a => a.name).join(', ') || '—';
    if (artEl && data.item.album?.images?.[0]?.url) {
      artEl.src = data.item.album.images[data.item.album.images.length > 1 ? 1 : 0].url;
    }
  } else {
    if (trackEl) trackEl.textContent = 'nothing playing';
    if (artistEl) artistEl.textContent = '—';
    if (artEl) artEl.src = '';
  }
}

async function initSpotify() {
  if (!CONFIG.SPOTIFY_CLIENT_ID) {
    // hide spotify section entirely if not configured
    const section = document.getElementById('spotifySection');
    if (section) section.style.display = 'none';
    return;
  }

  // handle callback
  const wasCallback = await handleSpotifyCallback();

  // check if already connected
  const token = localStorage.getItem('sp_access');
  const isConnected = !!(token && parseInt(localStorage.getItem('sp_expires') || '0') > Date.now());

  if (wasCallback || isConnected) {
    updateSpotifyUI(true);
    pollSpotify();
    spotifyPollTimer = setInterval(pollSpotify, 5000);
  } else {
    updateSpotifyUI(false);
  }

  document.getElementById('spotifyConnect')?.addEventListener('click', spotifyAuth);
  document.getElementById('spotifyDisconnect')?.addEventListener('click', () => {
    clearInterval(spotifyPollTimer);
    disconnectSpotify();
  });
}

/* ──────────────────────────────────────────────────────────────
   STAT BARS (IntersectionObserver)
────────────────────────────────────────────────────────────── */
function initStatBars() {
  const section = document.getElementById('stats');
  if (!section) return;
  const fills = section.querySelectorAll('.stat-fill');
  fills.forEach(f => f.style.width = '0%');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        fills.forEach(f => f.style.width = (f.dataset.pct || '0') + '%');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  obs.observe(section);
}

/* ──────────────────────────────────────────────────────────────
   INTEREST CARD HOVER
────────────────────────────────────────────────────────────── */
function initInterestCards() {
  document.querySelectorAll('.int-card').forEach(card => {
    card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-2px)');
    card.addEventListener('mouseleave', () => card.style.transform = '');
  });
}

/* ──────────────────────────────────────────────────────────────
   INIT
────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();

  const count = getVisitorCount();
  initWelcomeDialog(count);
  initScrollNav();
  initScrollSpy();
  initQuotes();
  initGuestbook();
  initPlayer();
  initSpotify();
  initStatBars();
  initInterestCards();

  // last updated
  const lu = document.getElementById('lastUpdated');
  if (lu) lu.textContent = '01.06.2026';

  // clock
  updateClock();
  setInterval(updateClock, 30000);
});
