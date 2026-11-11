import { App } from "obsidian";

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
