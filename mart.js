// =====================================================================
//  mart.js — the Trading mart.
//  1. Trader stalls: computer traders with deals that change every few hours.
//  2. Trade-up machine: 5 spare cards of one rarity → 1 random card of the next.
//  3. Trade with a friend: offers and replies are passed around as codes.
//     (The site has no server, so codes are how two browsers trade.)
// =====================================================================
{
  const G = window.CardGame;
  const $ = (id) => document.getElementById(id);
  const { esc, RARITIES, RARITY_KEYS } = G;
  const coinsOn = G.coinsOn;
  const HOURS = 4;                       // trader deals change every 4 hours
  const REFRESH_COST = 50;               // coins to restock the traders early
  const TRADE_UP = 5;                    // spare cards needed for one trade-up

  const M = () => {
    const s = G.save;
    s.mart = s.mart || {};
    s.mart.pending = s.mart.pending || {};      // my friend offers waiting for a reply: id → { give, want, t }
    s.mart.done = s.mart.done || {};            // offer ids I have already accepted or completed
    return s.mart;
  };
  const owned = (id) => G.save.owned[id] || 0;
  const spare = (c) => Math.max(0, owned(c.id) - 1);
  const builtIn = () => G.cards.filter((c) => !c.custom);
  const take = (id, n = 1) => { G.save.owned[id] = owned(id) - n; if (G.save.owned[id] <= 0) delete G.save.owned[id]; };
  const give = (id, n = 1) => {
    const c = G.byId(id);
    G.save.owned[id] = owned(id) + n;
    if (c) G.save.best = Math.max(G.save.best, G.rank(c.rarity));
  };
  const done = (msg) => { G.store(); G.renderBinder(); G.emit("trade", {}); G.toast(msg, 4000); paint(); };
  const miniCard = (c, extra = "") => `<div class="mini${G.rarityOf(c).shine ? " shine" : ""}" data-id="${esc(c.id)}">${extra}${G.cardHTML(c)}</div>`;

  // ---------- Random numbers that stay the same for a whole trading window ----------
  const rng = (seed) => () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const windowNow = () => Math.floor(Date.now() / (HOURS * 3600e3));

  // =================== 1. Trader stalls ===================
  const TRADERS = [
    { name: "Old Bram",    line: "Fair deals, mostly.",            color: "#ff8a3d" },
    { name: "Captain Ysa", line: "Fresh off the boat.",            color: "#2f8fd1" },
    { name: "Moss & Moth", line: "We collect the commons nobody wants.", color: "#14a06b" },
    { name: "The Collector", line: "Only the shiny ones interest me.", color: "#b35cff" },
  ];
  function makeOffers(seedExtra = 0) {
    const r = rng(windowNow() * 7919 + seedExtra * 104729 + 17), cards = G.cards;
    if (!cards.length) return [];
    const missing = cards.filter((c) => !owned(c.id));
    return TRADERS.map((t, i) => {
      // what they give: often something you're missing; The Collector deals in rarer cards
      const pool = i === 3 ? cards.filter((c) => G.rank(c.rarity) >= 2) : (missing.length && r() < 0.7 ? missing : cards);
      const list = (pool.length ? pool : cards).filter((c) => G.rank(c.rarity) <= 4 || r() < 0.05);
      const gift = list[Math.floor(r() * list.length)] || cards[0];
      const worth = Math.max(4, G.sellValue(gift) * (1.6 + r() * 0.8));
      // what they want: some of your spare cards worth about that much, or coins
      const spares = cards.filter((c) => spare(c) > 0 && c.id !== gift.id).sort(() => r() - 0.5);
      const want = [];
      let total = 0;
      for (const c of spares) {
        if (total >= worth || want.length >= 4) break;
        const n = Math.min(spare(c), Math.ceil((worth - total) / Math.max(1, G.sellValue(c))), 3);
        if (n > 0) { want.push({ id: c.id, n }); total += n * G.sellValue(c); }
      }
      const useCoins = !want.length || total < worth * 0.8 || (i === 1 && r() < 0.5);
      return useCoins && coinsOn
        ? { trader: i, gift: gift.id, coins: Math.round((G.buyPrice(gift) * (0.55 + r() * 0.2)) / 5) * 5 || 5, taken: false }
        : { trader: i, gift: gift.id, want: want.length ? want : [{ id: (spares[0] || cards[0]).id, n: 1 }], taken: false };
    });
  }
  function offers() {
    const m = M();
    if (m.window !== windowNow() || !Array.isArray(m.offers)) { m.window = windowNow(); m.extra = 0; m.offers = makeOffers(); G.store(); }
    return m.offers;
  }
  const canAfford = (o) => (o.coins != null ? (G.save.coins || 0) >= o.coins : o.want.every((w) => owned(w.id) >= w.n));
  function acceptOffer(i) {
    const o = offers()[i]; if (!o || o.taken) return;
    const gift = G.byId(o.gift); if (!gift) return;
    if (o.coins != null) { if (!G.spend(o.coins)) return; }
    else {
      if (!o.want.every((w) => owned(w.id) >= w.n)) { G.toast("You don't have the cards this trader wants."); return; }
      o.want.forEach((w) => take(w.id, w.n));
    }
    const isNew = !owned(gift.id);
    give(gift.id); o.taken = true;
    done(`Traded with ${esc(TRADERS[o.trader].name)}: you got <b>${esc(gift.name)}</b>${isNew ? " · New!" : ""}`);
  }
  function restock() {
    if (!G.spend(REFRESH_COST)) return;
    const m = M(); m.extra = (m.extra || 0) + 1; m.offers = makeOffers(m.extra); G.store(); paint();
  }

  // =================== 2. Trade-up machine ===================
  let upRarity = RARITY_KEYS[0];
  function tradeUp() {
    const ri = G.rank(upRarity), next = RARITY_KEYS[ri + 1];
    const targets = G.cards.filter((c) => c.rarity === next);
    if (!next || !targets.length) { G.toast("There's nothing to trade up into from here."); return; }
    const spares = G.cards.filter((c) => c.rarity === upRarity && spare(c) > 0).sort((a, b) => spare(b) - spare(a));
    if (spares.reduce((t, c) => t + spare(c), 0) < TRADE_UP) { G.toast(`You need ${TRADE_UP} spare ${esc(RARITIES[upRarity].label)} cards.`); return; }
    let left = TRADE_UP;
    while (left > 0) { const c = spares.find((x) => spare(x) > 0); take(c.id); left--; spares.sort((a, b) => spare(b) - spare(a)); }
    const got = targets[Math.floor(Math.random() * targets.length)], isNew = !owned(got.id);
    give(got.id);
    G.celebrate(G.rarityOf(got));
    done(`Trade-up complete: <b>${esc(got.name)}</b> (${esc(G.rarityOf(got).label)})${isNew ? " · New!" : ""}`);
    G.inspect(got.id);
  }

  // =================== 3. Trade with a friend (codes) ===================
  const PREFIX = "TRADE-";
  const enc = (o) => PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  function dec(code) {
    try {
      const s = code.trim().replace(/\s+/g, "");
      if (!s.startsWith(PREFIX)) return null;
      let b = s.slice(PREFIX.length).replace(/-/g, "+").replace(/_/g, "/"); while (b.length % 4) b += "=";
      return JSON.parse(decodeURIComponent(escape(atob(b))));
    } catch (e) { return null; }
  }
  // Cards are sent by their number in the set plus their name, so both sides agree
  const ref = (c, n) => ({ i: c.id, name: c.name, n });
  const resolve = (list) => (list || []).map((x) => ({ c: G.byId(x.i), n: x.n, name: x.name })).filter((x) => x.c && x.c.name === x.name && !x.c.custom);
  const sameSet = (o) => o && o.set === SET.name;

  let draft = { give: {}, want: {} }, side = "give", q = "";
  function makeCode() {
    const giveL = Object.entries(draft.give).filter(([, n]) => n > 0), wantL = Object.entries(draft.want).filter(([, n]) => n > 0);
    if (!giveL.length && !wantL.length) { G.toast("Pick at least one card to give or to get."); return; }
    for (const [id, n] of giveL) if (owned(id) < n) { G.toast("You don't have enough of a card you're giving."); return; }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const offer = { t: "offer", v: 1, set: SET.name, id, give: giveL.map(([i, n]) => ref(G.byId(i), n)), want: wantL.map(([i, n]) => ref(G.byId(i), n)) };
    giveL.forEach(([i, n]) => take(i, n));           // held until the trade finishes or you cancel
    M().pending[id] = { give: offer.give, want: offer.want, t: Date.now() };
    G.store(); G.renderBinder();
    draft = { give: {}, want: {} };
    showCode(enc(offer), "Send this code to your friend. Your cards are held until they reply or you cancel.");
    paint();
  }
  function showCode(code, note) {
    $("tradeOut").hidden = false;
    $("tradeOut").innerHTML = `<p>${note}</p><textarea readonly rows="3" id="codeBox">${esc(code)}</textarea>
      <div class="actions"><button type="button" class="btn small" id="copyCode">Copy code</button></div>`;
    $("copyCode").onclick = async () => {
      try { await navigator.clipboard.writeText(code); G.toast("Code copied!"); } catch (e) { $("codeBox").select(); G.toast("Select the code and copy it."); }
    };
  }
  function readCode() {
    const o = dec($("codeIn").value), box = $("codeResult");
    if (!o) { box.innerHTML = `<p class="bad">That doesn't look like a trade code.</p>`; return; }
    if (!sameSet(o)) { box.innerHTML = `<p class="bad">That code is for a different card set (${esc(o.set || "?")}).</p>`; return; }
    const m = M();
    if (o.t === "offer") {
      if (m.pending[o.id]) { box.innerHTML = `<p class="bad">That's your own offer. Send it to a friend instead.</p>`; return; }
      if (m.done[o.id]) { box.innerHTML = `<p class="bad">You've already accepted this offer.</p>`; return; }
      const theyGive = resolve(o.give), theyWant = resolve(o.want);
      const ok = theyWant.every((x) => owned(x.c.id) >= x.n);
      box.innerHTML = `<div class="trade-view">
          <div><h4>You get</h4><div class="trade-cards">${theyGive.map((x) => miniCard(x.c, `<span class="count">×${x.n}</span>`)).join("") || "<p class='muted'>Nothing</p>"}</div></div>
          <div><h4>You give</h4><div class="trade-cards">${theyWant.map((x) => miniCard(x.c, `<span class="count${owned(x.c.id) < x.n ? " lack" : ""}">×${x.n}</span>`)).join("") || "<p class='muted'>Nothing</p>"}</div></div>
        </div>
        ${ok ? `<div class="actions"><button type="button" class="btn" id="acceptTrade">Accept trade</button></div>`
          : `<p class="bad">You don't have all the cards they want.</p>`}`;
      if (ok) $("acceptTrade").onclick = () => {
        theyWant.forEach((x) => take(x.c.id, x.n));
        theyGive.forEach((x) => give(x.c.id, x.n));
        m.done[o.id] = Date.now();
        box.innerHTML = "";
        $("codeIn").value = "";
        showCode(enc({ t: "reply", v: 1, set: SET.name, id: o.id }), "Trade accepted! Send this reply code back so your friend gets their cards.");
        done("Trade complete! Check your collection.");
      };
    } else if (o.t === "reply") {
      const p = m.pending[o.id];
      if (!p) { box.innerHTML = `<p class="bad">${m.done[o.id] ? "This trade is already finished." : "That reply isn't for an offer from this browser."}</p>`; return; }
      resolve(p.want).forEach((x) => give(x.c.id, x.n));
      delete m.pending[o.id]; m.done[o.id] = Date.now();
      $("codeIn").value = ""; box.innerHTML = "";
      done("Your friend accepted! Their cards are in your collection.");
    } else box.innerHTML = `<p class="bad">Unknown code.</p>`;
  }
  function cancelOffer(id) {
    const p = M().pending[id]; if (!p) return;
    resolve(p.give).forEach((x) => give(x.c.id, x.n));
    delete M().pending[id];
    G.store(); G.renderBinder(); G.toast("Offer cancelled. Your cards are back."); paint();
  }

  // =================== Drawing the page ===================
  function paint() {
    if ($("martView").hidden) return;
    paintStalls(); paintTradeUp(); paintFriend();
  }
  function paintStalls() {
    const list = offers(), left = (windowNow() + 1) * HOURS * 3600e3 - Date.now();
    const mins = Math.ceil(left / 60e3);
    $("stallTimer").textContent = `New deals in ${Math.floor(mins / 60)}h ${mins % 60}m`;
    $("restock").innerHTML = coinsOn ? `Restock now · ${G.coinTag(REFRESH_COST)}` : "Restock now";
    $("stalls").innerHTML = list.map((o, i) => {
      const t = TRADERS[o.trader], gift = G.byId(o.gift);
      if (!gift) return "";
      const ok = !o.taken && canAfford(o);
      const want = o.coins != null ? `<div class="price-big">${G.coinTag(o.coins)}<small>shop price ${G.fmt(G.buyPrice(gift))}</small></div>`
        : `<div class="want-cards">${o.want.map((w) => { const c = G.byId(w.id); return c ? `<div class="want${owned(w.id) < w.n ? " lack" : ""}">${miniCard(c, `<span class="count">×${w.n}</span>`)}<small>you have ${owned(w.id)}</small></div>` : ""; }).join("")}</div>`;
      return `<article class="stall${o.taken ? " taken" : ""}" style="--tc:${t.color}">
        <header><span class="avatar" aria-hidden="true">${esc(t.name.replace(/^The /, "")[0])}</span><div><b>${esc(t.name)}</b><small>${esc(t.line)}</small></div></header>
        <div class="deal"><div class="deal-side"><span class="lbl">They give</span>${miniCard(gift, owned(gift.id) ? "" : '<span class="newpill">You need this</span>')}</div>
          <span class="arrow" aria-hidden="true">⇄</span>
          <div class="deal-side"><span class="lbl">They want</span>${want}</div></div>
        <button type="button" class="btn${ok ? "" : " alt"}" data-deal="${i}"${o.taken || !ok ? " disabled" : ""}>${o.taken ? "Traded ✓" : ok ? "Make the trade" : "You can't afford this yet"}</button>
      </article>`;
    }).join("");
  }
  function paintTradeUp() {
    $("upTabs").innerHTML = RARITY_KEYS.slice(0, -1).map((k) =>
      `<button type="button" role="radio" data-up="${k}" aria-checked="${upRarity === k}">${esc(RARITIES[k].label)}</button>`).join("");
    const next = RARITY_KEYS[G.rank(upRarity) + 1];
    const spares = G.cards.filter((c) => c.rarity === upRarity && spare(c) > 0);
    const have = spares.reduce((t, c) => t + spare(c), 0);
    $("upInfo").innerHTML = `<p>Put in <b>${TRADE_UP} spare ${esc(RARITIES[upRarity].label)}</b> cards and get <b>1 random ${esc(RARITIES[next].label)}</b>. Only extra copies are used, so you never lose your last one.</p>
      <div class="up-meter"><span style="width:${Math.min(100, (have / TRADE_UP) * 100)}%"></span></div>
      <p class="muted">You have ${have} spare ${esc(RARITIES[upRarity].label)} card${have === 1 ? "" : "s"}${have >= TRADE_UP ? ` · enough for ${Math.floor(have / TRADE_UP)} trade-up${have >= TRADE_UP * 2 ? "s" : ""}` : ""}.</p>`;
    $("tradeUpBtn").disabled = have < TRADE_UP || !G.cards.some((c) => c.rarity === next);
    $("tradeUpBtn").textContent = `Trade up to ${RARITIES[next].label}`;
  }
  function paintFriend() {
    const m = M();
    const cards = builtIn().filter((c) => (side === "give" ? owned(c.id) > 0 : true)
      && (!q || `${c.name} ${c.type} ${G.rarityOf(c).label}`.toLowerCase().includes(q.toLowerCase())));
    document.querySelectorAll("[data-side]").forEach((b) => b.setAttribute("aria-checked", b.dataset.side === side));
    const pick = draft[side];
    $("tradePick").innerHTML = cards.length ? cards.map((c) => {
      const n = pick[c.id] || 0, max = side === "give" ? owned(c.id) : 9;
      return `<div class="tp${n ? " on" : ""}">${miniCard(c, side === "give" ? `<span class="count">×${owned(c.id)}</span>` : "")}
        <div class="stepper"><button type="button" data-step="-1" data-c="${esc(c.id)}" aria-label="Less"${n ? "" : " disabled"}>−</button><b>${n}</b>
        <button type="button" data-step="1" data-c="${esc(c.id)}" aria-label="More"${n >= max ? " disabled" : ""}>+</button></div></div>`;
    }).join("") : `<p class="muted">${side === "give" ? "You don't own any set cards to trade yet." : "No cards match."}</p>`;
    const sum = (o) => Object.entries(o).filter(([, n]) => n > 0).map(([id, n]) => `${n}× ${esc(G.byId(id)?.name || "?")}`).join(", ") || "nothing yet";
    $("tradeSum").innerHTML = `<div><span class="lbl">You give</span> ${sum(draft.give)}</div><div><span class="lbl">You want</span> ${sum(draft.want)}</div>`;
    const pend = Object.entries(m.pending);
    $("pending").innerHTML = pend.length ? `<h4>Waiting for a reply</h4>` + pend.map(([id, p]) =>
      `<div class="pend"><div>Giving ${resolve(p.give).map((x) => `${x.n}× ${esc(x.c.name)}`).join(", ") || "nothing"} · wanting ${resolve(p.want).map((x) => `${x.n}× ${esc(x.c.name)}`).join(", ") || "nothing"}</div>
        <button type="button" class="btn small alt" data-cancel="${esc(id)}">Cancel</button></div>`).join("") : "";
  }

  // ---------- Events ----------
  $("stalls").addEventListener("click", (e) => { const b = e.target.closest("[data-deal]"); if (b) acceptOffer(+b.dataset.deal); });
  $("restock").onclick = restock;
  $("upTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-up]"); if (b) { upRarity = b.dataset.up; paintTradeUp(); } });
  $("tradeUpBtn").onclick = tradeUp;
  document.querySelectorAll("[data-side]").forEach((b) => (b.onclick = () => { side = b.dataset.side; paintFriend(); }));
  $("tradeQ").addEventListener("input", (e) => { q = e.target.value.trim(); paintFriend(); });
  $("tradePick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-step]"); if (!b) return;
    const id = b.dataset.c, pick = draft[side], max = side === "give" ? owned(id) : 9;
    pick[id] = Math.max(0, Math.min(max, (pick[id] || 0) + +b.dataset.step));
    paintFriend();
  });
  $("makeCode").onclick = makeCode;
  $("readCode").onclick = readCode;
  $("pending").addEventListener("click", (e) => { const b = e.target.closest("[data-cancel]"); if (b) cancelOffer(b.dataset.cancel); });
  setInterval(() => { if (!$("martView").hidden) paintStalls(); }, 60e3);

  window.CardMart = { paint };
}
