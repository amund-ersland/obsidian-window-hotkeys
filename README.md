# Obsidian Window Hotkeys

Keyboard-driven window management for [Obsidian](https://obsidian.md). This plugin adds commands for splitting, moving tabs between panes, Sublime Text–style tab groups and layouts, and resizing, so you can rearrange your workspace layout without touching the mouse.

Every command is registered without a default binding — assign your own under **Settings → Hotkeys** and search for "window hotkeys".

## What it does

The plugin treats the main editor area as a grid of up to **3 columns × 2 rows** of tab groups (splits). Two families of commands operate on that grid.

### Split and move

| Command | Effect |
| --- | --- |
| Split right / left / down / up: move tab, new tab here | Splits the current tab group. The active tab moves into the new split; focus stays in the old place on an empty tab |

Use this when you want the current note on one side and a new note where you stand.

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
- If you move the last tab out of a group, the group stays with an empty tab (see [Settings](#settings)).

### Tab groups (Sublime Text style)

Groups are numbered in reading order: the top row from left to right, then the next row. In the 2×2 grid, 1 is top left, 2 top right, 3 bottom left and 4 bottom right. With the left column in 2 rows, 1 is top left, 2 is the right column and 3 bottom left. With the right column in 2 rows, 1 is the left column, 2 top right and 3 bottom right.

| Command | Effect |
| --- | --- |
| Layout: single group (merge all tabs) | Merges every tab into one group |
| Layout: 2 columns / 3 columns / 2 rows / 2x2 grid / 2 columns with the left or right column in 2 rows | Rebuilds the main area with that many groups. Each tab goes back to the group with the same number; extra tabs go to the last group. New groups without tabs show the empty page. Sizes are equalized |
| Focus group 1–4 | Focuses the visible tab in group N |
| Move tab to group 1–4 | Moves the active tab to group N. If group N does not exist, a new group is made to the right. Focus follows the tab |
| Toggle maximize tab group | Hides all other groups (nothing is closed). Run again to show them |
| Equalize tab group sizes | Gives all groups at each level the same size |
| Swap tab group with the one to the left / right / above / below | Exchanges all tabs of the two groups. Focus follows the tab you were in |
| Close empty tabs and tab groups | Closes every empty tab, and so every group that only had empty tabs. At least one tab stays |
| Open link under cursor in neighbor group | Opens the `[[wiki link]]` or `[markdown](link)` under the cursor as a new tab in the group to the right (then left, below, above). Without a neighbor, splits right. Focus stays in the source note. URLs open in the browser. In a CSV Table (plugin `csv-table`), the link is the selected cell's |

Layout, swap, split and move work by copying the tab into a new leaf and closing the original. View state, scroll position and cursor are kept, but the tab's back/forward history is not.

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

## Settings

- **Keep empty tab groups** (on by default): when you move the last tab out of a group, keep the group with an empty tab instead of closing it, like Sublime Text.

## Suggested hotkeys

| Keys (macOS) | Command |
| --- | --- |
| ⌥⇧L / ⌥⇧J | Split right / down: move tab, new tab here |
| ⌃⌘H/J/K/L | Move tab left / down / up / right |
| ⌥⌘1 … ⌥⌘7 | Layout: single, 2 columns, 3 columns, 2 rows, 2×2 grid, 2 columns with left column in 2 rows, 2 columns with right column in 2 rows |
| ⌃1 … ⌃4 | Focus group 1–4 |
| ⌃⌘1 … ⌃⌘4 | Move tab to group 1–4 |
| ⌃⌘M | Toggle maximize tab group |
| ⌃⌘0 | Equalize tab group sizes |
| ⌃⌥⌘H/J/K/L | Swap tab group left / down / up / right |
| ⌃⌘W | Close empty tabs and tab groups |
| ⌃⌥Enter | Open link under cursor in neighbor group |

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

- Source: `src/main.ts` (commands, split/move, resize), `src/groups.ts` (tab groups and layouts), `src/sidebar.ts` (right sidebar).
- `npm run dev` — compile `src/main.ts` to `main.js` in watch mode.
- `npm run build` — type-check and produce a production bundle.
- `npm run lint` — run ESLint with the Obsidian plugin ruleset.

Reload Obsidian (or use a hot-reload plugin) to pick up a new build.

## License

0-BSD. See [LICENSE](LICENSE).
