// =====================================================================
//  extras.js — progress and extras: XP & levels, daily quests, login
//  streak, achievements, the card shop and auto-open.
//  Everything here listens to events from game.js (packs opened, cards
//  sold, wheel spins …) and is saved with the rest of your progress.
// =====================================================================
{
  const G = window.CardGame;
  const $ = (id) => document.getElementById(id);
  const { esc, RARITIES, RARITY_KEYS } = G;
  const P = typeof PROGRESS !== "undefined" ? PROGRESS : { xp: {}, xpPerPack: 5, xpPerLevel: 100, levelReward: 100 };
  const coinsOn = G.coinsOn;

  // ---------- Saved progress ----------
  const S = () => {
    const s = G.save;
    s.ex = s.ex || {};
    const ex = s.ex;
    ex.xp = ex.xp || 0;
    ex.level = ex.level || 1;
    ex.ach = ex.ach || {};
    ex.stats = ex.stats || {};
    ex.quests = ex.quests || { day: "", list: [] };
    ex.streak = ex.streak || { last: "", count: 0, claimed: "" };
    return ex;
  };
  const bump = (k, n = 1) => { const st = S().stats; st[k] = (st[k] || 0) + n; };
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const rankOf = (c) => G.rank(c.rarity);

  // ---------- XP & levels ----------
  const needFor = (lv) => (P.xpPerLevel || 100) * (lv * (lv - 1)) / 2;   // total XP to reach level lv
  function addXP(n) {
    const ex = S();
    ex.xp += n;
    while (ex.xp >= needFor(ex.level + 1)) {
      ex.level++;
      const reward = (P.levelReward || 0) * ex.level;
      if (coinsOn && reward) G.earn(reward);
      G.toast(`<b>Level ${ex.level}!</b>${coinsOn && reward ? ` +${G.fmt(reward)} coins` : ""}`, 4000);
      G.celebrate({ hype: 2, glow: "#ffcf33" });
    }
    paintLevel();
  }
  function paintLevel() {
    const ex = S(), lo = needFor(ex.level), hi = needFor(ex.level + 1);
    $("lvNum").textContent = `Lv ${ex.level}`;
    $("lvBar").style.width = Math.min(100, ((ex.xp - lo) / (hi - lo)) * 100) + "%";
    $("lvText").textContent = `${G.fmt(ex.xp - lo)} / ${G.fmt(hi - lo)} XP`;
  }

  // ---------- Daily quests ----------
  const QUESTS = [
    { id: "open5",   text: "Open 5 packs",                    goal: 5,  reward: 150 },
    { id: "rares",   text: "Pull 5 Rare or better cards",     goal: 5,  reward: 150 },
    { id: "epic",    text: "Pull an Epic or better",          goal: 1,  reward: 200 },
    { id: "legend",  text: "Pull a Legendary or better",      goal: 1,  reward: 600 },
    { id: "new3",    text: "Find 3 new cards",                goal: 3,  reward: 200 },
    { id: "sell10",  text: "Sell 10 cards",                   goal: 10, reward: 120, coins: true },
    { id: "spin",    text: "Spin the prize wheel",            goal: 1,  reward: 100, coins: true },
    { id: "box",     text: "Open a box of 10",                goal: 1,  reward: 300 },
    { id: "shop",    text: "Buy a card from the card shop",   goal: 1,  reward: 100, coins: true },
  ].filter((q) => coinsOn || !q.coins);
  function todaysQuests() {
    const ex = S(), today = dayKey();
    if (ex.quests.day !== today) {
      // pick 3 quests for today (the same 3 all day)
      let seed = [...today].reduce((t, ch) => t * 31 + ch.charCodeAt(0), 7) >>> 0;
      const pool = QUESTS.slice(), list = [];
      while (list.length < 3 && pool.length) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        list.push(pool.splice(seed % pool.length, 1)[0].id);
      }
      ex.quests = { day: today, list: list.map((id) => ({ id, prog: 0, claimed: false })) };
      G.store();
    }
    return ex.quests.list.map((q) => ({ ...QUESTS.find((d) => d.id === q.id), state: q })).filter((q) => q.id);
  }
  function progress(id, n = 1) {
    todaysQuests().forEach((q) => {
      if (q.id !== id || q.state.claimed) return;
      const before = q.state.prog;
      q.state.prog = Math.min(q.goal, q.state.prog + n);
      if (before < q.goal && q.state.prog >= q.goal) G.toast(`Quest complete: <b>${esc(q.text)}</b>. Claim it on the Rewards tab.`, 4000);
    });
  }
  function claimQuest(id) {
    const q = todaysQuests().find((x) => x.id === id);
    if (!q || q.state.claimed || q.state.prog < q.goal) return;
    q.state.claimed = true;
    if (coinsOn) G.earn(q.reward); else addXP(q.reward / 5);
    G.store(); paintRewards(); paintBadge();
  }

  // ---------- Login streak ----------
  function streak() {
    const st = S().streak, today = dayKey(), y = new Date(); y.setDate(y.getDate() - 1);
    if (st.last !== today) {
      st.count = st.last === dayKey(y) ? st.count + 1 : 1;
      st.last = today;
      G.store();
    }
    return st;
  }
  const streakReward = (n) => Math.min(n, 7) * 50;
  function claimStreak() {
    const st = streak();
    if (st.claimed === dayKey()) return;
    st.claimed = dayKey();
    if (coinsOn) G.earn(streakReward(st.count)); else addXP(streakReward(st.count) / 5);
    G.store(); paintRewards(); paintBadge();
  }

  // ---------- Achievements ----------
  const found = () => G.cards.filter((c) => G.save.owned[c.id]).length;
  const typeDone = () => {
    const types = [...new Set(G.cards.map((c) => c.type))];
    return types.some((t) => { const cs = G.cards.filter((c) => c.type === t); return cs.length >= 2 && cs.every((c) => G.save.owned[c.id]); });
  };
  const ACHS = [
    { id: "pack1",   name: "First rip",        desc: "Open your first pack",              reward: 50,   test: (s) => s.packs >= 1 },
    { id: "pack10",  name: "Getting started",  desc: "Open 10 packs",                     reward: 100,  test: (s) => s.packs >= 10 },
    { id: "pack100", name: "Pack rat",         desc: "Open 100 packs",                    reward: 500,  test: (s) => s.packs >= 100 },
    { id: "pack500", name: "Rip legend",       desc: "Open 500 packs",                    reward: 2000, test: (s) => s.packs >= 500 },
    { id: "epic",    name: "Ooh, shiny",       desc: "Pull an Epic or better",            reward: 100,  test: (s) => s.best >= 2 },
    { id: "legend",  name: "Legendary luck",   desc: "Pull a Legendary or better",        reward: 300,  test: (s) => s.best >= 3 },
    { id: "exotic",  name: "Out of this world", desc: "Pull an Exotic",                   reward: 1000, test: (s) => s.best >= 4 },
    { id: "half",    name: "Halfway there",    desc: "Find half of all the cards",        reward: 300,  test: () => found() >= Math.ceil(G.cards.length / 2) },
    { id: "full",    name: "Gotta have them all", desc: "Find every card",                reward: 2000, test: () => G.cards.length > 0 && found() >= G.cards.length },
    { id: "type",    name: "Type master",      desc: "Find every card of one type",       reward: 400,  test: () => typeDone() },
    { id: "lv10",    name: "Double digits",    desc: "Reach level 10",                    reward: 1000, test: (s, ex) => ex.level >= 10 },
    { id: "boxes",   name: "Box breaker",      desc: "Open 5 boxes of 10",                reward: 400,  test: (s, ex) => (ex.stats.boxes || 0) >= 5 },
    { id: "made",    name: "Card artist",      desc: "Make your first card",              reward: 100,  test: (s, ex) => (ex.stats.made || 0) >= 1 || G.myCards.length > 0 },
    { id: "built",   name: "Pack designer",    desc: "Build your first pack",             reward: 100,  test: (s, ex) => (ex.stats.built || 0) >= 1 || G.myPacks.length > 0 },
    { id: "sell100", name: "Shopkeeper",       desc: "Sell 100 cards",                    reward: 200,  coins: true, test: (s, ex) => (ex.stats.sold || 0) >= 100 },
    { id: "spin10",  name: "Round and round",  desc: "Spin the prize wheel 10 times",     reward: 300,  coins: true, test: (s, ex) => (ex.stats.spins || 0) >= 10 },
    { id: "jackpot", name: "JACKPOT",          desc: "Hit the top prize on the wheel",    reward: 1000, coins: true, test: (s, ex) => (ex.stats.jackpots || 0) >= 1 },
    { id: "buy5",    name: "Window shopper",   desc: "Buy 5 cards from the card shop",    reward: 200,  coins: true, test: (s, ex) => (ex.stats.bought || 0) >= 5 },
    { id: "rich",    name: "Dragon's hoard",   desc: "Have 100,000 coins at once",        reward: 500,  coins: true, test: (s) => (s.coins || 0) >= 100000 },
  ].filter((a) => coinsOn || !a.coins);
  let checking = false;
  function checkAch() {
    if (checking) return;
    checking = true;
    const ex = S(), s = G.save;
    ACHS.forEach((a) => {
      if (ex.ach[a.id] || !a.test(s, ex)) return;
      ex.ach[a.id] = Date.now();
      if (coinsOn) G.earn(a.reward); else addXP(a.reward / 5);
      G.toast(`<b>Achievement unlocked: ${esc(a.name)}</b><br>${esc(a.desc)}${coinsOn ? ` · +${G.fmt(a.reward)} coins` : ""}`, 4500);
    });
    G.store();
    checking = false;
  }

  // ---------- React to what happens in the game ----------
  G.on("pack", ({ pulls, isNew }) => {
    addXP((P.xpPerPack || 0) + pulls.reduce((t, c) => t + ((P.xp || {})[c.rarity] || 0), 0));
    progress("open5");
    progress("rares", pulls.filter((c) => rankOf(c) >= 1).length);
    if (pulls.some((c) => rankOf(c) >= 2)) progress("epic");
    if (pulls.some((c) => rankOf(c) >= 3)) progress("legend");
    progress("new3", isNew.filter(Boolean).length);
    after();
  });
  G.on("box", () => { bump("boxes"); progress("box"); after(); });
  G.on("sell", ({ n }) => { bump("sold", n); progress("sell10", n); after(); });
  G.on("spin", ({ jackpot }) => { bump("spins"); if (jackpot) bump("jackpots"); progress("spin"); after(); });
  G.on("buy", ({ isNew }) => { bump("bought"); progress("shop"); if (isNew) progress("new3"); after(); });
  G.on("makeCard", ({ n }) => { bump("made", n); after(); });
  G.on("buildPack", () => { bump("built"); after(); });
  function after() { checkAch(); G.store(); paintBadge(); if (!$("rewardsView").hidden) paintRewards(); if (!$("shopView").hidden) paintShop(); }

  // ---------- Rewards page ----------
  function paintRewards() {
    const ex = S(), st = streak(), lo = needFor(ex.level), hi = needFor(ex.level + 1);
    $("rwLevel").innerHTML = `<span class="rw-k">Your level</span><b class="rw-big">Level ${ex.level}</b>
      <span class="lvbar wide"><i style="width:${Math.min(100, ((ex.xp - lo) / (hi - lo)) * 100)}%"></i></span>
      <small class="muted">${G.fmt(ex.xp - lo)} / ${G.fmt(hi - lo)} XP to level ${ex.level + 1}${coinsOn ? ` · reward ${G.fmt((P.levelReward || 0) * (ex.level + 1))} coins` : ""}</small>
      <small class="muted">Earn XP from every pack. Rarer cards give more.</small>`;
    const claimed = st.claimed === dayKey();
    $("rwStreak").innerHTML = `<span class="rw-k">Daily streak</span><b class="rw-big">${st.count} day${st.count === 1 ? "" : "s"}</b>
      <div class="days">${Array.from({ length: 7 }, (_, i) => `<span class="${i < Math.min(st.count, 7) ? "on" : ""}">${i + 1}</span>`).join("")}</div>
      <button type="button" class="btn${claimed ? " alt" : ""}" id="claimStreak"${claimed ? " disabled" : ""}>${claimed ? "Come back tomorrow" : `Claim ${coinsOn ? G.coinTag(streakReward(st.count)) : streakReward(st.count) / 5 + " XP"}`}</button>
      <small class="muted">Visit every day to grow it. Up to ${coinsOn ? G.fmt(streakReward(7)) + " coins" : "70 XP"} at 7 days.</small>`;
    $("claimStreak").onclick = claimStreak;
    const mid = new Date(); mid.setHours(24, 0, 0, 0);
    const mins = Math.ceil((mid - Date.now()) / 60e3);
    $("questReset").textContent = `New in ${Math.floor(mins / 60)}h ${mins % 60}m`;
    $("quests").innerHTML = todaysQuests().map((q) => {
      const done = q.state.prog >= q.goal;
      return `<div class="quest${q.state.claimed ? " claimed" : done ? " done" : ""}">
        <div><b>${esc(q.text)}</b><span class="qbar"><i style="width:${(q.state.prog / q.goal) * 100}%"></i></span><small>${q.state.prog} / ${q.goal}</small></div>
        ${q.state.claimed ? `<span class="qok">Claimed ✓</span>`
          : `<button type="button" class="btn small${done ? "" : " alt"}" data-claim="${q.id}"${done ? "" : " disabled"}>${coinsOn ? G.coinTag(q.reward) : q.reward / 5 + " XP"}</button>`}</div>`;
    }).join("");
    const got = ACHS.filter((a) => ex.ach[a.id]).length;
    $("achSub").textContent = `${got} of ${ACHS.length} unlocked`;
    $("achs").innerHTML = ACHS.map((a) => `<div class="ach${ex.ach[a.id] ? " got" : ""}">
      <span class="ach-ic" aria-hidden="true">${ex.ach[a.id] ? "★" : "☆"}</span>
      <div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div>${coinsOn ? `<span class="ach-r">${G.coinTag(a.reward)}</span>` : ""}</div>`).join("");
  }
  $("quests").addEventListener("click", (e) => { const b = e.target.closest("[data-claim]"); if (b) claimQuest(b.dataset.claim); });
  function paintBadge() {
    const n = todaysQuests().filter((q) => !q.state.claimed && q.state.prog >= q.goal).length + (streak().claimed === dayKey() ? 0 : 1);
    const b = $("rewardBadge"); b.hidden = !n; b.textContent = n;
  }

  // ---------- Card shop ----------
  let shopFilter = "missing", shopQ = "";
  function paintShop() {
    const owned = G.save.owned;
    const f = [["missing", "Missing"], ["all", "All"], ...RARITY_KEYS.map((k) => [k, RARITIES[k].label])];
    $("shopFilters").innerHTML = f.map(([v, l]) => `<button class="chip" aria-pressed="${shopFilter === v}" data-sf="${v}">${esc(l)}</button>`).join("");
    const list = G.cards.filter((c) => (shopFilter === "all" || (shopFilter === "missing" ? !owned[c.id] : c.rarity === shopFilter))
      && (!shopQ || `${c.name} ${c.type}`.toLowerCase().includes(shopQ.toLowerCase())));
    $("shopGrid").innerHTML = list.length ? list.map((c) => {
      const n = owned[c.id] || 0, price = G.buyPrice(c);
      return `<div class="shop-item"><div class="mini${G.rarityOf(c).shine ? " shine" : ""}">${n ? `<span class="count">×${n}</span>` : ""}${G.cardHTML(c)}</div>
        <button type="button" class="btn small${coinsOn && G.save.coins < price ? " alt" : ""}" data-buy="${esc(c.id)}">Buy ${coinsOn ? G.coinTag(price) : ""}</button></div>`;
    }).join("") : `<p class="muted">${shopFilter === "missing" ? "You have every card. Nice!" : "No cards match."}</p>`;
  }
  $("shopFilters").addEventListener("click", (e) => { const b = e.target.closest("[data-sf]"); if (b) { shopFilter = b.dataset.sf; paintShop(); } });
  $("shopQ").addEventListener("input", (e) => { shopQ = e.target.value.trim(); paintShop(); });
  $("shopGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-buy]"); if (b && G.buyCard(G.byId(b.dataset.buy))) paintShop(); });

  // ---------- Auto-open ----------
  let auto = null;
  function openAuto() {
    const packs = G.allPacks;
    if (!packs.length) { G.toast("Build a pack first, then auto-open it."); return; }
    const cur = Math.max(0, packs.indexOf(G.lastPack));
    $("autoBody").innerHTML = `
      <div class="auto-set">
        <label class="field">Pack<select id="autoPack">${packs.map((p, i) => `<option value="${i}"${i === cur ? " selected" : ""}>${esc(p.name)}${coinsOn ? ` (${G.fmt(G.priceOf(p))} coins)` : ""}</option>`).join("")}</select></label>
        <label class="field">How many<select id="autoN"><option>10</option><option selected>25</option><option>50</option><option>100</option><option value="0">Until I stop</option></select></label>
        <label class="field">Stop when I pull<select id="autoStop"><option value="">Don't stop</option>${RARITY_KEYS.slice(2).map((k) => `<option value="${k}">${esc(RARITIES[k].label)} or better</option>`).join("")}</select></label>
      </div>
      <div class="actions"><button type="button" class="btn" id="autoGo">Start</button></div>
      <div id="autoLive"></div>`;
    $("autoGo").onclick = startAuto;
    const d = $("autoDlg"); if (!d.open) d.showModal();
  }
  function startAuto() {
    if (auto) { stopAuto("Stopped."); return; }
    const pack = G.allPacks[+$("autoPack").value], goal = +$("autoN").value, stopAt = $("autoStop").value;
    G.lastPack = pack;
    auto = { pack, goal, stopAt, n: 0, spent: 0, cards: [], fresh: 0 };
    $("autoGo").textContent = "Stop";
    ["autoPack", "autoN", "autoStop"].forEach((id) => ($(id).disabled = true));
    auto.timer = setInterval(() => {
      if (!auto) return;
      const price = G.priceOf(pack);
      if (coinsOn && G.save.coins < price) { stopAuto("Out of coins."); return; }
      if (!G.spend(price)) { stopAuto("Out of coins."); return; }
      auto.spent += price;
      const { pulls, isNew } = G.rollPack(pack);
      auto.n++; auto.cards.push(...pulls); auto.fresh += isNew.filter(Boolean).length;
      const top = pulls.reduce((b, c) => (G.rank(c.rarity) > G.rank(b.rarity) ? c : b), pulls[0]);
      if (top && G.rank(top.rarity) >= 3) { G.celebrate({ hype: 1, glow: "#fff" }); }
      paintAuto();
      if (stopAt && pulls.some((c) => G.rank(c.rarity) >= G.rank(stopAt))) stopAuto(`Got ${esc(G.rarityOf(top).label)}: ${esc(top.name)}!`);
      else if (goal && auto.n >= goal) stopAuto("Done!");
    }, 220);
  }
  function stopAuto(msg) {
    if (!auto) return;
    clearInterval(auto.timer);
    paintAuto(msg);
    auto = null;
    G.store(); G.renderBinder();
    $("autoGo").textContent = "Start again";
    ["autoPack", "autoN", "autoStop"].forEach((id) => ($(id).disabled = false));
  }
  function paintAuto(msg = "") {
    const a = auto; if (!a) return;
    const counts = RARITY_KEYS.map((k) => [RARITIES[k], a.cards.filter((c) => c.rarity === k).length]);
    const hits = a.cards.filter((c) => G.rank(c.rarity) >= 2).sort((x, y) => G.rank(y.rarity) - G.rank(x.rarity)).slice(0, 18);
    const value = a.cards.reduce((t, c) => t + G.sellValue(c), 0);
    $("autoLive").innerHTML = `${msg ? `<p class="auto-msg">${msg}</p>` : ""}
      <p class="box-sum"><b>${a.n} pack${a.n === 1 ? "" : "s"}</b> · ${a.cards.length} cards · ${a.fresh} new${coinsOn ? ` · spent ${G.fmt(a.spent)} · worth ${G.fmt(value)} if sold` : ""}</p>
      <div class="rar-row">${counts.map(([r, k]) => `<span class="rar-chip" style="--glow:${esc(r.glow || "#8e9ab0")}"><i></i>${esc(r.label)} <b>${k}</b></span>`).join("")}</div>
      ${hits.length ? `<div class="hit-grid in-dlg">${hits.map((c) => `<div class="hit${G.rarityOf(c).shine ? " shine" : ""}"><div class="hit-card">${G.cardHTML(c)}</div></div>`).join("")}</div>` : ""}`;
  }
  $("autoBtn").onclick = openAuto;
  $("autoDlg").addEventListener("close", () => { if (auto) stopAuto("Stopped."); });

  // ---------- Start up ----------
  streak(); todaysQuests(); paintLevel(); paintBadge(); checkAch();
  setInterval(() => { todaysQuests(); paintBadge(); if (!$("rewardsView").hidden) paintRewards(); }, 60e3);
  window.CardExtras = { paint(view) { if (view === "shop") paintShop(); if (view === "rewards") paintRewards(); } };
}
