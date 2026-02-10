# Valentine's Minesweeper

A Valentine's Day themed Minesweeper game. Click the squares, avoid the bombs — and when you hit one, your partner's photo appears with **"You da bomb!"**

## How to Play

1. **Open `index.html`** in any browser (or deploy to GitHub Pages — see below)
2. Left-click to reveal a square
3. Right-click (or long-press on mobile) to flag a suspected bomb
4. Clear all safe squares to win!

## Adding Your Partner's Photo

1. Add an image file named **`partner.png`** to the root of this repository (same folder as `index.html`)
2. Commit and push:
   ```bash
   git add partner.png
   git commit -m "Add partner photo"
   git push
   ```
3. That's it! The game will automatically display the photo when a bomb is clicked

**Supported formats:** PNG works best, but you can also use JPG — just rename it to `partner.png` or update the `src` in `index.html`.

If no photo is found, a heart emoji will appear instead.

## Deploying with GitHub Pages

1. Go to your repo on GitHub → **Settings** → **Pages**
2. Under "Source", select **Deploy from a branch**
3. Pick your branch and root folder (`/`), then click **Save**
4. Your game will be live at `https://<username>.github.io/Valentine/`
