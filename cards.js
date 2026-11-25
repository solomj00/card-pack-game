// =====================================================================
//  cards.js — THIS IS THE FILE YOU EDIT.
//  Change the set name, the rarities, what's in a pack, and your cards.
// =====================================================================

// ---- 1. Your set -----------------------------------------------------
const SET = {
  name: "My Card Set",        // shown at the top of the page
  cardBack: "#1b1214",        // colour of the back of every card
  saveKey: "myCardSet-v1",    // change this to start a fresh save
};

// ---- 2. Rarities -----------------------------------------------------
// weight = how often it shows up. Bigger number = more common.
// shine: true gives the card a rainbow foil effect.
// glow:  colour the card glows before it flips ("" = no build-up).
// hype:  0 = quiet, 1 = glow + chime, 2 = light rays + confetti, 3 = the works (shake, flash, big confetti)
const RARITIES = {
  common:   { label: "Common",     weight: 60, symbol: "●",  shine: false, glow: "",        hype: 0 },
  uncommon: { label: "Uncommon",   weight: 25, symbol: "◆",  shine: false, glow: "",        hype: 0 },
  rare:     { label: "Rare",       weight: 10, symbol: "★",  shine: false, glow: "#7ad3ff", hype: 1 },
  holo:     { label: "Holo Rare",  weight: 4,  symbol: "★H", shine: true,  glow: "#ff6ad5", hype: 2 },
  ultra:    { label: "Ultra Rare", weight: 1,  symbol: "✦",  shine: true,  glow: "#ffd84a", hype: 3 },
};

// ---- 3. Packs to choose from ----------------------------------------
// Each pack shows up on the pack-picker screen.
//   name:  printed on the pack
//   color: wrapper colour
//   about: short line shown under the pack
//   types: (optional) only cards of these types can come out of this pack
//   cover: (optional) picture on the pack, e.g. "images/cover.png"
//          If you leave it out, one of the pack's cards is shown.
//   slots: one entry per card. "min" is the lowest rarity that slot can be.
// Add, remove or reorder packs freely.
const PACKS = [
  {
    name: "BOOSTER", color: "#ffc929", about: "5 cards · 1 rare or better",
    slots: [{ min: "common" }, { min: "common" }, { min: "common" }, { min: "uncommon" }, { min: "rare" }],
  },
  {
    name: "ELEMENTS", color: "#ff8a5b", about: "Fire, Water & Grass only",
    types: ["Fire", "Water", "Grass"],
    slots: [{ min: "common" }, { min: "common" }, { min: "uncommon" }, { min: "uncommon" }, { min: "rare" }],
  },
  {
    name: "PREMIUM", color: "#b79cf0", about: "3 cards · 1 holo or better",
    slots: [{ min: "uncommon" }, { min: "rare" }, { min: "holo" }],
  },
];

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
};

// ---- 5. Your cards ---------------------------------------------------
// image: a file inside the images folder, e.g. "images/my-card.png"
// If the picture is missing, the card shows a placeholder instead.
// Copy a line and change it to add a card.
const CARDS = [
  { name: "Sample One",   type: "Fire",     rarity: "common",   hp: 50,  move: "Tackle",      damage: 20,  image: "images/sample-1.svg" },
  { name: "Sample Two",   type: "Water",    rarity: "common",   hp: 60,  move: "Splash",      damage: 20,  image: "images/sample-2.svg" },
  { name: "Sample Three", type: "Grass",    rarity: "common",   hp: 50,  move: "Leaf Toss",   damage: 10,  image: "images/sample-3.svg" },
  { name: "Sample Four",  type: "Electric", rarity: "common",   hp: 40,  move: "Zap",         damage: 20,  image: "images/sample-4.svg" },
  { name: "Sample Five",  type: "Rock",     rarity: "uncommon", hp: 80,  move: "Rock Throw",  damage: 40,  image: "images/sample-5.svg" },
  { name: "Sample Six",   type: "Ghost",    rarity: "uncommon", hp: 70,  move: "Spook",       damage: 40,  image: "images/sample-6.svg" },
  { name: "Sample Seven", type: "Fire",     rarity: "rare",     hp: 100, move: "Flame Burst", damage: 70,  image: "images/sample-7.svg" },
  { name: "Sample Eight", type: "Water",    rarity: "holo",     hp: 130, move: "Tidal Wave",  damage: 100, image: "images/sample-8.svg" },
  { name: "Sample Nine",  type: "Normal",   rarity: "ultra",    hp: 180, move: "Mega Strike", damage: 150, image: "images/sample-9.svg" },
];
