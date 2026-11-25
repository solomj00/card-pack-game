// =====================================================================
//  game.js — the game engine. You don't need to edit this to add cards;
//  everything you'd normally change lives in cards.js.
// =====================================================================
{
  const $ = (id) => document.getElementById(id);
  const RARITY_KEYS = Object.keys(RARITIES);          // in order, lowest first
  const rank = (key) => RARITY_KEYS.indexOf(key);
  const rarityOf = (card) => RARITIES[card.rarity] || RARITIES[RARITY_KEYS[0]];
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
  const allPacks = () => PACK_LIST.concat(myPacks);

  // Give every card an id (its position in the list)
  CARDS.forEach((card, i) => { card.id = i; });

  // Cards made on the "Make cards" tab (saved in this browser). Their ids start with "c".
  let myCards = [];
  try { const c = JSON.parse(localStorage.getItem(SET.saveKey + "-cards")); if (Array.isArray(c)) myCards = c; } catch (e) {}
  const BUILT_IN = CARDS.length;
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
  const store = () => { try { localStorage.setItem(SET.saveKey, JSON.stringify(save)); } catch (e) {} };

  // ---------- Apply set settings ----------
  document.title = SET.name;
  $("setName").textContent = SET.name;
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
    return `<div class="card" style="--c:${color};--a:${picBg}">
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
  const weightOf = (k, luck = 1) => RARITIES[k].weight * (rank(k) >= 2 ? luck : 1);
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
      <p class="about">${pack.mine ? '<span class="yours">Yours</span> ' : ""}${esc(pack.about || "")}</p></div>`;
  }

  function showPack() {
    if (!live().length) {
      $("stage").innerHTML = `<div class="empty-packs"><div class="ghost-pack" aria-hidden="true"><span>+</span></div>
        <h2>No cards yet</h2><p>Make some cards first, then build a pack to put them in.</p>
        <a class="btn" href="#make">Make cards</a></div>`;
      return;
    }
    if (!allPacks().length) {
      $("stage").innerHTML = `<div class="empty-packs">
        <div class="ghost-pack" aria-hidden="true"><span>?</span></div>
        <h2>No packs yet</h2>
        <p>Design your own booster in the workshop: pick the wrapper, the art, how many cards and how lucky it is.</p>
        <a class="btn" href="#build">Build your first pack</a></div>`;
      return;
    }
    $("stage").innerHTML = `<div class="picker">
      <p class="hint">${allPacks().length > 1 ? "Choose a pack" : "Tap the pack to open it"}</p>
      <div class="packs">${allPacks().map(packHTML).join("")}</div>
      <p class="hint small"><a href="#build">Build another pack →</a></p></div>`;
    document.querySelectorAll(".pack").forEach((el) => { el.onclick = () => choose(el); });
  }

  async function choose(el) {
    const picks = [...document.querySelectorAll(".pick")];
    document.querySelectorAll(".pack").forEach((p) => (p.onclick = null));
    const mine = el.closest(".pick");
    picks.forEach((p) => p !== mine && p.classList.add("fade"));
    $("stage").querySelector(".hint").style.visibility = "hidden";
    await wait(calm || picks.length < 2 ? 0 : 320);
    picks.forEach((p) => p !== mine && (p.style.display = "none"));
    mine.classList.add("chosen");
    openPack(allPacks()[+el.dataset.pack], el);
  }

  async function openPack(packDef, pack) {
    // Pull the cards and save them right away, so leaving mid-reveal never loses a pull.
    // Cards are sorted so the rarest one is revealed last.
    const pool = poolFor(packDef);
    const pulls = packDef.slots.map((slot) => pull(slot.min, pool, packDef.luck || 1)).sort((a, b) => rank(a.rarity) - rank(b.rarity));
    const seen = {};
    const isNew = pulls.map((c) => { const n = !save.owned[c.id] && !seen[c.id]; seen[c.id] = 1; return n; });
    save.packs++;
    pulls.forEach((c) => { save.owned[c.id] = (save.owned[c.id] || 0) + 1; save.best = Math.max(save.best, rank(c.rarity)); });
    store();

    await wait(calm ? 0 : 150);
    sfx.shake(); pack.classList.add("shake"); await wait(calm ? 0 : 450);
    pack.classList.remove("shake"); sfx.tear(); pack.classList.add("torn"); await wait(calm ? 0 : 550);
    pack.classList.add("gone"); await wait(calm ? 0 : 400);
    showStack(pulls, isNew);
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
        sfx.hype(h);
        if (h >= 2) { const rays = document.createElement("div"); rays.className = "rays"; rays.style.setProperty("--glow", r.glow || "#fff"); pile.append(rays); }
        if (h >= 2) confetti(h >= 3 ? 220 : 90, [r.glow || "#fff", "#ffffff", "#ffc929", "#7af6ff"]);
        if (h >= 3) flash();
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
      else { await wait(250); showSummary(pulls, isNew); }
    }

    pile.onclick = step;
    $("skip").onclick = async () => {
      if (skipping) return;
      skipping = true;
      $("skip").disabled = true;
      while (busy) await wait(50);
      busy = true;
      while (next < pulls.length) { tuck(); await reveal(); await wait(120); }
      tuck(); await wait(250);
      showSummary(pulls, isNew);
    };
  }

  // =================== 3. Summary ===================
  function showSummary(pulls, isNew) {
    const bestRank = Math.max(...pulls.map((c) => rank(c.rarity)));
    $("stage").innerHTML = `<div>
      <div class="spread">${pulls.map((c, i) => {
        const r = rarityOf(c), best = rank(c.rarity) === bestRank && (r.hype || 0) > 0;
        return `<div>
          <div class="slot open${r.shine ? " shine" : ""}${best ? " best" : ""}" style="--glow:${r.glow || "#fff"}">
            <div class="flip"><div class="face back"></div><div class="face front">${cardHTML(c)}</div></div>
          </div>
          <div class="tag" style="opacity:1">${r.label}${isNew[i] ? ' · <span class="newtag">New!</span>' : ""}</div></div>`;
      }).join("")}</div>
      <div class="actions"><button class="btn" id="again">Choose another pack</button></div></div>`;
    document.querySelectorAll(".slot").forEach((slot) => {
      slot.onpointermove = (e) => {
        const b = slot.getBoundingClientRect();
        slot.style.setProperty("--hx", ((e.clientX - b.left) / b.width) * 100 + "%");
        slot.style.setProperty("--hy", ((e.clientY - b.top) / b.height) * 100 + "%");
      };
    });
    renderBinder();
    const again = $("again");
    again.focus();
    again.onclick = showPack;
  }

  // =================== Binder ===================
  let filter = "All";
  function renderBinder() {
    const CARDS = live();
    const found = CARDS.filter((c) => save.owned[c.id]).length;
    $("sPacks").textContent = save.packs;
    $("sFound").textContent = found;
    $("sTotal").textContent = CARDS.length;
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
    save = { packs: 0, owned: {}, best: -1 };
    store(); armed = false; b.textContent = "Reset collection";
    renderBinder(); showPack();
  };

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
      $("stage").innerHTML = `<div class="picker"><p class="hint" style="visibility:hidden">.</p><div class="packs">
        <div class="pick chosen"><button class="pack" ${packAttrs(pack)}>${packFace(pack)}</button></div></div></div>`;
      const el = $("stage").querySelector(".pack");
      openPack(pack, el);
    },
  };

  renderBinder();
  showPack();
}
