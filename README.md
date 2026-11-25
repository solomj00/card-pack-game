# Card Opening Game – Starter Kit

## Play it
Double-click `index.html`. It opens in your web browser, and you don't need to install anything.

## Files
| File | What it's for |
|---|---|
| `cards.js` | **Edit this one.** Set name, rarities and their odds, pack contents, types, and your list of cards. |
| `images/` | Put your card pictures here. |
| `style.css` | Colours, fonts and layout. The colours at the top change the whole look. |
| `game.js` | The game engine. You only need it to add new features. |
| `index.html` | The page itself. |

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

## Change the odds or the packs
- **Odds:** change `weight` in `RARITIES`. Bigger numbers come up more often.
- **Packs:** each entry in `PACKS` appears on the pack-picker screen. Copy one to make a new pack.
  - `slots`: one line per card. Add or remove lines to change the pack size.
  - `min`: the lowest rarity a slot can be. For example, `{ min: "holo" }` is a guaranteed holo or better.
  - `types`: limits a pack to certain types, for example `types: ["Fire", "Water"]`. Leave it out to allow every card.
  - `cover`: a picture for the pack wrapper. Leave it out to show one of the pack's cards.
  - If a pack has no card at the rarity it rolls, it uses the closest rarity it does have.

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
