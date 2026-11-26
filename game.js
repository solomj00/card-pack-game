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
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Ready-made packs from cards.js (can be an empty list). Very old cards.js files
  // had a single PACK instead: still support that.
  const PACK_LIST = (typeof PACKS !== "undefined") ? PACKS
    : (typeof PACK !== "undefined" && PACK.length) ? [{ name: (SET.packName || "BOOSTER"), color: (SET.packColor || "#ffc929"), slots: PACK }]
    : [];

  // Packs made in the Build-a-pack workshop (saved in this browser)
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
  const syncCards = () => { CARDS.length = BUILT_IN; myCards.forEach((c) => { c.custom = true; CARDS.push(c); }); };
  syncCards();
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
  const poolFor = (pack) => {
    const all = live(), p = pack.types ? all.filter((c) => pack.types.includes(c.type)) : all;
    return p.length ? p : all;
  };
  // luck multiplies the weight of Rare and better (2 = twice as likely, and so on)
  const weightOf = (k, luck = 1) => RARITIES[k].weight * (rank(k) >= 1 ? luck : 1);
  function pull(min, pool, luck = 1) {
    const options = RARITY_KEYS.slice(Math.max(0, rank(min)));
    let roll = Math.random() * options.reduce((t, k) => t + weightOf(k, luck), 0);
    let pick = options[0];
    for (const k of options) { roll -= weightOf(k, luck); if (roll <= 0) { pick = k; break; } }
    const target = rank(pick);
    // If the pool has nothing at that rarity, use the closest one that still honours the
    // slot's minimum (so a guaranteed Rare never turns into a Common), then anything else.
    const lo = Math.max(0, rank(min)), cost = (i) => (i < lo ? 100 + (lo - i) : Math.abs(i - target) * 2 - (i > target ? 1 : 0));
    const order = RARITY_KEYS.map((k, i) => i).sort((a, b) => cost(a) - cost(b));
    for (const i of order) {
      const options2 = pool.filter((c) => rank(c.rarity) === i);
      if (options2.length) return options2[Math.floor(Math.random() * options2.length)];
    }
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
      <div class="label">${esc(pack.name)}</div>
      <div class="sub">${pack.slots.length} card${pack.slots.length === 1 ? "" : "s"}</div>
      <div class="gloss" aria-hidden="true"></div>`;
  }
  const packAttrs = (pack) =>
    `style="--pack:${esc(pack.color || "#ffc929")};--pack2:${esc(pack.color2 || pack.color || "#ffc929")};--pack-ink:${inkFor(pack.color2 || pack.color)}" data-pattern="${esc(pack.pattern || "crimp")}" data-finish="${esc(pack.finish || "matte")}"`;

  function packHTML(pack, i) {
    return `<div class="pick">
      <button class="pack" data-pack="${i}" ${packAttrs(pack)} aria-label="Open a ${esc(pack.name)} pack">${packFace(pack, i)}</button>
      <p class="about">${pack.mine ? '<span class="yours">Yours</span> ' : ""}${esc(pack.about || "")}</p>
      <button type="button" class="mini-btn" data-box="${i}">Open a box of 10</button></div>`;
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
  function rollPack(packDef) {
    const pool = poolFor(packDef);
    const pulls = packDef.slots.map((slot) => pull(slot.min, pool, packDef.luck || 1)).filter(Boolean)
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
    return { pulls, isNew };
  }

  async function openPack(packDef, pack) {
    spaceAction = null;
    lastPack = packDef;
    const { pulls, isNew } = rollPack(packDef);
    store();
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
    if (h >= 2) confetti(h >= 3 ? 220 : 90, [r.glow || "#fff", "#ffffff", "#ff2e7e", "#7af6ff"]);
    if (h >= 3) flash();
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
        call.textContent = h >= 3 ? "Something huge…" : h >= 2 ? "It's shimmering…" : "Ooh…";
        big.classList.add("charge", "h" + h);
        sfx.charge();
        await wait(calm ? 0 : 500 + h * 300);
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
          <div class="slot${animate ? "" : " open"}${r.shine ? " shine" : ""}${best ? " best" : ""}" style="--glow:${esc(r.glow || "#fff")}">
            <div class="flip"><div class="face back"></div><div class="face front">${cardHTML(c)}${badge(r)}</div></div>
          </div>
          <div class="tag"${animate ? "" : ' style="opacity:1"'}>${isNew[i] ? '<span class="newtag">New!</span>' : "&nbsp;"}</div></div>`;
      }).join("")}</div>
      <div class="actions" id="resultActions"${animate ? " hidden" : ""}>
        ${lastPack ? `<button class="btn" id="again">Open another ${esc(lastPack.name)}</button>` : ""}
        <button class="btn alt" id="choose">Choose a different pack</button></div></div>`;
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
    spaceAction = lastPack ? () => window.CardGame.openNow(lastPack) : showPack;
  }

  // =================== Booster box: open 10 packs at once ===================
  function openBox(packDef, n = 10) {
    if (!packDef) return;
    lastPack = packDef;
    const all = [], fresh = new Set();
    for (let i = 0; i < n; i++) {
      const { pulls, isNew } = rollPack(packDef);
      pulls.forEach((c, j) => { all.push(c); if (isNew[j]) fresh.add(c.id); });
    }
    store(); renderBinder();
    const counts = RARITY_KEYS.map((k) => [RARITIES[k], all.filter((c) => c.rarity === k).length]);
    const hits = all.filter((c) => rank(c.rarity) >= HIT_RANK).sort((a, b) => rank(b.rarity) - rank(a.rarity));
    const top = hits[0] ? rarityOf(hits[0]) : null;
    $("boxBody").innerHTML = `
      <p class="box-sum"><b>${n} ${esc(packDef.name)} packs</b> · ${all.length} cards · ${fresh.size} new to your collection</p>
      <div class="rar-row">${counts.map(([r, k]) => `<span class="rar-chip" style="--glow:${esc(r.glow || "#8e9ab0")}"><i></i>${esc(r.label)} <b>${k}</b></span>`).join("")}</div>
      <h3>Hits <span class="muted">(${hits.length})</span></h3>
      ${hits.length ? `<div class="hit-grid in-dlg">${hits.map((c) => hitHTML(c, fresh.has(c.id) ? "New!" : "")).join("")}</div>`
        : `<p class="muted">No rare cards in this box. Unlucky!</p>`}
      <div class="actions"><button class="btn" id="boxAgain">Open another box</button><button class="btn alt" data-close>Done</button></div>`;
    const d = $("boxDlg");
    if (!d.open) d.showModal();
    d.querySelector(".dlg-body, #boxBody").scrollTop = 0;
    $("boxAgain").onclick = () => openBox(packDef, n);
    if (top) { sfx.charge(); setTimeout(() => celebrate(top), 300); }
  }

  // =================== Card hits & stats ===================
  const hitHTML = (c, note = "") => {
    const r = rarityOf(c);
    return `<div class="hit${r.shine ? " shine" : ""}"><div class="hit-card">${cardHTML(c)}${badge(r)}</div>
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
    $("binderSub").textContent = `${found} of ${CARDS.length} cards found · ${save.packs} pack${save.packs === 1 ? "" : "s"} opened`;
    $("sBest").textContent = save.best < 0 ? "—" : RARITIES[RARITY_KEYS[save.best]].label;

    const types = [...new Set(CARDS.map((c) => c.type))];
    $("filters").innerHTML = ["All", "Owned", ...types]
      .map((f) => `<button class="chip" aria-pressed="${f === filter}" data-f="${esc(f)}">${esc(f)}</button>`).join("");

    const list = CARDS.filter((c) => filter === "All" || (filter === "Owned" ? save.owned[c.id] : c.type === filter));
    $("grid").innerHTML = list.map((c) => {
      const n = save.owned[c.id] || 0;
      return `<div class="mini${n ? "" : " missing"}${rarityOf(c).shine ? " shine" : ""}">
        ${n > 1 ? `<span class="count">×${n}</span>` : ""}${cardHTML(c, !n)}</div>`;
    }).join("") || "<p>No cards here yet.</p>";
    renderHits();
    renderHero();
  }
  $("filters").onclick = (e) => { const b = e.target.closest("[data-f]"); if (b) { filter = b.dataset.f; renderBinder(); } };

  // Reset asks for a second tap instead of a pop-up
  let armed = false;
  $("reset").onclick = () => {
    const b = $("reset");
    if (!armed) {
      armed = true; b.textContent = "Tap again to confirm";
      setTimeout(() => { armed = false; b.textContent = "Reset collection"; }, 3000);
      return;
    }
    save = { packs: 0, owned: {}, best: -1, hits: [], counts: {}, setVersion: SET.version || 1, rarities: RARITY_KEYS.join() };
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

  // =================== Hooks used by builder.js ===================
  window.CardGame = {
    RARITIES, RARITY_KEYS, TYPES, esc, rank, weightOf, poolFor, packFace, packAttrs, cardHTML, byId,
    get cards() { return live(); },
    get myCards() { return myCards; },
    get useSamples() { return useSamples; },
    saveMyCards(list) {
      try { localStorage.setItem(SET.saveKey + "-cards", JSON.stringify(list)); } catch (e) { return false; }
      myCards = list; syncCards(); renderBinder(); return true;
    },
    setUseSamples(on) {
      useSamples = on;
      try { localStorage.setItem(SET.saveKey + "-samples", on ? "on" : "off"); } catch (e) {}
      renderBinder();
    },
    get myPacks() { return myPacks; },
    saveMyPacks(list) {
      myPacks = list;
      try { localStorage.setItem(SET.saveKey + "-packs", JSON.stringify(list)); return true; } catch (e) { return false; }
    },
    showPicker: showPack,
    // Open a pack straight away (used by "Open it now")
    openNow(pack) {
      spaceAction = null;
      $("stage").innerHTML = `<div class="picker"><p class="hint" style="visibility:hidden">.</p><div class="packs">
        <div class="pick chosen"><button class="pack" ${packAttrs(pack)}>${packFace(pack)}</button></div></div></div>`;
      const el = $("stage").querySelector(".pack");
      openPack(pack, el);
    },
  };

  renderBinder();
  showPack();
}
