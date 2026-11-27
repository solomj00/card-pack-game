// =====================================================================
//  game.js — the game engine. You don't need to edit this to add cards;
//  everything you'd normally change lives in cards.js.
// =====================================================================
{
  const $ = (id) => document.getElementById(id);
  const RARITY_KEYS = Object.keys(RARITIES);          // in order, lowest first
  // Turn an old or unknown rarity name into one from RARITIES (see RARITY_RENAMES in cards.js)
  const RENAMES = typeof RARITY_RENAMES !== "undefined" ? RARITY_RENAMES : {};
  const norm = (k) => (RARITIES[k] ? k : RARITIES[RENAMES[k]] ? RENAMES[k] : RARITY_KEYS[0]);
  const rank = (key) => RARITY_KEYS.indexOf(norm(key));
  // "Hits" are Epic and better (the third rarity onwards)
  const HIT_RANK = Math.min(2, RARITY_KEYS.length - 1);
  const rarityOf = (card) => RARITIES[norm(card.rarity)];
  // Animation speed: "normal", "fast" or "instant" (skips the reveal)
  let speed = "normal";
  try { speed = localStorage.getItem((typeof SET !== "undefined" ? SET.saveKey : "") + "-speed") || "normal"; } catch (e) {}
  document.documentElement.dataset.speed = speed;
  const wait = (ms) => new Promise((r) => setTimeout(r, speed === "fast" ? ms * 0.35 : ms));
  // A tiny event system so extras.js can react to what happens (quests, XP, achievements)
  const listeners = {};
  const on = (ev, fn) => (listeners[ev] = listeners[ev] || []).push(fn);
  const emit = (ev, data) => (listeners[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Ready-made packs from cards.js (can be an empty list). Very old cards.js files
  // had a single PACK instead: still support that.
  const PACK_LIST = (typeof PACKS !== "undefined") ? PACKS
    : (typeof PACK !== "undefined" && PACK.length) ? [{ name: (SET.packName || "BOOSTER"), color: (SET.packColor || "#ffc929"), slots: PACK }]
    : [];

  // Packs made in the Build-a-pack workshop (saved in this browser)
  // =================== Picture storage ===================
  // Pictures are big, and the browser's normal storage only holds about 5 MB, so pictures
  // live in IndexedDB (usually hundreds of MB). The card lists keep a small "idb:..." note
  // in their place. While the page runs, each picture is a blob: address in memory.
  const IMG = { db: null, url: {}, key: {} };          // url[key] = blob address, key[address] = key
  const openDB = () => new Promise((ok, bad) => {
    if (IMG.db) return ok(IMG.db);
    if (!window.indexedDB) return bad(new Error("no IndexedDB"));
    const r = indexedDB.open(SET.saveKey + "-pictures", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("img");
    r.onsuccess = () => ok((IMG.db = r.result));
    r.onerror = () => bad(r.error);
  });
  const tx = (mode, fn) => openDB().then((db) => new Promise((ok, bad) => {
    const t = db.transaction("img", mode), out = fn(t.objectStore("img"));
    t.oncomplete = () => ok(out && out.result); t.onerror = () => bad(t.error); t.onabort = () => bad(t.error);
  }));
  const toBlob = (d) => { const [h, b64] = d.split(","), bin = atob(b64), a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: (h.match(/data:(.*?);/) || [])[1] || "image/jpeg" }); };
  const remember = (key, blob) => {
    if (IMG.url[key]) { delete IMG.key[IMG.url[key]]; URL.revokeObjectURL(IMG.url[key]); }
    const u = URL.createObjectURL(blob); IMG.url[key] = u; IMG.key[u] = key; return u;
  };
  // Put a picture away and get back the small note to save in its place
  async function stashPic(key, src) {
    if (!src) return "";
    if (src.startsWith("idb:")) return src;
    if (src.startsWith("blob:")) return IMG.key[src] ? "idb:" + IMG.key[src] : src;
    if (!src.startsWith("data:")) return src;                       // e.g. "images/x.png"
    const blob = toBlob(src);
    await tx("readwrite", (s) => s.put(blob, key));
    remember(key, blob);
    return "idb:" + key;
  }
  const liveSrc = (src) => (src && src.startsWith("idb:") ? IMG.url[src.slice(4)] || "" : src || "");
  // Save the card list: pictures to IndexedDB, everything else to normal storage
  async function persistCards() {
    const out = [];
    for (const c of myCards) {
      const ref = await stashPic("card:" + c.id, c.image || c._img);
      if (ref.startsWith("idb:") && liveSrc(ref)) { c.image = liveSrc(ref); delete c._img; }
      const { custom, _img, ...rest } = c; out.push({ ...rest, image: ref });
    }
    localStorage.setItem(SET.saveKey + "-cards", JSON.stringify(out));
    const keep = new Set(myCards.map((c) => "card:" + c.id));
    const gone = Object.keys(IMG.url).filter((k) => k.startsWith("card:") && !keep.has(k));
    if (gone.length) await tx("readwrite", (s) => gone.forEach((k) => s.delete(k)));
  }
  async function persistPacks() {
    const out = [];
    for (const p of myPacks) {
      const ref = await stashPic("pack:" + p.id, p.coverImg || p._img);
      if (ref.startsWith("idb:") && liveSrc(ref)) { p.coverImg = liveSrc(ref); delete p._img; }
      const { _img, ...rest } = p; out.push({ ...rest, coverImg: ref });
    }
    localStorage.setItem(SET.saveKey + "-packs", JSON.stringify(out));
  }
  const storageFail = (e) => { console.error(e); toast("Couldn't save the picture. Your browser may be in private mode or out of space."); };

  let myPacks = [];
  try { const p = JSON.parse(localStorage.getItem(SET.saveKey + "-packs")); if (Array.isArray(p)) myPacks = p; } catch (e) {}
  const fixSlots = (list) => list.forEach((p) => (p.slots || []).forEach((s) => { s.min = norm(s.min); }));
  fixSlots(PACK_LIST);
  if (myPacks.some((p) => (p.slots || []).some((s) => !RARITIES[s.min]))) {
    fixSlots(myPacks);
    try { localStorage.setItem(SET.saveKey + "-packs", JSON.stringify(myPacks)); } catch (e) {}
  }
  const allPacks = () => PACK_LIST.concat(myPacks);

  // Give every card an id (its position in the list)
  CARDS.forEach((card, i) => { card.id = i; card.rarity = norm(card.rarity); });

  // Cards made on the "Make cards" tab (saved in this browser). Their ids start with "c".
  let myCards = [];
  try { const c = JSON.parse(localStorage.getItem(SET.saveKey + "-cards")); if (Array.isArray(c)) myCards = c; } catch (e) {}
  const BUILT_IN = CARDS.length;
  if (myCards.some((c) => !RARITIES[c.rarity])) {
    myCards.forEach((c) => { c.rarity = norm(c.rarity); });
    try { localStorage.setItem(SET.saveKey + "-cards", JSON.stringify(myCards)); } catch (e) {}
  }
  // Until the pictures load, keep each "idb:" note aside so nothing tries to show it as a picture
  myCards.forEach((c) => { if ((c.image || "").startsWith("idb:")) { c._img = c.image; c.image = ""; } });
  myPacks.forEach((p) => { if ((p.coverImg || "").startsWith("idb:")) { p._img = p.coverImg; p.coverImg = ""; } });
  const syncCards = () => { CARDS.length = BUILT_IN; myCards.forEach((c) => { c.custom = true; CARDS.push(c); }); };
  syncCards();
  // Load saved pictures, then move any pictures still kept in normal storage over to IndexedDB
  const picsReady = (async () => {
    try {
      const keys = await tx("readonly", (s) => s.getAllKeys()), blobs = await tx("readonly", (s) => s.getAll());
      (keys || []).forEach((k, i) => remember(k, blobs[i]));
      myCards.forEach((c) => { if (c._img) { c.image = liveSrc(c._img); if (c.image) delete c._img; } });
      myPacks.forEach((p) => { if (p._img) { p.coverImg = liveSrc(p._img); if (p.coverImg) delete p._img; } });
      const inline = myCards.some((c) => (c.image || "").startsWith("data:")) || myPacks.some((p) => (p.coverImg || "").startsWith("data:"));
      if (inline) { await persistCards(); await persistPacks(); }
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    } catch (e) { console.error("Picture storage unavailable", e); }
    emit("pictures");
  })();
  // Players can switch the sample cards from cards.js off and play with only their own
  let useSamples = true;
  try { useSamples = localStorage.getItem(SET.saveKey + "-samples") !== "off"; } catch (e) {}
  const live = () => CARDS.filter((c) => c.custom || useSamples);
  const byId = (id) => CARDS.find((c) => String(c.id) === String(id));

  // Make text safe to put into the page
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  // ---------- Saving ----------
  let save = { packs: 0, owned: {}, best: -1 };
  try { const s = JSON.parse(localStorage.getItem(SET.saveKey)); if (s && s.owned) save = s; } catch (e) {}
  save.hits = Array.isArray(save.hits) ? save.hits : [];
  // A new built-in set (SET.version changed): old pulls of built-in cards no longer match, so clear
  // them. Cards made on the "Make cards" tab (ids starting with "c") are kept.
  if ((save.setVersion || 1) !== (SET.version || 1)) {
    const keep = (id) => String(id)[0] === "c";
    Object.keys(save.owned).forEach((id) => { if (!keep(id)) delete save.owned[id]; });
    save.hits = save.hits.filter((h) => keep(h.id));
    save.counts = {}; save.best = -1; save.packs = 0;
    save.setVersion = SET.version || 1;
    try { localStorage.setItem(SET.saveKey, JSON.stringify(save)); } catch (e) {}
  }
  save.counts = save.counts && typeof save.counts === "object" ? save.counts : {};
  // Coins (see COINS in cards.js). null = coins are switched off and packs are free.
  const CO = typeof COINS !== "undefined" && COINS.enabled !== false ? COINS : null;
  if (CO && typeof save.coins !== "number") { save.coins = CO.start || 0; save.lastFree = 0; save.earned = 0; save.spent = 0; }
  // The rarity list changed since this save was made: move pull counts to the new names
  // and work out the best pull again from the cards you own.
  if (save.rarities !== RARITY_KEYS.join()) {
    const counts = {};
    Object.entries(save.counts).forEach(([k, n]) => { counts[norm(k)] = (counts[norm(k)] || 0) + n; });
    save.counts = counts;
    save.best = Math.max(-1, ...Object.keys(save.owned).map((id) => byId(id)).filter(Boolean).map((c) => rank(c.rarity)));
    save.rarities = RARITY_KEYS.join();
    try { localStorage.setItem(SET.saveKey, JSON.stringify(save)); } catch (e) {}
  }
  const store = () => { try { localStorage.setItem(SET.saveKey, JSON.stringify(save)); } catch (e) {} };

  // ---------- Apply set settings ----------
  document.title = SET.name;
  $("setName").textContent = SET.name;
  $("heroTitle").textContent = SET.name;
  document.documentElement.style.setProperty("--card-back", SET.cardBack);

  // =================== Sound (made in code, no files needed) ===================
  let soundOn = true;
  try { soundOn = localStorage.getItem(SET.saveKey + "-sound") !== "off"; } catch (e) {}
  let ac = null;
  const audio = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return ac; };
  function tone(freq, start = 0, dur = 0.15, type = "triangle", vol = 0.15) {
    const a = soundOn && audio(); if (!a) return;
    const t = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur = 0.3, vol = 0.2) {
    const a = soundOn && audio(); if (!a) return;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = "highpass"; f.frequency.value = 1800; g.gain.value = vol;
    src.buffer = buf; src.connect(f).connect(g).connect(a.destination); src.start();
  }
  const sfx = {
    shake: () => [0, .09, .18, .27].forEach((t) => tone(140, t, .08, "square", .05)),
    tear:  () => noise(.35, .25),
    flip:  () => { tone(520, 0, .07); tone(780, .04, .07); },
    charge: () => { for (let i = 0; i < 6; i++) tone(300 + i * 70, i * .1, .1, "sine", .08); },
    hype: (h) => {
      const notes = [[], [659, 784], [523, 659, 784, 1047], [523, 659, 784, 1047, 1319, 1568]][h] || [];
      notes.forEach((f, i) => tone(f, i * .08, .35, "triangle", .14));
      if (h >= 3) [523, 659, 784].forEach((f) => tone(f, .5, 1.2, "sine", .07));
    },
  };
  const paintSound = () => { const b = $("sound"); b.textContent = "Sound: " + (soundOn ? "on" : "off"); b.setAttribute("aria-pressed", soundOn); };
  $("sound").onclick = () => { soundOn = !soundOn; try { localStorage.setItem(SET.saveKey + "-sound", soundOn ? "on" : "off"); } catch (e) {} paintSound(); };
  paintSound();

  // =================== Confetti ===================
  const cv = $("confetti"), cx = cv.getContext("2d");
  let bits = [], running = false;
  function confetti(count, colors) {
    if (calm) return;
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    for (let i = 0; i < count; i++) bits.push({
      x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .45,
      vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 6, r: Math.random() * 6.3, vr: (Math.random() - .5) * .4,
      w: 6 + Math.random() * 6, h: 10 + Math.random() * 8, c: colors[i % colors.length], life: 0,
    });
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  function tick() {
    const s = devicePixelRatio; cx.clearRect(0, 0, cv.width, cv.height);
    bits = bits.filter((b) => b.y < innerHeight + 40 && b.life < 260);
    for (const b of bits) {
      b.life++; b.vy += .45; b.vx *= .985; b.x += b.vx; b.y += b.vy; b.r += b.vr;
      cx.save(); cx.translate(b.x * s, b.y * s); cx.rotate(b.r); cx.scale(1, Math.cos(b.life * .2));
      cx.fillStyle = b.c; cx.fillRect(-b.w * s / 2, -b.h * s / 2, b.w * s, b.h * s); cx.restore();
    }
    if (bits.length) requestAnimationFrame(tick); else { running = false; cx.clearRect(0, 0, cv.width, cv.height); }
  }
  function flash() { if (calm) return; const f = document.createElement("div"); f.className = "flash"; document.body.append(f); setTimeout(() => f.remove(), 800); }

  // =================== Drawing a card ===================
  function cardHTML(card, hidden) {
    const [color, picBg] = TYPES[card.type] || ["#e6e0d8", "#f7f4ef"];
    const r = rarityOf(card);
    const initials = card.name.split(" ").map((w) => w[0]).join("").replace(/[^A-Za-z0-9]/g, "").slice(0, 2);
    const pic = hidden ? "" :
      `<img src="${esc(card.image)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:'${initials}'}))">`;
    // A finished card picture (already has its name and attacks): show the picture as the whole card
    if (card.art === "card" && !hidden) {
      return `<div class="card whole" data-r="${esc(card.rarity)}" style="--c:${color};--a:${picBg}">
        <img src="${esc(card.image)}" alt="${esc(card.name)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:'${initials}'}))"></div>`;
    }
    const full = card.art ? card.art === "full" : !!r.fullArt;
    return `<div class="card${full ? " full" : ""}" data-r="${esc(card.rarity)}"${(card.frame || r.frame) ? ` data-frame="${esc(card.frame || r.frame)}"` : ""} style="--c:${color};--a:${picBg}">
      <div class="top"><span class="name">${hidden ? "???" : esc(card.name)}</span><span>${esc(card.hp)} HP</span></div>
      <div class="pic">${pic}</div>
      <div class="move"><span>${esc(card.move)}</span><span>${esc(card.damage)}</span></div>
      <div class="bottom"><span>${esc(card.type)}</span><span title="${r.label}">${r.symbol} ${card.custom ? "Custom" : "#" + String(card.id + 1).padStart(3, "0")}</span></div>
    </div>`;
  }

  // =================== Pulling a random card ===================
  // Picks a rarity by weight (at least `min`), then a random card of that rarity
  // from the pack's pool. If the pool has no card of that rarity, it uses the
  // closest rarity it does have.
  // Which cards a pack can give: the cards picked for it, or its types, or everything
  const poolFor = (pack) => {
    const all = live();
    let p = all;
    if (pack.cards && pack.cards.length) { const ids = new Set(pack.cards.map(String)); p = all.filter((c) => ids.has(String(c.id))); }
    else if (pack.types) p = all.filter((c) => pack.types.includes(c.type));
    return p.length ? p : all;
  };
  // luck multiplies the weight of Rare and better (2 = twice as likely, and so on)
  const weightOf = (k, luck = 1) => RARITIES[k].weight * (rank(k) >= 1 ? luck : 1);
  // Step 1: roll a rarity for a slot (at least `min`)
  function rollRarity(min, luck = 1) {
    const options = RARITY_KEYS.slice(Math.max(0, rank(min)));
    let roll = Math.random() * options.reduce((t, k) => t + weightOf(k, luck), 0);
    for (const k of options) { roll -= weightOf(k, luck); if (roll <= 0) return rank(k); }
    return rank(options[0]);
  }
  // Step 2: if the pack has no card at that rarity, use the closest one it does have that still
  // honours the slot's minimum (so a guaranteed Rare never turns into a Common), then anything else.
  function resolveRank(target, min, has) {
    const lo = Math.max(0, rank(min)), cost = (i) => (i < lo ? 100 + (lo - i) : Math.abs(i - target) * 2 - (i > target ? 1 : 0));
    return RARITY_KEYS.map((k, i) => i).filter((i) => has.has(i)).sort((a, b) => cost(a) - cost(b))[0];
  }
  function pull(min, pool, luck = 1) {
    const has = new Set(pool.map((c) => rank(c.rarity)));
    const r = resolveRank(rollRarity(min, luck), min, has);
    const options = pool.filter((c) => rank(c.rarity) === r);
    return options[Math.floor(Math.random() * options.length)];
  }

  // =================== 1. Pick a pack ===================
  // Dark or light lettering, whichever reads better on the wrapper colour
  function inkFor(hex) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || "");
    if (!m) return "#1b1214";
    const [r, g2, b] = m.slice(1).map((x) => parseInt(x, 16) / 255);
    return 0.2126 * r + 0.7152 * g2 + 0.0722 * b > 0.55 ? "#1b1214" : "#fff8ee";
  }
  function coverOf(pack, i = 0) {
    if (pack.coverImg) return pack.coverImg;                       // uploaded in the workshop
    if (pack.coverCard != null && byId(pack.coverCard)) return byId(pack.coverCard).image;
    if (pack.cover) return pack.cover;                             // set in cards.js
    if (pack.coverMode === "none") return "";
    const pool = poolFor(pack);
    return pool.length ? pool[(save.packs + i) % pool.length].image : "";
  }
  function packFace(pack, i = 0) {
    const c1 = pack.color || "#ffc929", c2 = pack.color2 || c1, img = coverOf(pack, i);
    return `<div class="tear"></div><div class="pat" aria-hidden="true"></div>
      <div class="cover${img ? "" : " empty"}">${img ? `<img src="${esc(img)}" alt="" onerror="this.remove()">` : ""}</div>
      ${pack.showName === false ? "" : `<div class="label">${esc(pack.name)}</div>
      <div class="sub">${pack.slots.length} card${pack.slots.length === 1 ? "" : "s"}</div>`}
      <div class="gloss" aria-hidden="true"></div>`;
  }
  const packAttrs = (pack) =>
    `style="--pack:${esc(pack.color || "#ffc929")};--pack2:${esc(pack.color2 || pack.color || "#ffc929")};--pack-ink:${inkFor(pack.color2 || pack.color)}" data-pattern="${esc(pack.pattern || "crimp")}" data-finish="${esc(pack.finish || "matte")}" data-art="${pack.artSize === "whole" && coverOf(pack) ? "whole" : "window"}"`;

  // =================== Coins ===================
  const fmt = (n) => Math.round(n).toLocaleString();
  const coinTag = (n) => `<span class="price"><i class="coin" aria-hidden="true"></i>${fmt(n)}</span>`;
  function priceOf(pack) {
    if (!CO) return 0;
    if (typeof pack.price === "number") return pack.price;
    const base = pack.slots.length * (CO.perCard || 0) + pack.slots.reduce((t, s) => t + ((CO.guaranteeExtra || {})[s.min] || 0), 0);
    const mult = (CO.luckPrice || {})[pack.luck || 1] || 1;
    return Math.max(5, Math.round((base * mult) / 5) * 5);
  }
  // Average coins you'd get back by selling everything in the pack
  function packValue(pack) {
    if (!CO) return 0;
    const pool = poolFor(pack), has = new Set(pool.map((c) => rank(c.rarity)));
    return pack.slots.reduce((t, slot) => {
      const opts = RARITY_KEYS.slice(Math.max(0, rank(slot.min)));
      const total = opts.reduce((a, k) => a + weightOf(k, pack.luck || 1), 0);
      return t + opts.reduce((a, k) => a + (weightOf(k, pack.luck || 1) / total) * ((CO.sell || {})[RARITY_KEYS[resolveRank(rank(k), slot.min, has)]] || 0), 0);
    }, 0);
  }
  const boxPrice = (pack, n = 10) => (CO ? Math.round((priceOf(pack) * n * (CO.boxDiscount || 1)) / 5) * 5 : 0);
  const spinHours = () => (CO ? CO.spinEveryHours || CO.freeEveryHours || 4 : 4);
  const freeWait = () => (CO ? Math.max(0, (save.lastFree || 0) + spinHours() * 3600e3 - Date.now()) : 0);
  const sellValue = (c) => (CO ? (CO.sell || {})[c.rarity] || 0 : 0);
  const dupes = () => live().filter((c) => (save.owned[c.id] || 0) > 1);
  const dupeValue = () => dupes().reduce((t, c) => t + (save.owned[c.id] - 1) * sellValue(c), 0);

  function renderWallet() {
    const w = $("wallet");
    if (!CO) { w.hidden = true; return; }
    w.hidden = false;
    $("coinBal").textContent = fmt(save.coins);
    const left = freeWait(), btn = $("freeCoins");
    btn.classList.toggle("wait", left > 0);
    if (left <= 0) { btn.disabled = false; btn.innerHTML = `<i class="wheel-ic" aria-hidden="true"></i>Spin the wheel`; }
    else {
      const mins = Math.ceil(left / 60e3), h = Math.floor(mins / 60), m = mins % 60;
      btn.disabled = false; btn.textContent = `Next spin in ${h ? h + "h" : ""}${h && m ? " " : ""}${m || !h ? m + "m" : ""}`;
    }
  }
  function earn(n) {
    if (!CO || n <= 0) return;
    save.coins += n; save.earned = (save.earned || 0) + n; store(); renderWallet();
    const b = $("coinBal"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    tone(880, 0, .08); tone(1320, .07, .12);
  }
  // Pay for something; if there aren't enough coins, say how to get more
  function spend(n) {
    if (!CO || n <= 0) return true;
    if (save.coins >= n) { save.coins -= n; save.spent = (save.spent || 0) + n; store(); renderWallet(); return true; }
    const ways = [];
    if (freeWait() <= 0) ways.push(`<button type="button" class="btn small" data-act="spin">Spin the prize wheel</button>`);
    if (dupeValue() > 0) ways.push(`<button type="button" class="btn small alt" data-act="sell">Sell duplicates for ${fmt(dupeValue())}</button>`);
    toast(`<b>Not enough coins.</b> You need ${fmt(n - save.coins)} more.` + (ways.length ? `<div class="toast-acts">${ways.join("")}</div>`
      : ` Your next wheel spin is in ${Math.ceil(freeWait() / 60e3)} min.`), 6000);
    return false;
  }
  // =================== Prize wheel ===================
  const short = (n) => (n >= 1000 ? (n / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "K" : String(n));
  const SLICE_COLORS = ["#ff2e7e", "#7d4cff", "#2f8fd1", "#14a06b", "#ff8a3d", "#b35cff", "#00b3c7", "#e0457b"];
  let wheelRot = 0, spinning = false;
  const wheelSlices = () => (CO && Array.isArray(CO.wheel) && CO.wheel.length ? CO.wheel : [{ coins: 100 }])
    .map((s) => (typeof s === "number" ? { coins: s, chance: 1 } : { coins: +s.coins || 0, chance: s.chance > 0 ? +s.chance : 1 }));
  function drawWheel() {
    const sl = wheelSlices(), total = sl.reduce((t, s) => t + s.chance, 0), top = Math.max(...sl.map((s) => s.coins));
    const R = 150, pt = (deg, r) => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];
    let at = 0, out = "";
    sl.forEach((s, i) => {
      const span = (s.chance / total) * 360, a0 = at, a1 = at + span, mid = at + span / 2;
      s.mid = mid; at = a1;
      const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), jackpot = s.coins === top;
      const fill = jackpot ? "url(#gold)" : SLICE_COLORS[i % SLICE_COLORS.length];
      out += `<path d="M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${span > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z" fill="${fill}" stroke="#0d1220" stroke-width="2"/>`;
      // labels run along the radius so even thin slices fit
      const fs = Math.max(9, Math.min(17, (span / 360) * 2 * Math.PI * 95 * 0.62));
      const flip = mid > 180;   // keep labels on the left half the right way up
      out += `<text transform="rotate(${(mid - 90).toFixed(2)}) translate(${R - 12} 0)${flip ? " rotate(180)" : ""}" text-anchor="${flip ? "start" : "end"}" dominant-baseline="central"
        font-size="${fs.toFixed(1)}" font-weight="800" fill="${jackpot ? "#4a3206" : "#fff"}" font-family="Sora, sans-serif">${short(s.coins)}</text>`;
    });
    $("wheelSvg").innerHTML = `<defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffcf33"/><stop offset="1" stop-color="#c58b14"/></linearGradient></defs>
      <g id="wheelRot" style="transform:rotate(${wheelRot}deg)">${out}</g>
      <circle r="${R + 4}" fill="none" stroke="#ffcf33" stroke-width="6"/>
      ${Array.from({ length: 24 }, (_, i) => { const [x, y] = pt(i * 15, R + 4); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#fff8d6"/>`; }).join("")}`;
    return sl;
  }
  function paintWheel() {
    const left = freeWait(), ready = left <= 0 && !spinning;
    $("spinBtn").disabled = !ready; $("spinHub").disabled = !ready;
    if (!spinning) $("wheelMsg").innerHTML = left > 0
      ? `Next spin in <b>${$("freeCoins").textContent.replace("Next spin in ", "")}</b>. You can spin once every ${spinHours()} hours.`
      : `Spin to win up to <b>${fmt(Math.max(...wheelSlices().map((s) => s.coins)))}</b> coins!`;
  }
  function openWheel() {
    if (!CO) return;
    drawWheel(); paintWheel();
    const d = $("wheelDlg"); if (!d.open) d.showModal();
    d.append($("confetti"));               // so confetti shows on top of the dialog
  }
  $("wheelDlg").addEventListener("close", () => document.body.prepend($("confetti")));
  function spinWheel() {
    if (!CO || spinning || freeWait() > 0) return;
    const sl = drawWheel(), total = sl.reduce((t, s) => t + s.chance, 0);
    let roll = Math.random() * total, win = sl[sl.length - 1];
    for (const s of sl) { roll -= s.chance; if (roll <= 0) { win = s; break; } }
    spinning = true;
    save.lastFree = Date.now(); store(); renderWallet();   // the spin is used as soon as it starts
    const span = (win.chance / total) * 360, jitter = (Math.random() - 0.5) * span * 0.7;
    const target = wheelRot + 360 * 6 + ((((-win.mid - jitter - wheelRot) % 360) + 360) % 360);
    const g2 = $("wheelRot"), dur = calm ? 0.01 : 5;
    $("wheelMsg").textContent = "Spinning…"; paintWheel();
    g2.style.transition = `transform ${dur}s cubic-bezier(.12,.72,.12,1)`;
    requestAnimationFrame(() => { g2.style.transform = `rotate(${target}deg)`; });
    // tick sound as slices pass the pointer
    let last = wheelRot, t0 = performance.now();
    const tick = () => {
      const m = getComputedStyle(g2).transform;
      if (m && m !== "none") {
        const [a, b] = m.slice(7, -1).split(",").map(Number);
        const deg = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
        if (Math.abs(deg - (last % 360)) > 12) { tone(1400, 0, .025, "square", .03); last = deg; }
      }
      if (performance.now() - t0 < dur * 1000) requestAnimationFrame(tick);
    };
    if (!calm) requestAnimationFrame(tick);
    setTimeout(() => {
      wheelRot = target; spinning = false;
      earn(win.coins);
      emit("spin", { coins: win.coins, jackpot: win.coins === Math.max(...sl.map((s) => s.coins)) });
      const top = Math.max(...sl.map((s) => s.coins)), big = win.coins >= top / 10;
      $("wheelMsg").innerHTML = win.coins === top ? `<b class="jackpot">JACKPOT! +${fmt(win.coins)} coins!</b>` : `You won <b>+${fmt(win.coins)}</b> coins!`;
      if (big) { sfx.hype(win.coins === top ? 3 : 2); confetti(win.coins === top ? 260 : 120, ["#ffcf33", "#fff3c4", "#ff2e7e", "#7af6ff"]); }
      $("spinBtn").disabled = true; $("spinHub").disabled = true;
    }, dur * 1000 + 100);
  }
  $("spinBtn").onclick = spinWheel; $("spinHub").onclick = spinWheel;
  const claimFree = openWheel;

  // =================== Selling ===================
  // Sell one copy of a card (used right after opening a pack)
  function sellOne(c) {
    if (!CO || !save.owned[c.id]) return 0;
    save.owned[c.id]--;
    if (!save.owned[c.id]) delete save.owned[c.id];
    earn(sellValue(c));
    emit("sell", { n: 1, coins: sellValue(c) });
    return sellValue(c);
  }
  function sellDupes() {
    const total = dupeValue(), n = dupes().reduce((t, c) => t + save.owned[c.id] - 1, 0);
    if (!total) return;
    dupes().forEach((c) => { save.owned[c.id] = 1; });
    earn(total); emit("sell", { n, coins: total }); renderBinder();
    toast(`Sold ${n} duplicate card${n === 1 ? "" : "s"} for ${fmt(total)} coins.`);
  }
  let toastTimer = null;
  function toast(html, ms = 3500) {
    const t = $("toast");
    const open = document.querySelector("dialog[open]");   // show above any open pop-up
    if (open && t.parentElement !== open) open.append(t); else if (!open && t.parentElement !== document.body) document.body.append(t);
    t.innerHTML = html; t.hidden = false; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.remove("show"); setTimeout(() => (t.hidden = true), 300); }, ms);
  }
  $("toast").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    if (b.dataset.act === "spin") openWheel();
    if (b.dataset.act === "sell") sellDupes();
  });
  $("freeCoins").onclick = claimFree;
  setInterval(renderWallet, 30e3);

  function packHTML(pack, i) {
    return `<div class="pick">
      <button class="pack" data-pack="${i}" ${packAttrs(pack)} aria-label="Open a ${esc(pack.name)} pack">${packFace(pack, i)}</button>
      <p class="about">${pack.showName === false ? `<b class="pack-name">${esc(pack.name)}</b><br>` : ""}${pack.mine ? '<span class="yours">Yours</span> ' : ""}${esc(pack.about || "")}</p>
      ${CO ? `<p class="pack-price">${coinTag(priceOf(pack))} a pack <span class="ev">· avg. value back ${fmt(packValue(pack))}</span></p>` : ""}
      <button type="button" class="mini-btn" data-box="${i}">Open a box of 10${CO ? " · " + coinTag(boxPrice(pack)) : ""}</button></div>`;
  }

  // What the Space key does right now (changes with each screen)
  let spaceAction = null;
  let lastPack = null;

  function showPack() {
    spaceAction = null;
    if (!live().length) {
      $("stage").innerHTML = `<div class="empty-packs">${STEPS(1)}
        <a class="btn" href="#make">Make your first card</a></div>`;
      return;
    }
    if (!allPacks().length) {
      $("stage").innerHTML = `<div class="empty-packs">${STEPS(2)}
        <a class="btn" href="#build">Build your first pack</a></div>`;
      return;
    }
    $("stage").innerHTML = `<div class="picker">
      <p class="hint">${allPacks().length > 1 ? "Choose a pack" : "Tap the pack to open it"}</p>
      <div class="packs">${allPacks().map(packHTML).join("")}</div>
      ${pityOn() ? `<p class="pity">Bad-luck protection: ${esc(RARITIES[norm(PITY.rarity)].label)} or better guaranteed within <b>${pityLeft()}</b> pack${pityLeft() === 1 ? "" : "s"}</p>` : ""}
      <p class="hint small"><a href="#build">Build another pack →</a></p></div>`;
    document.querySelectorAll("#stage .pack").forEach((el) => { el.onclick = () => choose(el); });
    document.querySelectorAll("#stage [data-box]").forEach((b) => { b.onclick = () => openBox(allPacks()[+b.dataset.box]); });
    spaceAction = () => {
      const packs = allPacks(), i = Math.max(0, packs.indexOf(lastPack));
      const el = document.querySelector(`#stage .pack[data-pack="${i}"]`);
      if (el) choose(el);
    };
  }

  // The 3-step guide shown before there's anything to open
  const STEPS = (now) => `<ol class="steps">${[
    ["Make cards", "Upload pictures and turn them into cards.", "#make"],
    ["Build a pack", "Pick the wrapper, how many cards and how lucky.", "#build"],
    ["Open packs", "Rip it open and chase the rare pulls.", "#"],
  ].map(([t, d, href], i) => `<li class="${i + 1 === now ? "now" : i + 1 < now ? "done" : ""}"><span class="num">${i + 1 < now ? "✓" : i + 1}</span>
      <div><b>${t}</b><p>${d}</p></div></li>`).join("")}</ol>`;

  async function choose(el) {
    if (!spend(priceOf(allPacks()[+el.dataset.pack]))) {
      el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
      return;
    }
    spaceAction = null;
    const picks = [...document.querySelectorAll("#stage .pick")];
    document.querySelectorAll("#stage .pack, #stage [data-box]").forEach((p) => (p.onclick = null));
    const mine = el.closest(".pick");
    picks.forEach((p) => p !== mine && p.classList.add("fade"));
    $("stage").querySelectorAll(".hint").forEach((h) => (h.style.visibility = "hidden"));
    await wait(calm || picks.length < 2 ? 0 : 320);
    picks.forEach((p) => p !== mine && (p.style.display = "none"));
    mine.classList.add("chosen");
    openPack(allPacks()[+el.dataset.pack], el);
  }

  // Roll the cards for one pack and save them (so leaving mid-reveal never loses a pull).
  // Cards come back sorted so the rarest one is revealed last.
  const pityOn = () => typeof PITY !== "undefined" && PITY.packs > 0 && RARITIES[norm(PITY.rarity)];
  const pityLeft = () => (pityOn() ? Math.max(1, PITY.packs - (save.dry || 0)) : 0);
  function rollPack(packDef) {
    const pool = poolFor(packDef);
    let slots = packDef.slots;
    const pityRank = pityOn() ? rank(PITY.rarity) : 99;
    const pityNow = pityOn() && (save.dry || 0) >= PITY.packs - 1 && pool.some((c) => rank(c.rarity) >= pityRank);
    if (pityNow) {   // bad-luck protection: the last slot is upgraded
      slots = slots.map((s, i) => (i === slots.length - 1 && rank(s.min) < pityRank ? { min: norm(PITY.rarity) } : s));
    }
    const pulls = slots.map((slot) => pull(slot.min, pool, packDef.luck || 1)).filter(Boolean)
      .sort((a, b) => rank(a.rarity) - rank(b.rarity));
    const seen = {};
    const isNew = pulls.map((c) => { const n = !save.owned[c.id] && !seen[c.id]; seen[c.id] = 1; return n; });
    save.packs++;
    pulls.forEach((c) => {
      save.owned[c.id] = (save.owned[c.id] || 0) + 1;
      save.best = Math.max(save.best, rank(c.rarity));
      save.counts[c.rarity] = (save.counts[c.rarity] || 0) + 1;
      if (rank(c.rarity) >= HIT_RANK) save.hits.unshift({ id: c.id, pack: packDef.name, t: Date.now() });
    });
    save.hits.length = Math.min(save.hits.length, 60);
    if (pityOn()) save.dry = pulls.some((c) => rank(c.rarity) >= pityRank) ? 0 : (save.dry || 0) + 1;
    emit("pack", { pulls, isNew, pack: packDef, pity: pityNow });
    return { pulls, isNew };
  }

  async function openPack(packDef, pack) {
    spaceAction = null;
    lastPack = packDef;
    const { pulls, isNew } = rollPack(packDef);
    store();
    if (speed === "instant") {
      const best = pulls.reduce((b, c) => (rank(c.rarity) > rank(b.rarity) ? c : b), pulls[0]);
      sfx.tear(); showSummary(pulls, isNew, false); celebrate(rarityOf(best));
      return;
    }
    await wait(calm ? 0 : 150);
    sfx.shake(); pack.classList.add("shake"); await wait(calm ? 0 : 450);
    pack.classList.remove("shake"); sfx.tear(); pack.classList.add("torn"); await wait(calm ? 0 : 550);
    pack.classList.add("gone"); await wait(calm ? 0 : 400);
    if (revealMode === "grid") showSummary(pulls, isNew, true);
    else showStack(pulls, isNew);
  }

  // Celebrate a card as it flips (shared by both reveal styles)
  function celebrate(r) {
    const h = r.hype || 0;
    if (!h) return;
    sfx.hype(h);
    if (h >= 2) confetti(h >= 4 ? 420 : h >= 3 ? 220 : 90, [r.glow || "#fff", "#ffffff", "#ff2e7e", "#7af6ff"]);
    if (h >= 3) flash();
    if (h >= 4) {   // Impossible: a second flash, more confetti and a deep boom
      setTimeout(flash, 450); setTimeout(() => confetti(300, ["#7af6ff", "#ff4fd8", "#ffd84a", "#ffffff", "#b38cff"]), 600);
      tone(55, 0, 1.4, "sawtooth", .12); tone(82, .05, 1.2, "sine", .1);
      document.body.classList.add("quake"); setTimeout(() => document.body.classList.remove("quake"), 700);
    }
  }

  // =================== 2. Reveal one card at a time ===================
  function showStack(pulls, isNew) {
    $("stage").innerHTML = `<div class="table">
      <div class="call" id="call" aria-live="polite">Tap the stack to reveal</div>
      <button class="pile" id="pile" aria-label="Reveal the next card">
        ${pulls.map((c, i) => `<div class="pb back" style="--i:${pulls.length - 1 - i}"></div>`).join("")}
      </button>
      <div class="got" id="got"></div>
      <div class="actions" style="margin-top:4px"><button class="btn alt" id="skip">Reveal all</button></div>
    </div>`;

    let next = 0, current = null, busy = false, skipping = false;
    const pile = $("pile"), call = $("call");

    async function reveal() {
      const card = pulls[next], r = rarityOf(card), h = r.hype || 0, fresh = isNew[next];
      // take the top card off the pile
      const backs = pile.querySelectorAll(".pb");
      backs[backs.length - 1]?.remove();
      next++;
      const big = document.createElement("div");
      big.className = "big" + (r.shine ? " shine" : "");
      big.style.setProperty("--glow", r.glow || "#fff");
      big.innerHTML = `<div class="flip"><div class="face back"></div><div class="face front">${cardHTML(card)}</div></div>`;
      big.onpointermove = (e) => {
        const b = big.getBoundingClientRect();
        big.style.setProperty("--hx", ((e.clientX - b.left) / b.width) * 100 + "%");
        big.style.setProperty("--hy", ((e.clientY - b.top) / b.height) * 100 + "%");
      };
      pile.append(big);
      current = { big, card };
      call.className = "call"; call.style.removeProperty("--glow");

      // build-up before a rare card flips
      if (h > 0 && r.glow && !skipping) {
        call.textContent = h >= 4 ? "Wait… this can't be…" : h >= 3 ? "Something huge…" : h >= 2 ? "It's shimmering…" : "Ooh…";
        big.classList.add("charge", "h" + h);
        sfx.charge();
        await wait(calm ? 0 : 500 + h * 300 + (h >= 4 ? 1200 : 0));
        big.classList.remove("charge", "h" + h);
      }

      sfx.flip();
      big.classList.add("open");
      await wait(skipping ? 120 : 350);

      // celebrate
      if (h > 0 && !skipping) {
        call.className = "call loud"; call.style.setProperty("--glow", r.glow || "#fff");
        call.textContent = r.label.toUpperCase() + "!" + (fresh ? " New!" : "");
        if (h >= 2) { const rays = document.createElement("div"); rays.className = "rays"; rays.style.setProperty("--glow", r.glow || "#fff"); pile.append(rays); }
        celebrate(r);
      } else {
        call.textContent = r.label + (fresh ? " · New!" : "");
      }
      if (next === pulls.length && !skipping) call.textContent += "  (tap to finish)";
    }

    function tuck() {
      // move the shown card down into the row underneath
      if (!current) return;
      const { big, card } = current;
      pile.querySelector(".rays")?.remove();
      big.classList.add("leave");
      setTimeout(() => big.remove(), 280);
      const tiny = document.createElement("div");
      tiny.className = "tiny" + (rarityOf(card).shine ? " shine" : "");
      tiny.innerHTML = `<div>${cardHTML(card)}</div>`;
      $("got").append(tiny);
      current = null;
    }

    async function step() {
      if (busy) return;
      busy = true;
      tuck();
      if (next < pulls.length) { await reveal(); busy = false; }
      else { spaceAction = null; await wait(250); showSummary(pulls, isNew); }
    }

    pile.onclick = step;
    spaceAction = step;
    $("skip").onclick = async () => {
      if (skipping) return;
      skipping = true; spaceAction = null;
      $("skip").disabled = true;
      while (busy) await wait(50);
      busy = true;
      while (next < pulls.length) { tuck(); await reveal(); await wait(120); }
      tuck(); await wait(250);
      showSummary(pulls, isNew);
    };
  }

  // =================== 3. Summary (and the "All at once" reveal) ===================
  const badge = (r) => `<span class="rbadge" style="--glow:${esc(r.glow || "#8e9ab0")}">${esc(r.label)}</span>`;

  async function showSummary(pulls, isNew, animate = false) {
    spaceAction = null;
    const bestRank = Math.max(...pulls.map((c) => rank(c.rarity)));
    $("stage").innerHTML = `<div class="results">
      <div class="results-head"><h2>${esc(lastPack ? lastPack.name : "Pack")} contents</h2>
        ${animate ? '<button type="button" class="btn alt small" id="skipGrid">Skip</button>' : ""}</div>
      <div class="spread">${pulls.map((c, i) => {
        const r = rarityOf(c), best = rank(c.rarity) === bestRank && (r.hype || 0) > 0;
        return `<div>
          <div data-id="${esc(c.id)}" class="slot${animate ? "" : " open"}${r.shine ? " shine" : ""}${best ? " best" : ""}" style="--glow:${esc(r.glow || "#fff")}">
            <div class="flip"><div class="face back"></div><div class="face front">${cardHTML(c)}${badge(r)}</div></div>
          </div>
          <div class="tag"${animate ? "" : ' style="opacity:1"'}>${isNew[i] ? '<span class="newtag">New!</span>' : "&nbsp;"}
            ${CO ? `<button type="button" class="sell-btn" data-sell="${i}">Sell ${coinTag(sellValue(c))}</button>` : ""}</div></div>`;
      }).join("")}</div>
      <div class="actions" id="resultActions"${animate ? " hidden" : ""}>
        ${lastPack ? `<button class="btn" id="again">Open another ${esc(lastPack.name)}${CO ? " · " + coinTag(priceOf(lastPack)) : ""}</button>` : ""}
        <button class="btn alt" id="choose">Choose a different pack</button>
        <button class="btn alt" id="copyPull">Copy pull</button>
        ${CO ? `<button class="btn alt" id="sellAll">Sell all ${coinTag(pulls.reduce((t, c) => t + sellValue(c), 0))}</button>` : ""}</div></div>`;
    const slots = [...document.querySelectorAll("#stage .slot")];
    slots.forEach((slot) => {
      slot.onpointermove = (e) => {
        const b = slot.getBoundingClientRect();
        slot.style.setProperty("--hx", ((e.clientX - b.left) / b.width) * 100 + "%");
        slot.style.setProperty("--hy", ((e.clientY - b.top) / b.height) * 100 + "%");
      };
    });

    if (animate) {
      // flip the cards over one after another; rare ones glow first
      let skip = false;
      $("skipGrid").onclick = () => { skip = true; };
      spaceAction = () => { skip = true; };
      for (let i = 0; i < slots.length; i++) {
        const r = rarityOf(pulls[i]), h = r.hype || 0;
        if (!skip && h > 0 && r.glow) { slots[i].classList.add("charge"); sfx.charge(); await wait(calm ? 0 : 350 + h * 250); slots[i].classList.remove("charge"); }
        slots[i].classList.add("open");
        slots[i].nextElementSibling.style.opacity = 1;
        if (!skip) { sfx.flip(); celebrate(r); await wait(calm ? 0 : 260); }
      }
      $("skipGrid")?.remove();
      $("resultActions").hidden = false;
    }

    renderBinder();
    const again = $("again");
    if (again) { again.onclick = () => window.CardGame.openNow(lastPack); again.focus({ preventScroll: true }); }
    $("choose").onclick = showPack;
    $("copyPull").onclick = async () => {
      const best = [...pulls].sort((a, b) => rank(b.rarity) - rank(a.rarity));
      const text = `I opened a ${lastPack ? lastPack.name : ""} pack in ${SET.name} and pulled:\n`
        + best.map((c) => `${rarityOf(c).symbol} ${c.name} (${rarityOf(c).label})`).join("\n") + `\n${location.href.split("#")[0]}`;
      try { await navigator.clipboard.writeText(text); toast("Pull copied! Paste it anywhere to share."); }
      catch (e) { toast("Couldn't copy here. Your browser blocked it."); }
    };
    if (CO) {
      const sold = new Set();
      const sellAt = (i) => {
        if (sold.has(i)) return 0;
        sold.add(i);
        const v = sellOne(pulls[i]);
        const btn = document.querySelector(`#stage [data-sell="${i}"]`);
        btn.disabled = true; btn.innerHTML = `Sold +${fmt(v)}`;
        btn.closest(".tag").previousElementSibling.classList.add("sold");
        return v;
      };
      const paintSellAll = () => {
        const left = pulls.reduce((t, c, i) => t + (sold.has(i) ? 0 : sellValue(c)), 0), b = $("sellAll");
        if (!b) return;
        b.disabled = !left; b.innerHTML = left ? `Sell all ${coinTag(left)}` : "All sold";
      };
      document.querySelectorAll("#stage [data-sell]").forEach((b) => { b.onclick = () => { sellAt(+b.dataset.sell); paintSellAll(); renderBinder(); }; });
      $("sellAll").onclick = () => {
        let total = 0; pulls.forEach((c, i) => { total += sellAt(i); });
        paintSellAll(); renderBinder();
        if (total) toast(`Sold the whole pack for ${fmt(total)} coins.`);
      };
    }
    spaceAction = lastPack ? () => window.CardGame.openNow(lastPack) : showPack;
  }

  // =================== Booster box: open 10 packs at once ===================
  function openBox(packDef, n = 10) {
    if (!packDef || !spend(boxPrice(packDef, n))) return;
    lastPack = packDef;
    const all = [], fresh = new Set();
    for (let i = 0; i < n; i++) {
      const { pulls, isNew } = rollPack(packDef);
      pulls.forEach((c, j) => { all.push(c); if (isNew[j]) fresh.add(c.id); });
    }
    store(); renderBinder();
    emit("box", { n, cards: all });
    const counts = RARITY_KEYS.map((k) => [RARITIES[k], all.filter((c) => c.rarity === k).length]);
    const hits = all.filter((c) => rank(c.rarity) >= HIT_RANK).sort((a, b) => rank(b.rarity) - rank(a.rarity));
    const top = hits[0] ? rarityOf(hits[0]) : null;
    $("boxBody").innerHTML = `
      <p class="box-sum"><b>${n} ${esc(packDef.name)} packs</b> · ${all.length} cards · ${fresh.size} new to your collection</p>
      <div class="rar-row">${counts.map(([r, k]) => `<span class="rar-chip" style="--glow:${esc(r.glow || "#8e9ab0")}"><i></i>${esc(r.label)} <b>${k}</b></span>`).join("")}</div>
      <h3>Hits <span class="muted">(${hits.length})</span></h3>
      ${hits.length ? `<div class="hit-grid in-dlg">${hits.map((c) => hitHTML(c, fresh.has(c.id) ? "New!" : "")).join("")}</div>`
        : `<p class="muted">No rare cards in this box. Unlucky!</p>`}
      <div class="actions"><button class="btn" id="boxAgain">Open another box${CO ? " · " + coinTag(boxPrice(packDef, n)) : ""}</button>
        ${CO ? `<button class="btn alt" id="boxSell">Sell everything ${coinTag(all.reduce((t, c) => t + sellValue(c), 0))}</button>` : ""}<button class="btn alt" data-close>Done</button></div>`;
    const d = $("boxDlg");
    if (!d.open) d.showModal();
    d.querySelector(".dlg-body, #boxBody").scrollTop = 0;
    $("boxAgain").onclick = () => openBox(packDef, n);
    if (CO) $("boxSell").onclick = () => {
      let total = 0; all.forEach((c) => { total += sellOne(c); });
      const b = $("boxSell"); b.disabled = true; b.textContent = `Sold for ${fmt(total)} coins`;
      renderBinder();
    };
    if (top) { sfx.charge(); setTimeout(() => celebrate(top), 300); }
  }

  // =================== Card hits & stats ===================
  const hitHTML = (c, note = "") => {
    const r = rarityOf(c);
    return `<div class="hit${r.shine ? " shine" : ""}" data-id="${esc(c.id)}"><div class="hit-card">${cardHTML(c)}${badge(r)}</div>
      ${note ? `<small>${esc(note)}</small>` : ""}</div>`;
  };
  function renderHits() {
    const list = save.hits.map((h) => ({ h, c: byId(h.id) })).filter((x) => x.c);
    $("hitCount").textContent = list.length ? `${list.length} hit${list.length === 1 ? "" : "s"}` : "";
    $("hits").innerHTML = list.length ? list.slice(0, 30).map(({ h, c }) => hitHTML(c, "from " + h.pack)).join("")
      : `<div class="hits-empty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l-1 4H7zM7 7h10v14H7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
        <b>No card hits yet</b><span>${esc(RARITIES[RARITY_KEYS[HIT_RANK]].label)} and better pulls will show up here as you open packs.</span></div>`;
  }

  function showStats() {
    const CARDS = live(), total = RARITY_KEYS.reduce((t, k) => t + (save.counts[k] || 0), 0);
    const found = CARDS.filter((c) => save.owned[c.id]).length;
    $("statsBody").innerHTML = `
      <div class="stat-grid">
        <div><span>Packs opened</span><b>${save.packs}</b></div>
        <div><span>Cards pulled</span><b>${total}</b></div>
        <div><span>Found</span><b>${found} / ${CARDS.length}</b></div>
        <div><span>Best pull</span><b>${save.best < 0 ? "—" : esc(RARITIES[RARITY_KEYS[save.best]].label)}</b></div>
        ${CO ? `<div><span>Coins spent</span><b>${fmt(save.spent || 0)}</b></div><div><span>Coins earned</span><b>${fmt(save.earned || 0)}</b></div>` : ""}
      </div>
      <h3>Your pulls by rarity</h3>
      <div class="rate-list">${RARITY_KEYS.map((k) => {
        const n = save.counts[k] || 0, p = total ? n / total : 0, r = RARITIES[k];
        return `<div class="rate"><span>${esc(r.symbol)} ${esc(r.label)}</span><span class="bar"><i style="width:${Math.max(p ? 2 : 0, p * 100)}%;background:${esc(r.glow || "#8e9ab0")}"></i></span>
          <b>${n}</b><em>${total ? (p * 100 < 1 && p > 0 ? (p * 100).toFixed(1) : Math.round(p * 100)) + "%" : "—"}</em></div>`;
      }).join("")}</div>
      ${total ? "" : '<p class="muted">Open some packs to see your pull rates.</p>'}`;
    $("statsDlg").showModal();
  }

  // =================== Header banner ===================
  function renderHero() {
    const imgs = live().map((c) => c.image).filter(Boolean);
    $("heroCollage").innerHTML = imgs.length ? Array.from({ length: 14 }, (_, i) =>
      `<div class="hc"><img src="${esc(imgs[i % imgs.length])}" alt="" onerror="this.remove()"></div>`).join("") : "";
  }

  // =================== Binder ===================
  let filter = "All";
  function renderBinder() {
    const CARDS = live();
    const found = CARDS.filter((c) => save.owned[c.id]).length;
    $("sPacks").textContent = save.packs;
    $("sFound").textContent = found;
    $("sFoundOf").textContent = " / " + CARDS.length;
    $("sTotal").textContent = CARDS.length;
    $("binderSub").textContent = `${found} of ${CARDS.length} cards found · ${save.packs} pack${save.packs === 1 ? "" : "s"} opened`
      + (CO ? ` · collection worth ${fmt(CARDS.reduce((t, c) => t + (save.owned[c.id] || 0) * sellValue(c), 0))} coins` : "");
    $("sBest").textContent = save.best < 0 ? "—" : RARITIES[RARITY_KEYS[save.best]].label;

    const types = [...new Set(CARDS.map((c) => c.type))];
    $("filters").innerHTML = ["All", "Owned", ...types]
      .map((f) => `<button class="chip" aria-pressed="${f === filter}" data-f="${esc(f)}">${esc(f)}</button>`).join("");

    const list = CARDS.filter((c) => filter === "All" || (filter === "Owned" ? save.owned[c.id] : c.type === filter));
    $("grid").innerHTML = list.map((c) => {
      const n = save.owned[c.id] || 0;
      return `<div class="mini${n ? "" : " missing"}${rarityOf(c).shine ? " shine" : ""}"${n ? ` data-id="${esc(c.id)}" tabindex="0" role="button" aria-label="Look at ${esc(c.name)}"` : ""}>
        ${n > 1 ? `<span class="count">×${n}</span>` : ""}${cardHTML(c, !n)}</div>`;
    }).join("") || "<p>No cards here yet.</p>";
    const sb = $("sellDupes");
    if (CO) {
      const v = dupeValue();
      sb.hidden = false; sb.disabled = !v;
      sb.innerHTML = v ? `Sell duplicates for ${coinTag(v)}` : "No duplicates to sell";
    } else sb.hidden = true;
    renderHits();
    renderHero();
    renderWallet();
  }
  $("filters").onclick = (e) => { const b = e.target.closest("[data-f]"); if (b) { filter = b.dataset.f; renderBinder(); } };

  let sellArmed = false;
  $("sellDupes").onclick = () => {
    const b = $("sellDupes");
    if (!sellArmed) { sellArmed = true; b.textContent = "Tap again to sell (keeps one of each)"; setTimeout(() => { sellArmed = false; renderBinder(); }, 3000); return; }
    sellArmed = false; sellDupes();
  };

  // Reset asks for a second tap instead of a pop-up
  let armed = false;
  $("reset").onclick = () => {
    const b = $("reset");
    if (!armed) {
      armed = true; b.textContent = "Tap again to confirm";
      setTimeout(() => { armed = false; b.textContent = "Reset collection"; }, 3000);
      return;
    }
    save = { packs: 0, owned: {}, best: -1, hits: [], counts: {}, setVersion: SET.version || 1, rarities: RARITY_KEYS.join(),
      ...(CO ? { coins: CO.start || 0, lastFree: 0, earned: 0, spent: 0 } : {}) };
    store(); armed = false; b.textContent = "Reset collection";
    renderBinder(); showPack();
  };

  // =================== Controls: reveal style, stats, dialogs, Space key ===================
  let revealMode = "stack";
  try { revealMode = localStorage.getItem(SET.saveKey + "-reveal") === "grid" ? "grid" : "stack"; } catch (e) {}
  const paintMode = () => document.querySelectorAll(".seg [data-mode]").forEach((b) => b.setAttribute("aria-checked", b.dataset.mode === revealMode));
  document.querySelector(".seg").onclick = (e) => {
    const b = e.target.closest("[data-mode]"); if (!b) return;
    revealMode = b.dataset.mode; paintMode();
    try { localStorage.setItem(SET.saveKey + "-reveal", revealMode); } catch (e2) {}
  };
  paintMode();
  $("statsBtn").onclick = showStats;
  document.querySelectorAll("dialog").forEach((d) => {
    d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) d.close(); });
  });
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat) return;
    if ($("playView").hidden || document.querySelector("dialog[open]")) return;
    const t = e.target;
    if (t.closest && t.closest("input, textarea, select, button, a, [contenteditable]")) return;
    if (!spaceAction) return;
    e.preventDefault();
    spaceAction();
  });

  // =================== Card inspector (tap a card to see it big) ===================
  const buyPrice = (c) => (CO ? Math.max(5, sellValue(c) * ((typeof PROGRESS !== "undefined" && PROGRESS.buyMultiplier) || 6)) : 0);
  function inspect(id) {
    const c = byId(id); if (!c) return;
    const r = rarityOf(c), n = save.owned[c.id] || 0;
    $("inspectBody").innerHTML = `<div class="insp-stage"><div class="insp-card${r.shine ? " shine" : ""}" id="inspCard">${cardHTML(c)}</div></div>
      <div class="insp-info"><h2>${esc(c.name)}</h2>
        <p><span class="rar-chip" style="--glow:${esc(r.glow || "#8e9ab0")}"><i></i>${esc(r.label)}</span> <span class="muted">${esc(c.type)}${c.custom ? " · made by you" : ""}</span></p>
        <dl><div><dt>You own</dt><dd>${n}</dd></div>${CO ? `<div><dt>Sells for</dt><dd>${coinTag(sellValue(c))}</dd></div><div><dt>Shop price</dt><dd>${coinTag(buyPrice(c))}</dd></div>` : ""}</dl>
        <div class="actions">${CO && n ? `<button class="btn alt" id="inspSell">Sell one</button>` : ""}<button class="btn alt" data-close>Close</button></div></div>`;
    const d = $("inspectDlg"); if (!d.open) d.showModal();
    const card = $("inspCard"), stage = card.parentElement;
    stage.onpointermove = (e) => {
      const b = stage.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
      card.style.transform = `rotateY(${x * 24}deg) rotateX(${-y * 18}deg)`;
      card.style.setProperty("--hx", (x + .5) * 100 + "%"); card.style.setProperty("--hy", (y + .5) * 100 + "%");
    };
    stage.onpointerleave = () => { card.style.transform = ""; };
    const s = $("inspSell");
    if (s) s.onclick = () => { sellOne(c); renderBinder(); inspect(c.id); };
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("button, a, dialog")) return;
    const el = e.target.closest("#grid [data-id], #hits [data-id], .hit-grid [data-id], #stage .slot.open[data-id], #martView .mini[data-id], #shopGrid .mini[data-id]");
    if (el) inspect(el.dataset.id);
  });
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("#grid [data-id]")) { e.preventDefault(); inspect(e.target.dataset.id); }
  });
  function buyCard(c) {
    if (!c || !spend(buyPrice(c))) return false;
    const isNew = !save.owned[c.id];
    save.owned[c.id] = (save.owned[c.id] || 0) + 1;
    save.best = Math.max(save.best, rank(c.rarity));
    store(); renderBinder();
    emit("buy", { card: c, isNew });
    toast(`Bought ${esc(c.name)}${isNew ? " · New!" : ""}`);
    return true;
  }
  // Speed buttons
  const paintSpeed = () => document.querySelectorAll("[data-speed]").forEach((b) => b.setAttribute("aria-checked", b.dataset.speed === speed));
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-speed]"); if (!b) return;
    speed = b.dataset.speed; document.documentElement.dataset.speed = speed; paintSpeed();
    try { localStorage.setItem(SET.saveKey + "-speed", speed); } catch (e2) {}
  });
  paintSpeed();

  // =================== Hooks used by builder.js ===================
  window.CardGame = {
    RARITIES, RARITY_KEYS, TYPES, esc, rank, weightOf, poolFor, resolveRank, packFace, packAttrs, cardHTML, byId,
    get cards() { return live(); },
    get myCards() { return myCards; },
    get useSamples() { return useSamples; },
    get builtInCount() { return BUILT_IN; },
    saveMyCards(list) {
      myCards = list; syncCards(); renderBinder();
      persistCards().catch(storageFail);
      return true;
    },
    picsReady, persistCards,
    setUseSamples(on) {
      useSamples = on;
      try { localStorage.setItem(SET.saveKey + "-samples", on ? "on" : "off"); } catch (e) {}
      renderBinder();
    },
    get myPacks() { return myPacks; },
    saveMyPacks(list) {
      myPacks = list;
      persistPacks().catch(storageFail);
      return true;
    },
    showPicker: showPack,
    // Open a pack straight away (used by "Open it now")
    openNow(pack) {
      if (!spend(priceOf(pack))) return false;
      spaceAction = null;
      $("stage").innerHTML = `<div class="picker"><p class="hint" style="visibility:hidden">.</p><div class="packs">
        <div class="pick chosen"><button class="pack" ${packAttrs(pack)}>${packFace(pack)}</button></div></div></div>`;
      const el = $("stage").querySelector(".pack");
      openPack(pack, el);
      return true;
    },
    priceOf, boxPrice, get coinsOn() { return !!CO; },
    on, emit, rollPack, spend, earn, store, toast, fmt, coinTag, sellValue, buyPrice, buyCard, inspect, packValue, celebrate, renderBinder,
    rarityOf, get save() { return save; }, get allPacks() { return allPacks(); }, get lastPack() { return lastPack; }, set lastPack(p) { lastPack = p; },
  };

  renderBinder();
  showPack();
  on("pictures", () => {
    renderBinder();
    if (!$("playView").hidden && document.querySelector("#stage .picker:not(:has(.chosen)), #stage .empty-packs")) showPack();
  });
}
