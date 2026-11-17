import { App, WorkspaceLeaf } from "obsidian";

const SIDEBAR_STEP = 50; // Pixels to resize by
const SIDEBAR_MIN_WIDTH = 150;

// Internal Obsidian API: WorkspaceSidedock has an undocumented size/setSize.
interface SidedockInternal {
    collapsed: boolean;
    containerEl: HTMLElement;
    size?: number;
    setSize?: (size: number) => void;
    expand: () => void;
}

export function resizeRightSidebar(app: App, direction: "wider" | "narrower") {
    const sidebar = app.workspace.rightSplit as unknown as SidedockInternal;
    if (!sidebar) {
        return;
    }

    // Widening a collapsed sidebar just opens it at its previous width.
    if (sidebar.collapsed) {
        if (direction === "wider") {
            sidebar.expand();
        }
        return;
    }

    const currentWidth = sidebar.size ?? sidebar.containerEl.offsetWidth;
    const delta = direction === "wider" ? SIDEBAR_STEP : -SIDEBAR_STEP;
    const maxWidth = window.innerWidth - SIDEBAR_MIN_WIDTH;
    const newWidth = Math.min(maxWidth, Math.max(SIDEBAR_MIN_WIDTH, currentWidth + delta));

    if (newWidth === currentWidth) {
        return;
    }

    if (typeof sidebar.setSize === "function") {
        sidebar.setSize(newWidth);
    } else {
        sidebar.size = newWidth;
        sidebar.containerEl.style.width = `${newWidth}px`;
    }

    app.workspace.requestSaveLayout();
}

// Internal Obsidian API: WorkspaceTabs has an undocumented currentTab/selectTabIndex.
interface TabGroupInternal {
    children: unknown[];
    currentTab?: number;
    selectTabIndex?: (index: number) => void;
}

function collectTabGroups(node: unknown, groups: TabGroupInternal[]) {
    const children = (node as { children?: unknown[] })?.children;
    if (!Array.isArray(children)) {
        return;
    }
    if (children.length > 0 && children.every((c) => c instanceof WorkspaceLeaf)) {
        groups.push(node as TabGroupInternal);
        return;
    }
    children.forEach((child) => collectTabGroups(child, groups));
}

// Select the next (step = 1) or previous (step = -1) tab in the right sidebar,
// for example Calendar -> Tags. Wraps around at the ends.
export function cycleRightSidebarTab(app: App, step: 1 | -1) {
    const sidebar = app.workspace.rightSplit as unknown as SidedockInternal;
    if (!sidebar) {
        return;
    }

    const groups: TabGroupInternal[] = [];
    collectTabGroups(sidebar, groups);
    if (groups.length === 0) {
        return;
    }

    // Prefer the tab group that holds the focused leaf, otherwise the first one.
    const activeLeaf = app.workspace.getMostRecentLeaf(app.workspace.rightSplit);
    const group = groups.find((g) => g.children.includes(activeLeaf)) ?? groups[0]!;

    if (sidebar.collapsed) {
        sidebar.expand();
    }

    const count = group.children.length;
    if (count < 2) {
        return;
    }

    const current = group.currentTab ?? 0;
    const next = (((current + step) % count) + count) % count;

    if (typeof group.selectTabIndex === "function") {
        group.selectTabIndex(next);
    } else {
        void app.workspace.revealLeaf(group.children[next] as WorkspaceLeaf);
    }
}
