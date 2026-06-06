# tapding

A browser typewriter. Type forever, no delete. Once a key is struck the ink is on the paper — your only moves are to overstrike, advance, or carriage-return.

Live at [tapding.pages.dev](https://tapding.pages.dev).

![](docs/screenshot.png)

## What it does

- US Letter sheet on a desk, rendered at a 10cpi / 6lpi typewriter grid.
- Backspace moves the carriage left (it never deletes). From column 0 it rolls back into the previous line.
- A bell rings near the right margin. The carriage hard-locks at column 80; further strikes overstrike the last cell.
- Enter advances a row; new sheets roll in automatically when you hit the bottom.
- Six typewriter faces, pooled sound effects with a mute toggle, and a print stylesheet that hides everything but the page.
- Autosave to localStorage — close the tab, come back, keep typing.
- Each glyph gets a stable per-cell jitter (rotation, ink density, sub-pixel offset) so the page reads as a slightly tired typewriter rather than a laser printer.

## Run it

```
npm install
npm run dev
```

`npm test` runs the suite. `npm run build` produces a static bundle under `dist/`.

## Deploy

The build output is a plain static bundle. To deploy to Cloudflare Pages from the CLI:

```
npm run build
npx wrangler pages deploy dist --project-name=tapding
```

Or wire up a Git integration in the Pages dashboard with build command `npm run build` and output directory `dist`.
