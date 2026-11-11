# Obsidian Window Hotkeys

Keyboard-driven window management for [Obsidian](https://obsidian.md). This plugin adds commands for moving the active tab between panes and for resizing tab groups, so you can rearrange your workspace layout without touching the mouse.

Every command is registered without a default binding — assign your own under **Settings → Hotkeys** and search for "window hotkeys".

## What it does

The plugin treats the main editor area as a grid of up to **3 columns × 2 rows** of tab groups (splits). Two families of commands operate on that grid.

### Move the active tab between splits

| Command | Effect |
| --- | --- |
| Move tab to right split | Moves the active tab one column right |
| Move tab to left split | Moves the active tab one column left |
| Move tab to upper split | Moves the active tab one row up |
| Move tab to lower split | Moves the active tab one row down |

- Movement **wraps around**: moving right from the last column lands in the first, and moving down from the bottom row lands in the top.
- If no split exists at the target position, one is **created** — as long as the grid limits (3 columns, 2 rows) allow it. Otherwise the tab lands in the nearest existing split.
- The tab keeps both its view state and its ephemeral state (scroll position, cursor, and similar), and focus follows it to its new home.

### Resize the active tab group

| Command | Effect |
| --- | --- |
| Stretch tab group to the right | Adjusts the group's width toward the right |
| Stretch tab group to the left | Adjusts the group's width toward the left |
| Stretch tab group upward | Adjusts the group's height toward the top |
| Stretch tab group downward | Adjusts the group's height toward the bottom |

- Each press moves the boundary by **50 pixels**, taking the space from (or giving it to) the neighbouring group.
- Which edge moves depends on where the group sits. A leftmost group grows with "right" and shrinks with "left"; a rightmost group grows with "left" and shrinks with "right"; a group in the middle always grows toward the direction you press. Vertical resizing behaves the same way for top, bottom, and middle groups.
- No group can be squeezed below a minimum size, and the resulting layout is saved with the workspace.

### Resize the right sidebar

| Command | Effect |
| --- | --- |
| Widen right sidebar | Makes the right sidebar 50 pixels wider |
| Narrow right sidebar | Makes the right sidebar 50 pixels narrower |

- If the right sidebar is collapsed, "Widen right sidebar" opens it at its previous width.
- The width stays between 150 pixels and the window width minus 150 pixels.

## Installation

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from a release.
2. Copy them into `VaultFolder/.obsidian/plugins/window-hotkeys/`.
3. Reload Obsidian and enable the plugin under **Settings → Community plugins**.

### From source

```bash
npm install
npm run build
```

Then copy the build artifacts into your vault as above, or clone the repo directly into `.obsidian/plugins/` and run `npm run dev` for a watching build.

## Development

- `npm run dev` — compile `src/main.ts` to `main.js` in watch mode.
- `npm run build` — type-check and produce a production bundle.
- `npm run lint` — run ESLint with the Obsidian plugin ruleset.

Reload Obsidian (or use a hot-reload plugin) to pick up a new build.

## License

0-BSD. See [LICENSE](LICENSE).
