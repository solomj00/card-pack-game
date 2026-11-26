// =====================================================================
//  cards.js — THIS IS THE FILE YOU EDIT.
//  Change the set name, the rarities, what's in a pack, and your cards.
// =====================================================================

// ---- 1. Your set -----------------------------------------------------
const SET = {
  name: "Dragon's Hoard",     // shown at the top of the page
  cardBack: "#1b1214",        // colour of the back of every card
  saveKey: "myCardSet-v1",    // change this to start a fresh save
  version: 2,                 // bump this when you replace the cards below, so old pulls reset
};

// ---- 2. Rarities -----------------------------------------------------
// Listed from most common to rarest. The order matters: "Rare or better"
// means Rare and everything listed after it.
// weight:  how often it shows up. Bigger number = more common.
// shine:   true gives the card a rainbow foil effect.
// glow:    colour the card glows before it flips ("" = no build-up).
// hype:    0 = quiet, 1 = glow + chime, 2 = light rays + confetti, 3 = the works.
// fullArt: true = the picture fills the whole card (a card can override this).
// frame:   special border for the full-picture cards: "rainbow" or "gold".
const RARITIES = {
  common:    { label: "Common",    weight: 70,  symbol: "●", shine: false, glow: "",        hype: 0 },
  rare:      { label: "Rare",      weight: 22,  symbol: "★", shine: false, glow: "#4da3ff", hype: 1 },
  epic:      { label: "Epic",      weight: 6,   symbol: "✦", shine: true,  glow: "#b35cff", hype: 2 },
  legendary: { label: "Legendary", weight: 1.6, symbol: "♛", shine: true,  glow: "#ffb020", hype: 3, fullArt: true, frame: "gold" },
  exotic:    { label: "Exotic",    weight: 0.4, symbol: "✺", shine: true,  glow: "#ff4fd8", hype: 3, fullArt: true, frame: "rainbow" },
};

// Old rarity names and the new rarity they become. Cards and packs saved with
// an old name are moved to the new one automatically.
const RARITY_RENAMES = {
  uncommon: "common", holo: "rare", ultra: "epic", fullart: "epic", gallery: "epic",
  illustration: "legendary", special: "legendary", secret: "exotic",
};

// ---- 3. Packs ----------------------------------------------------------
// Players build their own packs in the "Build a pack" workshop on the site.
// You can also put ready-made packs here and they'll show up for everyone,
// next to the packs people build. Leave the list empty for build-only.
//
// Example (copy inside the [ ] to use it):
//   {
//     name: "BOOSTER", color: "#ffc929", color2: "#ff8a3d", about: "5 cards · 1 rare or better",
//     pattern: "stripes",   // crimp, stripes, dots, zigzag, rays, waves, plain
//     finish: "glossy",     // matte, glossy, holo
//     types: ["Fire", "Water"],          // optional: only these types
//     cover: "images/cover.png",         // optional: picture on the pack
//     luck: 1,              // 1 normal, 2 = Rare and better twice as likely
//     slots: [{ min: "common" }, { min: "common" }, { min: "common" }, { min: "uncommon" }, { min: "rare" }],
//   },
const PACKS = [];

// ---- 4. Types (card colours) ----------------------------------------
// Name: [card colour, picture background colour]. Add as many as you like.
const TYPES = {
  Fire:     ["#ff9b70", "#ffe0cc"],
  Water:    ["#7ec9ff", "#d6eeff"],
  Grass:    ["#9bd677", "#e2f5d2"],
  Electric: ["#ffe36b", "#fff7c8"],
  Rock:     ["#d2bfa6", "#f0e7da"],
  Ghost:    ["#c1a9f3", "#ebe3fc"],
  Normal:   ["#e6e0d8", "#f7f4ef"],
  Dragon:   ["#7fe0c8", "#dcfbf2"],
};

// ---- 5. Your cards ---------------------------------------------------
// The built-in set: Dragon's Hoard, with original art made by tools/make_art.py.
// image: a file inside the images folder, e.g. "images/my-card.png"
// art:   (optional) "full" = picture fills the whole card, "framed" = normal card.
//        Leave it out to use the rarity's setting.
// frame: (optional) "gold" or "rainbow" border, overriding the rarity's frame.
// If the picture is missing, the card shows a placeholder instead.
// Copy a line and change it to add a card.
const CARDS = [
  // Fire line
  { name: "Kindlewing",  type: "Fire",     rarity: "common",       hp: 50,  move: "Ember Hop",     damage: 20,  image: "images/kindlewing.svg" },
  { name: "Scorchtail",  type: "Fire",     rarity: "rare",         hp: 90,  move: "Tail Flare",    damage: 50,  image: "images/scorchtail.svg" },
  { name: "Pyrewyrm",    type: "Fire",     rarity: "epic",         hp: 160, move: "Furnace Roar",  damage: 120, image: "images/pyrewyrm.svg" },
  { name: "Pyrewyrm",    type: "Fire",     rarity: "legendary",    hp: 160, move: "Furnace Roar",  damage: 120, image: "images/pyrewyrm-full.svg" },
  { name: "Pyrewyrm",    type: "Fire",     rarity: "exotic",       hp: 170, move: "Sunfall",       damage: 200, image: "images/pyrewyrm-sir.svg" },
  // Water line
  { name: "Ripplefin",   type: "Water",    rarity: "common",       hp: 50,  move: "Splash Nip",    damage: 20,  image: "images/ripplefin.svg" },
  { name: "Tidecoil",    type: "Water",    rarity: "rare",         hp: 90,  move: "Riptide",       damage: 50,  image: "images/tidecoil.svg" },
  { name: "Abyssrex",    type: "Water",    rarity: "epic",         hp: 150, move: "Deep Current",  damage: 110, image: "images/abyssrex.svg" },
  { name: "Ripplefin",   type: "Water",    rarity: "legendary",    hp: 60,  move: "Moonlit Swim",  damage: 30,  image: "images/ripplefin-ir.svg" },
  // Grass line
  { name: "Mossnout",    type: "Grass",    rarity: "common",       hp: 60,  move: "Leaf Sneeze",   damage: 20,  image: "images/mossnout.svg" },
  { name: "Thornback",   type: "Grass",    rarity: "rare",         hp: 100, move: "Bramble Bash",  damage: 60,  image: "images/thornback.svg" },
  { name: "Verdragor",   type: "Grass",    rarity: "epic",         hp: 160, move: "Old Growth",    damage: 120, image: "images/verdragor.svg" },
  { name: "Mossnout",    type: "Grass",    rarity: "legendary",    hp: 60,  move: "Leaf Sneeze",   damage: 20,  image: "images/mossnout-gallery.svg" },
  // Electric line
  { name: "Sparkhatch",  type: "Electric", rarity: "common",       hp: 50,  move: "Static Peep",   damage: 20,  image: "images/sparkhatch.svg" },
  { name: "Voltwyrm",    type: "Electric", rarity: "epic",         hp: 140, move: "Storm Coil",    damage: 110, image: "images/voltwyrm.svg" },
  { name: "Voltwyrm",    type: "Electric", rarity: "legendary",    hp: 140, move: "Storm Coil",    damage: 110, image: "images/voltwyrm-full.svg" },
  // Ghost line
  { name: "Wispwing",    type: "Ghost",    rarity: "rare",         hp: 60,  move: "Fade Out",      damage: 30,  image: "images/wispwing.svg" },
  { name: "Duskdrake",   type: "Ghost",    rarity: "epic",         hp: 150, move: "Eclipse Wing",  damage: 120, image: "images/duskdrake.svg" },
  { name: "Duskdrake",   type: "Ghost",    rarity: "legendary",    hp: 150, move: "Eclipse Wing",  damage: 120, image: "images/duskdrake-ir.svg" },
  // Rock line
  { name: "Pebblehorn",  type: "Rock",     rarity: "common",       hp: 70,  move: "Headbutt",      damage: 20,  image: "images/pebblehorn.svg" },
  { name: "Cragmaw",     type: "Rock",     rarity: "rare",         hp: 120, move: "Landslide",     damage: 70,  image: "images/cragmaw.svg" },
  // Normal
  { name: "Puffscale",   type: "Normal",   rarity: "common",       hp: 50,  move: "Cloud Nap",     damage: 10,  image: "images/puffscale.svg" },
  { name: "Glimmerkin",  type: "Normal",   rarity: "rare",         hp: 80,  move: "Dazzle",        damage: 40,  image: "images/glimmerkin.svg" },
  // The legend
  { name: "Elder Aurex", type: "Dragon",   rarity: "legendary",    hp: 220, move: "Aurora Breath", damage: 180, image: "images/aurex.svg", art: "framed" },
  { name: "Elder Aurex", type: "Dragon",   rarity: "exotic",       hp: 230, move: "Northern Sky",  damage: 220, image: "images/aurex-sir.svg" },
  { name: "Elder Aurex", type: "Dragon",   rarity: "exotic",       hp: 250, move: "Hoard of Ages", damage: 250, image: "images/aurex-gold.svg", frame: "gold" },
];

// ---- 6. Coins ----------------------------------------------------------
// Packs cost coins. Players earn coins from free claims and by selling
// duplicate cards. Set enabled to false to make every pack free.
const COINS = {
  enabled: true,
  start: 500,             // coins a new player starts with
  free: 150,              // coins from the "Free coins" button
  freeEveryHours: 4,      // how often free coins can be claimed
  perCard: 12,            // pack price per card
  guaranteeExtra: { rare: 10, epic: 50, legendary: 200, exotic: 600 },  // added for a guaranteed slot
  luckPrice: { 2: 1.6, 4: 2.5 },   // price multiplier for Lucky ×2 / ×4
  boxDiscount: 0.9,       // a box of 10 costs 90% of 10 packs
  sell: { common: 2, rare: 8, epic: 30, legendary: 120, exotic: 400 },  // coins per duplicate sold
};
// A ready-made pack in PACKS can set its own price, e.g. price: 100
