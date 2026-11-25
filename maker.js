// =====================================================================
//  maker.js — the "Make cards" tab.
//  Players upload pictures and turn them into cards. Their cards are saved
//  in this browser and go straight into packs and the binder.
// =====================================================================
{
  const G = window.CardGame;
  const $ = (id) => document.getElementById(id);
  const { esc, RARITIES, RARITY_KEYS, TYPES } = G;
  const typeNames = Object.keys(TYPES);

  const blank = () => ({ id: null, name: "", type: typeNames[0] || "Normal", rarity: RARITY_KEYS[0], hp: 70, move: "Tackle", damage: 30, image: "" });
  let s = blank();
  let batch = [];          // pictures waiting to become cards: [{ image, name }]

  // ---------- Pictures: shrink them so lots of cards fit in browser storage ----------
  const shrink = (file) => new Promise((done) => {
    if (!file.type.startsWith("image/")) return done(null);
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const W = 360, H = 270, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const k = Math.max(W / im.width, H / im.height), cx = cv.getContext("2d");
      cx.fillStyle = "#fff"; cx.fillRect(0, 0, W, H);
      cx.drawImage(im, (W - im.width * k) / 2, (H - im.height * k) / 2, im.width * k, im.height * k);
      URL.revokeObjectURL(url);
      done({ image: cv.toDataURL("image/jpeg", 0.82), name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 18) });
    };
    im.onerror = () => { URL.revokeObjectURL(url); done(null); };
    im.src = url;
  });

  async function takeFiles(files) {
    files = [...files].slice(0, 60);
    if (!files.length) return;
    say("Loading pictures…");
    batch = (await Promise.all(files.map(shrink))).filter(Boolean);
    if (!batch.length) { say("Those files aren't pictures."); return; }
    say("");
    if (batch.length === 1) {
      s.image = batch[0].image;
      if (!s.name) s.name = batch[0].name;
      batch = [];
      $("mkDropT").textContent = files[0].name;
    } else {
      $("mkDropT").textContent = `${batch.length} pictures ready`;
    }
    paint();
  }

  // ---------- Read the form ----------
  const num = (v, d, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || d)));
  function read() {
    s.name = $("mkName").value.trim();
    s.type = $("mkType").value;
    s.hp = num($("mkHp").value, 70, 10, 999);
    s.move = $("mkMove").value.trim() || "Tackle";
    s.damage = num($("mkDmg").value, 0, 0, 999);
  }
  const asCard = (extra = {}) => ({ id: s.id || "c", custom: true, name: s.name || "Your card", type: s.type, rarity: s.rarity,
    hp: s.hp, move: s.move, damage: s.damage, image: s.image, ...extra });

  // ---------- Draw ----------
  const say = (t) => { $("mkMsg").innerHTML = t; };

  function paintPreview() {
    const first = batch[0];
    const card = asCard(first ? { image: first.image, name: first.name } : {});
    const shine = RARITIES[card.rarity]?.shine;
    $("mkPreview").className = "mk-card" + (shine ? " shine" : "");
    $("mkPreview").innerHTML = card.image ? G.cardHTML(card)
      : G.cardHTML({ ...card, image: "" }).replace(/<div class="pic">[\s\S]*?<\/div>/, '<div class="pic"><span class="ph">+ picture</span></div>');
    $("mkBatch").textContent = batch.length > 1
      ? `Batch of ${batch.length}: each picture becomes a card with these details, named after its file.` : "";
  }

  function paintForm() {
    $("mkName").value = s.name;
    $("mkType").innerHTML = typeNames.map((t) => `<option${t === s.type ? " selected" : ""}>${esc(t)}</option>`).join("");
    $("mkHp").value = s.hp; $("mkMove").value = s.move; $("mkDmg").value = s.damage;
    $("mkRarity").innerHTML = RARITY_KEYS.map((k) =>
      `<button type="button" class="chip" role="radio" aria-checked="${s.rarity === k}" data-r="${k}">${esc(RARITIES[k].symbol)} ${esc(RARITIES[k].label)}</button>`).join("");
    $("mkTitle").textContent = s.id ? "Edit card" : "Make a card";
    $("mkAdd").textContent = s.id ? "Save changes" : batch.length > 1 ? `Add ${batch.length} cards` : "Add card";
    $("mkDelete").hidden = !s.id;
  }

  function paintMine() {
    const list = G.myCards;
    $("mkCount").textContent = list.length ? `(${list.length})` : "";
    $("mkSamples").checked = G.useSamples;
    $("mkMine").innerHTML = list.length ? list.map((c) =>
      `<button type="button" class="mk-mini${RARITIES[c.rarity]?.shine ? " shine" : ""}" data-id="${esc(c.id)}" aria-current="${c.id === s.id}" aria-label="Edit ${esc(c.name)}">${G.cardHTML(c)}</button>`).join("")
      : `<p class="mk-empty">No cards yet. Your first card will show up here.</p>`;
  }

  function paint() { paintForm(); paintPreview(); paintMine(); }

  // ---------- Events ----------
  $("mkFile").addEventListener("change", (e) => takeFiles(e.target.files));
  const drop = $("mkDrop");
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); takeFiles(e.dataTransfer.files); });

  $("mkForm").addEventListener("input", () => { read(); paintPreview(); });
  $("mkForm").addEventListener("change", () => { read(); paintPreview(); });
  $("mkRarity").addEventListener("click", (e) => {
    const b = e.target.closest("[data-r]"); if (!b) return;
    read(); s.rarity = b.dataset.r; paintForm(); paintPreview();
  });

  const reset = () => { s = blank(); batch = []; $("mkFile").value = ""; $("mkDropT").textContent = "Choose or drop pictures"; };
  $("mkNew").onclick = () => { reset(); say(""); paint(); };

  $("mkAdd").onclick = () => {
    read();
    const list = G.myCards.slice();
    let made = [];
    if (s.id) {                                              // editing
      if (!s.image) { say("Add a picture first."); return; }
      const i = list.findIndex((c) => c.id === s.id);
      list[i] = asCard();
      made = [list[i]];
    } else if (batch.length > 1) {                           // a batch of pictures
      made = batch.map((b, i) => asCard({ id: "c" + Date.now().toString(36) + i, name: b.name || `Card ${i + 1}`, image: b.image }));
      list.push(...made);
    } else {                                                 // one card
      if (!s.image) { say("Add a picture first."); return; }
      if (!s.name) { say("Give your card a name."); $("mkName").focus(); return; }
      made = [asCard({ id: "c" + Date.now().toString(36) })];
      list.push(...made);
    }
    if (!G.saveMyCards(list)) { say("Your browser's storage is full. Delete some cards and try again."); return; }
    const editing = !!s.id;
    const keep = { type: s.type, rarity: s.rarity, hp: s.hp, move: s.move, damage: s.damage };
    reset(); Object.assign(s, editing ? {} : keep);          // keep settings handy for the next card
    say(editing ? "Card saved." : made.length > 1 ? `${made.length} cards added! <a href="#build">Put them in a pack →</a>`
      : `${esc(made[0].name)} added! <a href="#build">Put it in a pack →</a>`);
    paint();
  };

  let armed = false;
  $("mkDelete").onclick = () => {
    const b = $("mkDelete");
    if (!armed) { armed = true; b.textContent = "Tap again to delete"; setTimeout(() => { armed = false; b.textContent = "Delete"; }, 3000); return; }
    armed = false; b.textContent = "Delete";
    G.saveMyCards(G.myCards.filter((c) => c.id !== s.id));
    reset(); say("Card deleted."); paint();
  };

  $("mkMine").addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]"); if (!b) return;
    const c = G.myCards.find((x) => x.id === b.dataset.id); if (!c) return;
    batch = []; s = { id: c.id, name: c.name, type: c.type, rarity: c.rarity, hp: c.hp, move: c.move, damage: c.damage, image: c.image };
    $("mkDropT").textContent = "Choose a new picture (optional)";
    say(""); paint();
    $("mkForm").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("mkSamples").addEventListener("change", (e) => {
    G.setUseSamples(e.target.checked);
    say(e.target.checked ? "Sample cards are back in the packs." : "Sample cards are off. Packs only use your cards.");
  });

  // 3D tilt on the preview
  const stage = $("mkTilt").parentElement, tilt = $("mkTilt");
  stage.addEventListener("pointermove", (e) => {
    const b = stage.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
    tilt.style.transform = `rotateY(${x * 26}deg) rotateX(${-y * 18}deg)`;
    $("mkPreview").style.setProperty("--hx", (x + 0.5) * 100 + "%"); $("mkPreview").style.setProperty("--hy", (y + 0.5) * 100 + "%");
    tilt.classList.add("held");
  });
  stage.addEventListener("pointerleave", () => { tilt.style.transform = ""; tilt.classList.remove("held"); });

  window.CardMaker = { paint };
}
