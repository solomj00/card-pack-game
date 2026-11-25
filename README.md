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
1. Put the picture in `images/`, for example `images/blaze.png`.
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

## Change the odds or the pack
- **Odds:** change `weight` in `RARITIES`. Bigger numbers come up more often.
- **Pack size:** add or remove lines in `PACK`.
- **Guaranteed hit:** set a slot's `min`, for example `{ min: "holo" }`.

## Start over
Click **Reset collection**, or change `saveKey` in `cards.js`. Your progress is saved in your browser.

## Ideas to build next
- Coins: earn them over time and spend them on packs
- Several sets, each with its own `CARDS` list
- A "sell duplicates" button
- A history of your best pulls
- Sound effects when a rare is flipped

## Hosting (GitHub + Vercel)
This repo is connected to Vercel. Every time you push to the `main` branch, your live site updates automatically, usually within a minute.

To change your cards online without installing anything:
1. Open the repo on github.com.
2. To add pictures, open the `images` folder and use **Add file → Upload files**.
3. To edit cards, open `cards.js`, click the pencil icon, make your changes, then click **Commit changes**.
4. Wait about a minute, then refresh your site.
