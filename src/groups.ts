import { App, Notice, WorkspaceLeaf, WorkspaceParent } from "obsidian";

// Sublime-style tab-group commands: layout presets, numbered groups, maximize,
// equalize, swap, close empty groups and "open link in the other group".
//
// A "group" is a tab group (WorkspaceTabs) in the main editor area. Groups are
// numbered in reading order: top row first, left to right, then the next row.

export type Direction = "left" | "right" | "up" | "down";
export type LayoutName = "single" | "columns-2" | "columns-3" | "rows-2" | "grid-4";

// Internal Obsidian API that is not in obsidian.d.ts.
interface ItemInternal {
    parent: ParentInternal | null;
    containerEl: HTMLElement;
    children?: ItemInternal[];
    direction?: "vertical" | "horizontal";
    dimension?: number;
    setDimension?: (size: number) => void;
}
interface ParentInternal extends ItemInternal {
    children: ItemInternal[];
    currentTab?: number;
    selectTabIndex?: (index: number) => void;
}

const MAXIMIZED_CLASS = "window-hotkeys-maximized";
const HIDDEN_CLASS = "window-hotkeys-hidden";

// ---------- helpers ----------

export function activeRootLeaf(app: App): WorkspaceLeaf | null {
    return app.workspace.getMostRecentLeaf(app.workspace.rootSplit);
}

// Copy view state (file, mode) and ephemeral state (scroll, cursor) from one leaf to another.
export async function copyView(from: WorkspaceLeaf, to: WorkspaceLeaf) {
    const view = from.view;
    const state = view.getState();
    const eState = (view as any).getEphemeralState?.() || {};
    await to.setViewState({ type: view.getViewType(), state });
    (to.view as any).setEphemeralState?.(eState);
}

function rect(group: WorkspaceParent): DOMRect {
    return (group as unknown as ItemInternal).containerEl.getBoundingClientRect();
}

// All tab groups in the main area, in reading order.
export function tabGroups(app: App): WorkspaceParent[] {
    const groups: WorkspaceParent[] = [];
    app.workspace.iterateRootLeaves((leaf) => {
        if (leaf.parent && !groups.includes(leaf.parent)) {
            groups.push(leaf.parent);
        }
    });
    return groups.sort((a, b) => {
        const ra = rect(a);
        const rb = rect(b);
        if (Math.abs(ra.top - rb.top) > 10) {
            return ra.top - rb.top;
        }
        return ra.left - rb.left;
    });
}

function leavesOf(group: WorkspaceParent): WorkspaceLeaf[] {
    const children = ((group as unknown as ParentInternal).children ?? []) as unknown[];
    return children.filter((c): c is WorkspaceLeaf => c instanceof WorkspaceLeaf);
}

function currentLeafOf(group: WorkspaceParent): WorkspaceLeaf | null {
    const leaves = leavesOf(group);
    const index = (group as unknown as ParentInternal).currentTab ?? 0;
    return leaves[index] ?? leaves[0] ?? null;
}

function isEmptyLeaf(leaf: WorkspaceLeaf): boolean {
    return leaf.view.getViewType() === "empty";
}

// The nearest group on the given side of `group`, which overlaps it on the other axis.
export function neighborGroup(app: App, group: WorkspaceParent, dir: Direction): WorkspaceParent | null {
    const r = rect(group);
    const tol = 4;
    let best: WorkspaceParent | null = null;
    let bestDist = Infinity;
    for (const g of tabGroups(app)) {
        if (g === group) {
            continue;
        }
        const o = rect(g);
        let ok = false;
        let dist = 0;
        if (dir === "right") {
            ok = o.left >= r.right - tol && o.top < r.bottom && o.bottom > r.top;
            dist = o.left - r.right;
        } else if (dir === "left") {
            ok = o.right <= r.left + tol && o.top < r.bottom && o.bottom > r.top;
            dist = r.left - o.right;
        } else if (dir === "down") {
            ok = o.top >= r.bottom - tol && o.left < r.right && o.right > r.left;
            dist = o.top - r.bottom;
        } else {
            ok = o.bottom <= r.top + tol && o.left < r.right && o.right > r.left;
            dist = r.top - o.bottom;
        }
        if (ok && dist < bestDist) {
            best = g;
            bestDist = dist;
        }
    }
    return best;
}

// Move a leaf into another group as a new tab. The original leaf is closed;
// if it was the last tab in its group, the group keeps an empty tab instead
// when keepEmpty is true.
async function moveLeafToGroup(
    app: App,
    leaf: WorkspaceLeaf,
    group: WorkspaceParent,
    keepEmpty: boolean,
): Promise<WorkspaceLeaf> {
    const dest = app.workspace.createLeafInParent(group, -1);
    await copyView(leaf, dest);
    const isLast = leavesOf(leaf.parent).length === 1;
    if (isLast && keepEmpty) {
        await leaf.setViewState({ type: "empty" });
    } else {
        leaf.detach();
    }
    return dest;
}

// ---------- 1. layout presets ----------

export async function applyLayout(app: App, layout: LayoutName) {
    clearMaximize(app);
    const count = { single: 1, "columns-2": 2, "columns-3": 3, "rows-2": 2, "grid-4": 4 }[layout];
    const activeLeaf = activeRootLeaf(app);
    const oldGroups = tabGroups(app);
    if (oldGroups.length === 0) {
        return;
    }

    // Step 1: merge every tab into the first group. Remember which old group each tab
    // came from, so it can go back to the group with the same number.
    const first = oldGroups[0]!;
    const origin = new Map<WorkspaceLeaf, number>();
    let focusLeaf: WorkspaceLeaf | null = activeLeaf;
    leavesOf(first).forEach((l) => origin.set(l, 0));
    for (let i = 1; i < oldGroups.length; i++) {
        for (const leaf of leavesOf(oldGroups[i]!)) {
            if (isEmptyLeaf(leaf)) {
                leaf.detach();
                continue;
            }
            const moved = await moveLeafToGroup(app, leaf, first, false);
            origin.set(moved, i);
            if (leaf === activeLeaf) {
                focusLeaf = moved;
            }
        }
    }

    // Step 2: create the new groups by splitting. Each split starts with one empty tab.
    const anchor = leavesOf(first)[0]!;
    const newGroups: WorkspaceParent[] = [first];
    const placeholders = new Map<WorkspaceParent, WorkspaceLeaf>();
    const split = (leaf: WorkspaceLeaf, dir: "vertical" | "horizontal") => {
        const l = app.workspace.createLeafBySplit(leaf, dir, false);
        placeholders.set(l.parent, l);
        return l;
    };
    if (layout === "columns-2") {
        newGroups.push(split(anchor, "vertical").parent);
    } else if (layout === "columns-3") {
        const second = split(anchor, "vertical");
        newGroups.push(second.parent, split(second, "vertical").parent);
    } else if (layout === "rows-2") {
        newGroups.push(split(anchor, "horizontal").parent);
    } else if (layout === "grid-4") {
        const topRight = split(anchor, "vertical");
        const bottomLeft = split(anchor, "horizontal");
        const bottomRight = split(topRight, "horizontal");
        newGroups.push(topRight.parent, bottomLeft.parent, bottomRight.parent);
    }

    // Step 3: send each tab back to the group with its old number (or the last group).
    if (count > 1) {
        for (const [leaf, from] of origin) {
            const target = Math.min(from, count - 1);
            if (target === 0) {
                continue;
            }
            const group = newGroups[target]!;
            const placeholder = placeholders.get(group);
            let dest: WorkspaceLeaf;
            if (placeholder) {
                await copyView(leaf, placeholder);
                placeholders.delete(group);
                dest = placeholder;
            } else {
                dest = app.workspace.createLeafInParent(group, -1);
                await copyView(leaf, dest);
            }
            leaf.detach();
            if (leaf === focusLeaf) {
                focusLeaf = dest;
            }
        }
    }

    equalizeGroups(app);
    if (focusLeaf) {
        app.workspace.setActiveLeaf(focusLeaf, { focus: true });
    }
}

// ---------- 2. numbered groups ----------

export function focusGroup(app: App, n: number) {
    const group = tabGroups(app)[n - 1];
    const leaf = group && currentLeafOf(group);
    if (leaf) {
        app.workspace.setActiveLeaf(leaf, { focus: true });
    }
}

export async function moveTabToGroup(app: App, n: number, keepEmpty: boolean) {
    const leaf = activeRootLeaf(app);
    if (!leaf) {
        return;
    }
    const groups = tabGroups(app);
    let group = groups[n - 1];
    if (group === leaf.parent) {
        return;
    }
    let dest: WorkspaceLeaf;
    if (!group) {
        // Group n does not exist: make one new group to the right of the last group.
        const last = groups[groups.length - 1]!;
        dest = app.workspace.createLeafBySplit(currentLeafOf(last)!, "vertical", false);
        await copyView(leaf, dest);
        if (leavesOf(leaf.parent).length === 1 && keepEmpty) {
            await leaf.setViewState({ type: "empty" });
        } else {
            leaf.detach();
        }
    } else {
        dest = await moveLeafToGroup(app, leaf, group, keepEmpty);
    }
    app.workspace.setActiveLeaf(dest, { focus: true });
}

// ---------- 3. maximize ----------

export function toggleMaximize(app: App) {
    const root = (app.workspace.rootSplit as unknown as ItemInternal).containerEl;
    if (root.hasClass(MAXIMIZED_CLASS)) {
        clearMaximize(app);
        return;
    }
    const leaf = activeRootLeaf(app);
    if (!leaf) {
        return;
    }
    // Hide every sibling on the path from the active group up to the root.
    let item = leaf.parent as unknown as ItemInternal;
    while (item.parent) {
        for (const sibling of item.parent.children) {
            if (sibling !== item) {
                sibling.containerEl.addClass(HIDDEN_CLASS);
            }
        }
        item = item.parent;
    }
    root.addClass(MAXIMIZED_CLASS);
}

export function clearMaximize(app: App) {
    const root = (app.workspace.rootSplit as unknown as ItemInternal).containerEl;
    root.removeClass(MAXIMIZED_CLASS);
    root.querySelectorAll("." + HIDDEN_CLASS).forEach((el) => el.removeClass(HIDDEN_CLASS));
}

// ---------- 4. equalize ----------

export function equalizeGroups(app: App) {
    const walk = (item: ItemInternal) => {
        if (!item.children || item.children.length === 0 || item.children[0] instanceof WorkspaceLeaf) {
            return;
        }
        for (const child of item.children) {
            if (typeof child.setDimension === "function") {
                child.setDimension(50);
            } else {
                (child as any).size = 50;
                child.containerEl.style.flexGrow = "50";
            }
            walk(child);
        }
    };
    walk(app.workspace.rootSplit as unknown as ItemInternal);
    app.workspace.requestSaveLayout();
}

// ---------- 5. swap ----------

export async function swapGroup(app: App, dir: Direction) {
    clearMaximize(app);
    const leaf = activeRootLeaf(app);
    if (!leaf) {
        return;
    }
    const a = leaf.parent;
    const b = neighborGroup(app, a, dir);
    if (!b) {
        return;
    }
    const aLeaves = leavesOf(a);
    const bLeaves = leavesOf(b);
    const aCurrent = currentLeafOf(a);
    const bCurrent = currentLeafOf(b);

    // Add copies first, so neither group becomes empty and closes.
    let movedCurrent: WorkspaceLeaf | null = null; // a's shown tab, now in b
    let incomingCurrent: WorkspaceLeaf | null = null; // b's shown tab, now in a
    for (const l of aLeaves) {
        const copy = app.workspace.createLeafInParent(b, -1);
        await copyView(l, copy);
        if (l === aCurrent) {
            movedCurrent = copy;
        }
    }
    for (const l of bLeaves) {
        const copy = app.workspace.createLeafInParent(a, -1);
        await copyView(l, copy);
        if (l === bCurrent) {
            incomingCurrent = copy;
        }
    }
    aLeaves.forEach((l) => l.detach());
    bLeaves.forEach((l) => l.detach());

    if (incomingCurrent) {
        app.workspace.setActiveLeaf(incomingCurrent, { focus: false });
    }
    if (movedCurrent) {
        // Focus follows the tab you were in.
        app.workspace.setActiveLeaf(movedCurrent, { focus: true });
    }
}

// ---------- 7. close empty groups ----------

export function closeEmptyGroups(app: App) {
    const active = activeRootLeaf(app);
    let closed = 0;
    for (const group of tabGroups(app)) {
        const leaves = leavesOf(group);
        const empties = leaves.filter(isEmptyLeaf);
        // Keep at least one tab in the whole main area.
        const remaining = tabGroups(app).reduce((n, g) => n + leavesOf(g).length, 0);
        const toClose = empties.length === remaining ? empties.slice(1) : empties;
        toClose.forEach((l) => l.detach());
        closed += toClose.length;
    }
    if (closed === 0) {
        new Notice("No empty tabs or groups");
    } else if (active && !active.parent) {
        const first = tabGroups(app)[0];
        const leaf = first && currentLeafOf(first);
        if (leaf) {
            app.workspace.setActiveLeaf(leaf, { focus: true });
        }
    }
}

// ---------- 8. open link in the other group ----------

function linkAtCursor(app: App): string | null {
    const editor = app.workspace.activeEditor?.editor;
    if (!editor) {
        return null;
    }
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const patterns = [/!?\[\[([^\]]+)\]\]/g, /!?\[[^\]]*\]\(([^)]+)\)/g];
    for (const re of patterns) {
        for (const m of line.matchAll(re)) {
            const start = m.index ?? 0;
            if (cursor.ch >= start && cursor.ch <= start + m[0].length) {
                return m[1]!.split("|")[0]!.trim();
            }
        }
    }
    return null;
}

// Open the link under the cursor as a new tab in the neighbor group (right, then
// left, down, up). Without a neighbor, split right. Focus stays in the note you read.
export async function openLinkInNeighbor(app: App) {
    const leaf = activeRootLeaf(app);
    const target = linkAtCursor(app);
    if (!leaf || !target) {
        new Notice("No link under cursor");
        return;
    }
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) {
        window.open(target);
        return;
    }
    const linktext = decodeURIComponent(target.replace(/^<|>$/g, ""));
    const sourcePath = app.workspace.getActiveFile()?.path ?? "";

    let group: WorkspaceParent | null = null;
    for (const dir of ["right", "left", "down", "up"] as Direction[]) {
        group = neighborGroup(app, leaf.parent, dir);
        if (group) {
            break;
        }
    }
    const dest = group
        ? app.workspace.createLeafInParent(group, -1)
        : app.workspace.createLeafBySplit(leaf, "vertical", false);
    // openLinkText exists on WorkspaceLeaf at runtime but is missing from this obsidian.d.ts.
    await (dest as any).openLinkText(linktext, sourcePath, { active: false });
    app.workspace.setActiveLeaf(leaf, { focus: true });
}
