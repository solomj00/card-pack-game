// =====================================================================
//  builder.js — the "Build a pack" workshop.
//  Players design a pack (wrapper + what's inside), then open it or save it.
//  Saved packs live in this browser and show up in the pack picker.
// =====================================================================
{
  const G = window.CardGame;
  const $ = (id) => document.getElementById(id);
  const { esc, RARITIES, RARITY_KEYS, TYPES } = G;

  // ---------- Options ----------
  const PALETTES = [
    ["#ff4f6d", "#ffc929"], ["#3a7bff", "#7af6ff"], ["#1b1214", "#ffd84a"], ["#7d4cff", "#ff6ad5"],
    ["#14a06b", "#d8ff5c"], ["#ff8a3d", "#ff3d6e"], ["#e9e4dc", "#9aa4b5"], ["#00b3c7", "#ffe36b"],
  ];
  const PATTERNS = [["crimp", "Classic"], ["stripes", "Stripes"], ["dots", "Dots"], ["zigzag", "Zigzag"], ["rays", "Burst"], ["waves", "Waves"], ["plain", "Plain"]];
  const FINISHES = [["matte", "Matte"], ["glossy", "Glossy"], ["holo", "Holo foil"]];
  const COVERS = [["auto", "Surprise"], ["card", "Pick a card"], ["upload", "Upload"], ["none", "No art"]];
  const LUCK = [[1, "Normal"], [2, "Lucky ×2"], [4, "Super lucky ×4"]];
  const ART_SIZES = [["window", "In a window"], ["whole", "Covers the whole pack"]];
  const POOLS = [["all", "Every card"], ["types", "By type"], ["pick", "Pick cards"]];

  const fresh = () => ({
    id: null, name: "MY PACK", color: "#ff4f6d", color2: "#ffc929", pattern: "stripes", finish: "glossy",
    coverMode: "auto", coverCard: null, coverImg: "", artSize: "window", showName: true, count: 5,
    guarantee: RARITY_KEYS[1] || "", luck: 1, types: [], poolMode: "all", cards: [],
  });
  let pickQ = "", pickR = "";
  let s = fresh();

  // ---------- Turn the form state into a pack ----------
  function toPack(st = s) {
    const n = Math.max(1, Math.min(10, +st.count || 5));
    const slots = Array.from({ length: n }, () => ({ min: RARITY_KEYS[0] }));
    if (st.guarantee) slots[n - 1] = { min: st.guarantee };
    const bits = [`${n} card${n === 1 ? "" : "s"}`];
    if (st.guarantee) bits.push(`1 ${RARITIES[st.guarantee].label.toLowerCase()} or better`);
    if (st.luck > 1) bits.push(`${st.luck}× luck`);
    const picked = st.poolMode === "pick" ? st.cards.filter((id) => G.byId(id)) : [];
    if (st.poolMode === "pick" && picked.length) bits.push(`${picked.length} picked card${picked.length === 1 ? "" : "s"}`);
    if (st.poolMode === "types" && st.types.length) bits.push(st.types.join(", "));
    return {
      mine: true, id: st.id, name: (st.name || "MY PACK").trim().toUpperCase(),
      color: st.color, color2: st.color2, pattern: st.pattern, finish: st.finish,
      coverMode: st.coverMode,
      coverCard: st.coverMode === "card" ? st.coverCard : null,
      coverImg: st.coverMode === "upload" ? st.coverImg : "",
      artSize: st.coverMode === "none" ? "window" : st.artSize, showName: st.showName,
      types: st.poolMode === "types" && st.types.length ? st.types.slice() : undefined,
      cards: picked.length ? picked.map(String) : undefined,
      luck: st.luck, slots, about: bits.join(" · "),
    };
  }
  const fromPack = (p) => ({
    id: p.id, name: p.name, color: p.color, color2: p.color2 || p.color, pattern: p.pattern || "crimp",
    finish: p.finish || "matte", coverMode: p.coverMode || (p.coverImg ? "upload" : p.coverCard != null ? "card" : "auto"),
    coverCard: p.coverCard ?? null, coverImg: p.coverImg || "", artSize: p.artSize || "window", showName: p.showName !== false, count: p.slots.length,
    guarantee: (p.slots.find((x) => G.rank(x.min) >= 1) || {}).min || "", luck: p.luck || 1, types: p.types || [],
    poolMode: p.cards && p.cards.length ? "pick" : p.types && p.types.length ? "types" : "all", cards: (p.cards || []).map(String),
  });

  // ---------- Odds: chance of at least one card of each rarity ----------
  function odds(pack) {
    // Uses the cards this pack can really give, so missing rarities are counted correctly
    const has = new Set(G.poolFor(pack).map((c) => G.rank(c.rarity)));
    return RARITY_KEYS.slice(1).map((k) => {
      const r = G.rank(k);
      let none = 1;
      for (const slot of pack.slots) {
        const opts = RARITY_KEYS.slice(Math.max(0, G.rank(slot.min)));
        const total = opts.reduce((t, x) => t + G.weightOf(x, pack.luck), 0);
        const hit = opts.filter((x) => G.resolveRank(G.rank(x), slot.min, has) >= r).reduce((t, x) => t + G.weightOf(x, pack.luck), 0);
        none *= 1 - hit / total;
      }
      return [RARITIES[k], 1 - none];
    });
  }
  const pct = (p) => (p >= 0.995 ? "100%" : p < 0.001 ? "<0.1%" : p < 0.1 ? (p * 100).toFixed(1) + "%" : Math.round(p * 100) + "%");

  // ---------- Draw ----------
  function paintPreview() {
    const pack = toPack();
    $("wsPreview").innerHTML = `<div class="pack big-pack" ${G.packAttrs(pack)}>${G.packFace(pack)}</div>`;
    $("wsOdds").innerHTML = `<div class="odds-title">Chance per pack</div>` + odds(pack).map(([r, p]) =>
      `<div class="odd"><span>${esc(r.label)} or better</span><span class="bar"><i style="width:${Math.max(2, p * 100)}%;background:${esc(r.glow || "#fff")}"></i></span><b>${pct(p)}</b></div>`).join("");
  }

  const chip = (group, val, label, on) =>
    `<button type="button" class="chip" role="radio" aria-checked="${on}" data-g="${group}" data-v="${esc(val)}">${esc(label)}</button>`;

  function paintControls() {
    $("wsName").value = s.name;
    $("wsC1").value = s.color; $("wsC2").value = s.color2;
    $("wsSwatches").innerHTML = PALETTES.map(([a, b], i) =>
      `<button type="button" class="swatch" data-i="${i}" aria-label="Colours ${i + 1}" aria-pressed="${s.color === a && s.color2 === b}" style="background:linear-gradient(135deg,${a} 50%,${b} 50%)"></button>`).join("");
    $("wsPattern").innerHTML = PATTERNS.map(([v, l]) => chip("pattern", v, l, s.pattern === v)).join("");
    $("wsFinish").innerHTML = FINISHES.map(([v, l]) => chip("finish", v, l, s.finish === v)).join("");
    $("wsCoverMode").innerHTML = COVERS.map(([v, l]) => chip("coverMode", v, l, s.coverMode === v)).join("");
    $("wsLuck").innerHTML = LUCK.map(([v, l]) => chip("luck", v, l, s.luck === v)).join("");
    $("wsPoolMode").innerHTML = POOLS.map(([v, l]) => chip("poolMode", v, l, s.poolMode === v)).join("");
    $("wsTypesF").hidden = s.poolMode !== "types";
    $("wsPickF").hidden = s.poolMode !== "pick";
    $("wsPickR").innerHTML = `<option value="">All rarities</option>` + RARITY_KEYS.map((k) =>
      `<option value="${k}"${pickR === k ? " selected" : ""}>${esc(RARITIES[k].label)}</option>`).join("");
    paintPick();
    const CARDS = G.cards;
    const types = Object.keys(TYPES).filter((t) => CARDS.some((c) => c.type === t));
    $("wsTypes").innerHTML = types.map((t) =>
      `<button type="button" class="chip" aria-pressed="${s.types.includes(t)}" data-type="${esc(t)}">${esc(t)}</button>`).join("");
    $("wsThumbs").hidden = s.coverMode !== "card";
    $("wsThumbs").innerHTML = CARDS.map((c) =>
      `<button type="button" class="thumb" data-card="${c.id}" aria-pressed="${String(s.coverCard) === String(c.id)}" aria-label="${esc(c.name)}"><img src="${esc(c.image)}" alt="" onerror="this.remove()"><span>${esc(c.name)}</span></button>`).join("");
    $("wsUploadL").hidden = s.coverMode !== "upload";
    $("wsArtSizeF").hidden = s.coverMode === "none";
    $("wsArtSize").innerHTML = ART_SIZES.map(([v, l]) => chip("artSize", v, l, s.artSize === v)).join("");
    $("wsShowName").checked = s.showName;
    $("wsCount").value = s.count; $("wsCountOut").textContent = s.count;
    $("wsGuar").innerHTML = `<option value="">No guarantee</option>` + RARITY_KEYS.slice(1).map((k) =>
      `<option value="${k}"${s.guarantee === k ? " selected" : ""}>${esc(RARITIES[k].label)} or better</option>`).join("");
    $("wsTitle").textContent = s.id ? "Edit your pack" : "Build your pack";
    $("wsSave").textContent = s.id ? "Save changes" : "Save to my packs";
    $("wsDelete").hidden = !s.id;
    paintPreview();
  }

  // ---------- Pick cards ----------
  const shownCards = () => G.cards.filter((c) =>
    (!pickR || c.rarity === pickR) && (!pickQ || `${c.name} ${c.type}`.toLowerCase().includes(pickQ.toLowerCase())));
  function paintPick() {
    if (s.poolMode !== "pick") return;
    const chosen = new Set(s.cards.map(String)), list = shownCards();
    $("wsPick").innerHTML = list.length ? list.map((c) =>
      `<button type="button" class="pk" data-pick="${esc(c.id)}" aria-pressed="${chosen.has(String(c.id))}" aria-label="${esc(c.name)}, ${esc(RARITIES[c.rarity].label)}">
        <div class="mini">${G.cardHTML(c)}</div><span class="pk-check" aria-hidden="true">✓</span></button>`).join("")
      : `<p class="muted">No cards match.</p>`;
    paintPickSum();
  }
  function paintPickSum() {
    const chosen = new Set(s.cards.map(String));
    const picked = G.cards.filter((c) => chosen.has(String(c.id)));
    const byR = RARITY_KEYS.map((k) => [RARITIES[k].label, picked.filter((c) => c.rarity === k).length]).filter(([, n]) => n);
    $("wsPickSum").innerHTML = picked.length
      ? `<b>${picked.length} card${picked.length === 1 ? "" : "s"} picked</b> · ${byR.map(([l, n]) => `${n} ${esc(l)}`).join(" · ")}`
      : "Tap cards to put them in this pack.";
  }
  $("wsPickQ").addEventListener("input", (e) => { pickQ = e.target.value.trim(); paintPick(); });
  $("wsPickR").addEventListener("change", (e) => { pickR = e.target.value; paintPick(); });
  $("wsPickAll").onclick = () => { const ids = new Set(s.cards.map(String)); shownCards().forEach((c) => ids.add(String(c.id))); s.cards = [...ids]; paintPick(); paintPreview(); };
  $("wsPickNone").onclick = () => { const out = new Set(shownCards().map((c) => String(c.id))); s.cards = s.cards.filter((id) => !out.has(String(id))); paintPick(); paintPreview(); };

  function paintMine() {
    const list = G.myPacks;
    $("wsMineWrap").hidden = !list.length;
    $("wsMine").innerHTML = list.map((p) =>
      `<button type="button" class="mine-pack" data-id="${esc(p.id)}" aria-label="Edit ${esc(p.name)}" aria-current="${p.id === s.id}">
        <div class="pack" ${G.packAttrs(p)}>${G.packFace(p)}</div><span>${esc(p.name)}</span></button>`).join("");
  }

  const say = (t) => { $("wsMsg").innerHTML = t; };

  // ---------- Events ----------
  $("wsForm").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.pick != null) {
      const id = String(b.dataset.pick);
      s.cards = s.cards.map(String).includes(id) ? s.cards.filter((x) => String(x) !== id) : s.cards.concat(id);
      b.setAttribute("aria-pressed", s.cards.map(String).includes(id));
      paintPickSum(); paintPreview(); say("");
    } else if (b.dataset.g) {
      const v = b.dataset.g === "luck" ? +b.dataset.v : b.dataset.v;
      s[b.dataset.g] = v;
      if (b.dataset.g === "coverMode" && v === "card" && s.coverCard == null && G.cards[0]) s.coverCard = G.cards[0].id;
      paintControls();
    } else if (b.dataset.type) {
      const t = b.dataset.type;
      s.types = s.types.includes(t) ? s.types.filter((x) => x !== t) : s.types.concat(t);
      paintControls();
    } else if (b.dataset.card != null) {
      const c = G.byId(b.dataset.card); s.coverCard = c ? c.id : null; paintControls();
    } else if (b.dataset.i != null) {
      [s.color, s.color2] = PALETTES[+b.dataset.i]; paintControls();
    }
  });
  $("wsName").addEventListener("input", (e) => { s.name = e.target.value; paintPreview(); });
  $("wsC1").addEventListener("input", (e) => { s.color = e.target.value; paintPreview(); });
  $("wsC2").addEventListener("input", (e) => { s.color2 = e.target.value; paintPreview(); });
  $("wsCount").addEventListener("input", (e) => { s.count = +e.target.value; $("wsCountOut").textContent = s.count; paintPreview(); });
  $("wsShowName").addEventListener("change", (e) => { s.showName = e.target.checked; paintPreview(); });
  $("wsGuar").addEventListener("change", (e) => { s.guarantee = e.target.value; paintPreview(); });

  // Upload: shrink the picture so lots of packs fit in browser storage
  $("wsUpload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) { say("That file isn't a picture."); return; }
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      // keep the picture's shape, longest side 640px
      const k = Math.min(1, 640 / Math.max(im.width, im.height));
      const W = Math.round(im.width * k), H = Math.round(im.height * k), cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      cv.getContext("2d").drawImage(im, 0, 0, W, H);
      s.coverImg = cv.toDataURL("image/jpeg", 0.85); URL.revokeObjectURL(url);
      $("wsUploadT").textContent = file.name;
      if (im.height / im.width > 1.15) {          // tall: probably a full pack design
        s.artSize = "whole"; s.showName = false;
        say("Looks like a full pack design, so it covers the whole pack and the printed name is hidden. You can change either below.");
      } else say("");
      paintControls();
    };
    im.onerror = () => say("Couldn't read that picture.");
    im.src = url;
  });

  $("wsNew").onclick = () => { s = fresh(); $("wsUploadT").textContent = "Choose a picture"; say(""); paintControls(); paintMine(); };

  const pickedNone = () => s.poolMode === "pick" && !s.cards.some((id) => G.byId(id));
  $("wsSave").onclick = () => {
    if (s.coverMode === "upload" && !s.coverImg) { say("Choose a picture for the cover first, or pick another cover option."); return; }
    if (pickedNone()) { say("Pick at least one card to go in this pack."); return; }
    if (!s.id) s.id = "p" + Date.now().toString(36);
    const pack = toPack(), list = G.myPacks.slice(), at = list.findIndex((p) => p.id === s.id);
    if (at >= 0) list[at] = pack; else list.push(pack);
    if (!G.saveMyPacks(list)) { say("Your browser's storage is full. Delete a pack or use a smaller cover picture."); return; }
    say(`Saved! <a href="#">Go open it →</a>`);
    paintControls(); paintMine();
  };

  let armed = false;
  $("wsDelete").onclick = () => {
    const b = $("wsDelete");
    if (!armed) { armed = true; b.textContent = "Tap again to delete"; setTimeout(() => { armed = false; b.textContent = "Delete"; }, 3000); return; }
    armed = false; b.textContent = "Delete";
    G.saveMyPacks(G.myPacks.filter((p) => p.id !== s.id));
    s = fresh(); say("Pack deleted."); paintControls(); paintMine();
  };

  $("wsOpen").onclick = () => {
    if (s.coverMode === "upload" && !s.coverImg) { say("Choose a picture for the cover first, or pick another cover option."); return; }
    if (pickedNone()) { say("Pick at least one card to go in this pack."); return; }
    const pack = toPack();
    if (!s.id) {                                   // opening also saves it, so you can open it again
      s.id = "p" + Date.now().toString(36); pack.id = s.id;
      G.saveMyPacks(G.myPacks.concat(pack));
    } else {
      G.saveMyPacks(G.myPacks.map((p) => (p.id === s.id ? pack : p)));
    }
    paintMine();
    go("play", false);
    G.openNow(pack);
    scrollTo({ top: 0, behavior: "smooth" });
  };

  $("wsMine").onclick = (e) => {
    const b = e.target.closest("[data-id]");
    if (!b) return;
    const p = G.myPacks.find((x) => x.id === b.dataset.id);
    if (p) { s = fromPack(p); $("wsUploadT").textContent = s.coverImg ? "Picture chosen" : "Choose a picture"; say(""); paintControls(); paintMine(); $("wsForm").scrollIntoView({ behavior: "smooth", block: "start" }); }
  };

  // ---------- 3D tilt on the preview ----------
  const stage = document.querySelector(".ws-stage"), tilt = $("wsTilt");
  stage.addEventListener("pointermove", (e) => {
    const b = stage.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
    tilt.style.transform = `rotateY(${x * 28}deg) rotateX(${-y * 20}deg)`;
    tilt.style.setProperty("--hx", (x + 0.5) * 100 + "%"); tilt.style.setProperty("--hy", (y + 0.5) * 100 + "%");
    tilt.classList.add("held");
  });
  stage.addEventListener("pointerleave", () => { tilt.style.transform = ""; tilt.classList.remove("held"); });

  // ---------- Switching between "Open packs", "Make cards" and "Build a pack" ----------
  function go(view, render = true) {
    const play = view === "play";
    $("workshop").hidden = view !== "build";
    $("maker").hidden = view !== "make";
    $("playView").hidden = !play;
    $("binder").hidden = view !== "collection";
    document.body.dataset.view = view;
    [["tabPlay", "play"], ["tabMake", "make"], ["tabBuild", "build"], ["tabCollection", "collection"]]
      .forEach(([id, v]) => $(id).setAttribute("aria-current", v === view ? "page" : "false"));
    if (view === "build") { paintControls(); paintMine(); }
    if (view === "make" && window.CardMaker) window.CardMaker.paint();
    if (play && render && !document.querySelector("#stage .chosen, #stage .table, #stage .results")) G.showPicker();
    if (play && location.hash) history.replaceState(null, "", location.pathname + location.search);
  }
  G.go = go;
  const route = () => go({ "#build": "build", "#make": "make", "#collection": "collection" }[location.hash] || "play");
  addEventListener("hashchange", route);
  $("tabPlay").onclick = (e) => { e.preventDefault(); go("play"); G.showPicker(); };
  document.querySelector(".logo").onclick = (e) => { e.preventDefault(); go("play"); G.showPicker(); };

  // Nothing to open yet? Start where the player needs to go next.
  // (maker.js loads after this file, so wait a moment before the first route.)
  setTimeout(() => {
    const noPacks = !G.myPacks.length && !(typeof PACKS !== "undefined" && PACKS.length);
    if (!location.hash && !G.cards.length) location.hash = "#make";
    else if (!location.hash && noPacks) location.hash = "#build";
    else route();
  });
}
