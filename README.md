# Whisker Grid

A cat puzzle in the spirit of Queens and Minesweeper: one cat per colour, row and column, and no two cats may touch. Built with Phaser 4, Vite and Electron — playable in the browser and as a desktop app for macOS, Windows and Linux.

- Play in your browser: <https://jd4rider.github.io/whisker-grid/play/>
- Downloads: <https://github.com/jd4rider/whisker-grid/releases/latest>

## How to play

Every colour, row and column gets exactly one cat, and no two cats may touch (diagonals count).

- **Tap** a square to cross it out, **drag** across squares to cross out many, **double tap** to place a cat.
- Power-ups: **💡 Hint** shows where a cat goes, **🐱 Reveal** places it, **🐭 Mouse** marks squares with no cat.
- **Journey** - 1000 procedurally generated levels (seeded, so every level is the same for everyone) from 4 to 9 colours. More colours means harder. **Rush** - 120 seconds of endless boards.

## Develop

```sh
npm install
npm run dev      # web dev server
npm test         # puzzle logic tests
npm start        # build and open in Electron
npm run dist:mac # package an installer (also dist:win, dist:linux)
```

## Release

Push a tag like `v0.1.0` and the **Release apps** workflow builds the macOS, Windows and Linux installers. Every push to `main` deploys the web version to GitHub Pages.
