# Meowdoku

A cat-themed sudoku: one of each cat in every row, column and box. Built with Phaser 4, Vite and Electron — playable in the browser and as a desktop app for macOS, Windows and Linux.

- Play in your browser: <https://jd4rider.github.io/meowdoku/play/>
- Downloads: <https://github.com/jd4rider/meowdoku/releases/latest>

## How to play

Sudoku with cats! Select a square, then tap a cat to place it. Every row, column and box must hold each cat exactly once.

- **4x4, 6x6 and 9x9** boards. **Notes** let you pencil in candidates.
- **Hint** fills a cat, **Undo** and **Erase** fix slips. Fewer mistakes and hints means more stars.
- **Journey** - 60 levels across 5 worlds.
- **Rush** - 120 seconds. Every solved puzzle adds time; wrong cats and hints cost time.

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
