# Valentine's Minesweeper

A Valentine's Day themed Minesweeper game. Click the squares, avoid the bombs — and when you hit one, your partner's photo appears with **"You da bomb!"**

## How to Play

1. **Open `index.html`** in any browser (or deploy to GitHub Pages — see below)
2. Left-click to reveal a square
3. Right-click (or long-press on mobile) to flag a suspected bomb
4. Clear all safe squares to win!

## Adding Your Partner's Photos

The game shows a **random photo** each time you hit a bomb — up to 10 different ones!

1. Create a **`photos/`** folder in the root of this repository
2. Add up to 10 images named:
   ```
   photos/photo1.png
   photos/photo2.png
   photos/photo3.png
   ...
   photos/photo10.png
   ```
3. Commit and push:
   ```bash
   git add photos/
   git commit -m "Add partner photos"
   git push
   ```
4. Every time a bomb is hit, a different photo will appear!

**Supported formats:** PNG works best, but you can also use JPG — just rename them to `.png`.

If no photos are found, a heart emoji will appear as a fallback.

## Deploying with GitHub Pages

1. Go to your repo on GitHub → **Settings** → **Pages**
2. Under "Source", select **Deploy from a branch**
3. Pick your branch and root folder (`/`), then click **Save**
4. Your game will be live at `https://<username>.github.io/Valentine/`
