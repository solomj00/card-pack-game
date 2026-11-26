# Card Opening Game – Starter Kit

## Play it
Double-click `index.html`. It opens in your web browser, and you don't need to install anything.

## Files
| File | What it's for |
|---|---|
| `cards.js` | **Edit this one.** Set name, rarities and their odds, pack contents, types, and your list of cards. |
| `images/` | Card pictures. The Dragon's Hoard art is here. |
| `tools/make_art.py` | Draws the Dragon's Hoard art. |
| `style.css` | Colours, fonts and layout. The **THEME** block at the bottom controls the colours. |
| `game.js` | The game engine. You only need it to add new features. |
| `builder.js` | The Build-a-pack workshop. |
| `maker.js` | The Make-cards tab. |
| `index.html` | The page itself. |

## The built-in set: Dragon's Hoard
The game ships with **Dragon's Hoard**, an original set of 26 cards: six evolution lines (Fire, Water, Grass, Electric, Ghost and Rock), two Normal cards, and the legendary Elder Aurex. The rarest cards have full-picture versions.

All of the art is original and is drawn by `tools/make_art.py`. To change the colours or add creatures, edit that file and run `python3 tools/make_art.py`. It rewrites the pictures in `images/`.

## Rarity tiers
There are five rarities, from most to least common:

| Rarity | Odds per card | What happens |
|---|---|---|
| Common | 70 in 100 | Quiet flip |
| Rare | 22 in 100 | Blue glow and a chime |
| Epic | 6 in 100 | Purple glow, foil shine, light rays and confetti |
| Legendary | about 1.6 in 100 | Gold frame, full-picture card, shake, flash and big confetti |
| Exotic | about 0.4 in 100 | Rainbow frame, full-picture card and the biggest celebration |

- **Card hits** collects every Epic or better pull.
- **Luck** in the pack builder multiplies the odds of Rare and better.
- To change the odds, labels, glow colours or effects, edit `RARITIES` in `cards.js`.
- Cards and packs saved with the old rarity names (Uncommon, Holo Rare, Full Art and so on) are moved to the new tiers automatically. `RARITY_RENAMES` in `cards.js` lists which old name becomes which new one.
- Add `frame: "gold"` or `frame: "rainbow"` to a single card to give it that border.

## Full-picture cards
In `cards.js`, add `art: "full"` to any card to make its picture fill the card, or `art: "framed"` to use the normal layout. Without it, the card follows its rarity. In the **Make cards** tab, the **Layout** switch does the same thing. Tall pictures work best for full-picture cards.

When you replace the built-in cards, increase `version` in `SET`. Old pulls of built-in cards are then cleared so they don't point at the wrong cards. Cards made in the **Make cards** tab are kept.

## Add a card
1. Put the picture in `images/`, for example `images/blaze.png` (png, jpg, svg and webp all work).
2. In `cards.js`, copy a line in the `CARDS` list and change it:
   ```js
   { name: "Blaze", type: "Fire", rarity: "rare", hp: 90, move: "Fire Spin", damage: 60, image: "images/blaze.png" },
   ```
3. Save the file and refresh the browser.

Some tips:
- `type` must match a name in `TYPES`, and `rarity` must match a name in `RARITIES`.
- Remember the comma at the end of each card line.
- If a picture doesn't show, check that the file name matches exactly, including capital letters and `.png` vs `.jpg`.
- A card with a missing picture shows its initials, so you can test before you have the art.

## Make cards
On the **Make cards** tab, players turn their own pictures into cards. They can:
- Upload one picture, or several at once for a batch. Each card in a batch is named after its file, and all of them get the details from the form.
- Set the name, type, HP, rarity, move and damage, with a live preview.
- Click any card under **Your cards** to edit or delete it.
- Set **Layout** to **Finished card** if a picture is already a complete card with its name and attacks printed on it. The picture is shown as the whole card, and the HP, move and damage fields are hidden. Card-shaped pictures (about 5 by 7) switch to this layout automatically.
- Turn **Also use the sample cards** off (the built-in Dragon's Hoard cards) so packs and the binder use only their own cards.

Pictures are shrunk before saving, so a browser can hold well over 100 cards. Cards are saved in that browser only. To give everyone the same cards, add them to `cards.js` instead (see "Add a card" above).

## Build a pack
Players make their own packs on the **Build a pack** tab. They can choose:
- **Wrapper:** the name, two colours, a pattern (stripes, dots, zigzag, burst or waves) and a finish (matte, glossy or holo foil).
- **Cover art:** a surprise card, a card of their choice, an uploaded picture, or no art.
- **Pick a card:** your own cards from **Make cards** are listed first and tagged **Yours**. Switch between **My cards** and **All cards**, or search by name. Picking a finished card covers the whole pack with it.
- **Art size:** **In a window** shows the picture in a box on the wrapper. **Covers the whole pack** makes it the entire wrapper.
- **Print the pack name on the wrapper:** turn this off when the picture already has its own design and title. The name then appears under the pack instead.
- Uploading a tall picture, like a finished pack design, sets it to cover the whole pack and hides the printed name automatically. Both can be switched back.
- **Inside the pack:** 1 to 10 cards, a guaranteed hit (Rare, Epic, Legendary or Exotic) and luck (×2 or ×4 for Rare and better).
- **Which cards can come out:**
  - **Every card**
  - **By type**, for example only Fire and Water
  - **Pick cards**, where you tap the exact cards you want. Search and the rarity filter help you find them, and **Select all shown** / **Clear shown** work on whatever the filters show.

The workshop shows the live odds as you build. **Open it now** saves the pack and opens it straight away. Saved packs appear on the **Open packs** tab and can be edited or deleted from the workshop. They're stored in the player's browser.

If there are no packs yet, the site starts in the workshop.

## Odds and ready-made packs
- **Odds:** change `weight` in `RARITIES`. Bigger numbers come up more often.
- **Ready-made packs (optional):** `PACKS` in `cards.js` is empty, so players build every pack themselves. To give everyone a starter pack, copy the example in the comments into the list.
- If a pack has no card at the rarity it rolls, it uses the closest rarity it does have.

## Opening packs
- **Reveal style:** **One by one** shows a stack you tap through, rarest card last. **All at once** lays every card out face down and flips them in a row. The site remembers your choice.
- **Space bar:** opens a pack, reveals the next card, or opens another of the same pack.
- **Open a box of 10:** the button under each pack opens 10 at once and shows every hit.
- **Card hits:** your Rare-and-better pulls, newest first, under the pack area.
- **View stats:** packs opened, cards pulled, and your pull rate for each rarity.
- **Collection:** your binder, on its own tab.

## Colours and look
The theme colours are at the bottom of `style.css`, under **THEME**. Change `--accent` to recolour every button and highlight.

## Tune the pack opening
Each rarity in `cards.js` has two extra settings:
- `glow` is the colour the card pulses before it flips. Use `""` for no build-up.
- `hype` sets how big the celebration is: `0` is quiet, `1` adds a chime, `2` adds light rays and confetti, and `3` adds a shake, a screen flash and a big confetti burst.

Cards in a pack are always revealed rarest-last. The **Sound** button in the header turns the sound effects on or off.

## Start over
Click **Reset collection**, or change `saveKey` in `cards.js`. Your progress is saved in your browser.

## Ideas to build next
- Coins: earn them over time and spend them on packs
- Several sets, each with its own `CARDS` list
- A "sell duplicates" button
- A history of your best pulls

## Hosting (GitHub + Vercel)
This repo is connected to Vercel. Every time you push to the `main` branch, your live site updates automatically, usually within a minute.

To change your cards online without installing anything:
1. Open the repo on github.com.
2. To add pictures, open the `images` folder and use **Add file → Upload files**.
3. To edit cards, open `cards.js`, click the pencil icon, make your changes, then click **Commit changes**.
4. Wait about a minute, then refresh your site.
