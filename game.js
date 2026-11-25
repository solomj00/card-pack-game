// =====================================================================
//  game.js — the game engine. You don't need to edit this to add cards;
//  everything you'd normally change lives in cards.js.
// =====================================================================
{
  const $ = (id) => document.getElementById(id);
  const RARITY_KEYS = Object.keys(RARITIES);          // in order, lowest first
  const rank = (key) => RARITY_KEYS.indexOf(key);

  // Give every card an id (its position in the list)
  CARDS.forEach((card, i) => { card.id = i; });

  // Make text safe to put into the page
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  // ---------- Saving ----------
  let save = { packs: 0, owned: {}, best: -1 };
  try { const s = JSON.parse(localStorage.getItem(SET.saveKey)); if (s && s.owned) save = s; } catch (e) {}
  const store = () => { try { localStorage.setItem(SET.saveKey, JSON.stringify(save)); } catch (e) {} };

  // ---------- Apply set settings ----------
  document.title = SET.name;
  $("setName").textContent = SET.name;
  document.documentElement.style.setProperty("--pack", SET.packColor);
  document.documentElement.style.setProperty("--card-back", SET.cardBack);

  // ---------- Drawing a card ----------
  function cardHTML(card, hidden) {
    const [color, picBg] = TYPES[card.type] || ["#e6e0d8", "#f7f4ef"];
    const r = RARITIES[card.rarity] || RARITIES[RARITY_KEYS[0]];
    const initials = card.name.split(" ").map((w) => w[0]).join("").replace(/[^A-Za-z0-9]/g, "").slice(0, 2);
    const pic = hidden ? "" :
      `<img src="${esc(card.image)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:'${initials}'}))">`;
    return `<div class="card" style="--c:${color};--a:${picBg}">
      <div class="top"><span class="name">${hidden ? "???" : esc(card.name)}</span><span>${esc(card.hp)} HP</span></div>
      <div class="pic">${pic}</div>
      <div class="move"><span>${esc(card.move)}</span><span>${esc(card.damage)}</span></div>
      <div class="bottom"><span>${esc(card.type)}</span><span title="${r.label}">${r.symbol} #${String(card.id + 1).padStart(3, "0")}</span></div>
    </div>`;
  }

  // ---------- Pulling a random card ----------
  // Picks a rarity by weight (at least `min`), then a random card of that rarity.
  // If your set has no card of that rarity, it uses the closest rarity you do have.
  function pull(min) {
    const options = RARITY_KEYS.slice(Math.max(0, rank(min)));
    let roll = Math.random() * options.reduce((t, k) => t + RARITIES[k].weight, 0);
    let pick = options[0];
    for (const k of options) { roll -= RARITIES[k].weight; if (roll <= 0) { pick = k; break; } }

    const target = rank(pick);
    const order = RARITY_KEYS.map((k, i) => i).sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b);
    for (const i of order) {
      const pool = CARDS.filter((c) => rank(c.rarity) === i);
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // ---------- Screens ----------
  function showPack() {
    const cover = CARDS.length ? CARDS[save.packs % CARDS.length] : null;
    $("stage").innerHTML = `<div>
      <button class="pack" id="pack" aria-label="Open a pack">
        <div class="tear"></div>
        <div class="cover">${cover ? `<img src="${esc(cover.image)}" alt="" onerror="this.remove()">` : ""}</div>
        <div class="label">${esc(SET.packName)}</div>
        <div class="sub">${PACK.length} cards</div>
      </button>
      <p class="hint">${CARDS.length ? "Tap the pack to open it" : "Add cards in cards.js to start"}</p></div>`;
    if (CARDS.length) $("pack").onclick = openPack;
  }

  function openPack() {
    const pack = $("pack");
    pack.onclick = null;
    pack.classList.add("torn");
    const pulls = PACK.map((slot) => pull(slot.min));
    setTimeout(() => { pack.classList.add("gone"); setTimeout(() => dealCards(pulls), 350); }, 550);
  }

  function dealCards(pulls) {
    $("stage").innerHTML = `<div>
      <div class="spread">${pulls.map((c, i) => {
        const r = RARITIES[c.rarity];
        return `<div>
          <button class="slot${r.shine ? " shine" : ""}" style="animation-delay:${i * 0.12}s" aria-label="Flip card ${i + 1}">
            <div class="flip"><div class="face back"></div><div class="face front">${cardHTML(c)}</div></div>
          </button>
          <div class="tag">${r.label}${save.owned[c.id] ? "" : " · New!"}</div></div>`;
      }).join("")}</div>
      <div class="actions"><button class="btn alt" id="flipAll">Flip all</button><button class="btn" id="again" hidden>Open another pack</button></div></div>`;

    const slots = [...document.querySelectorAll(".slot")];
    let left = slots.length;
    const flip = (slot) => {
      if (slot.classList.contains("open")) return;
      slot.classList.add("open");
      slot.nextElementSibling.style.opacity = 1;
      if (--left === 0) finishPack(pulls);
    };
    slots.forEach((slot) => {
      slot.onclick = () => flip(slot);
      slot.onpointermove = (e) => {           // moves the foil shine with the mouse
        const b = slot.getBoundingClientRect();
        slot.style.setProperty("--hx", ((e.clientX - b.left) / b.width) * 100 + "%");
        slot.style.setProperty("--hy", ((e.clientY - b.top) / b.height) * 100 + "%");
      };
    });
    $("flipAll").onclick = () => slots.forEach((s, i) => setTimeout(() => flip(s), i * 150));
  }

  function finishPack(pulls) {
    save.packs++;
    pulls.forEach((c) => {
      save.owned[c.id] = (save.owned[c.id] || 0) + 1;
      save.best = Math.max(save.best, rank(c.rarity));
    });
    store();
    renderBinder();
    $("flipAll").hidden = true;
    const again = $("again");
    again.hidden = false;
    again.focus();
    again.onclick = showPack;
  }

  // ---------- Binder ----------
  let filter = "All";
  function renderBinder() {
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
      return `<div class="mini${n ? "" : " missing"}${RARITIES[c.rarity]?.shine ? " shine" : ""}">
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

  renderBinder();
  showPack();
}
