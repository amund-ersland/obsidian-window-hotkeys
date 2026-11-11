import { Plugin, WorkspaceLeaf } from "obsidian";
import { resizeRightSidebar } from "./sidebar";

const MAX_COLUMNS = 3;
const MAX_ROWS = 2;
const RESIZE_STEP = 50; // Pixels to resize by

export default class WindowHotkeysPlugin extends Plugin {
    async onload() {
        // Move tab to the right
        this.addCommand({
            id: "move-tab-right",
            name: "Move tab to right split",
            callback: () => {
                this.moveTabToDirection("right");
            },
        });

        // Move tab to the left
        this.addCommand({
            id: "move-tab-left",
            name: "Move tab to left split",
            callback: () => {
                this.moveTabToDirection("left");
            },
        });

        // Move tab up
        this.addCommand({
            id: "move-tab-up",
            name: "Move tab to upper split",
            callback: () => {
                this.moveTabToDirection("up");
            },
        });

        // Move tab down
        this.addCommand({
            id: "move-tab-down",
            name: "Move tab to lower split",
            callback: () => {
                this.moveTabToDirection("down");
            },
        });

        // Resize tab group right
        this.addCommand({
            id: "resize-tab-right",
            name: "Stretch tab group to the right",
            callback: () => {
                this.resizeTabGroup("right");
            },
        });

        // Resize tab group left
        this.addCommand({
            id: "resize-tab-left",
            name: "Stretch tab group to the left",
            callback: () => {
                this.resizeTabGroup("left");
            },
        });

        // Resize tab group up
        this.addCommand({
            id: "resize-tab-up",
            name: "Stretch tab group upward",
            callback: () => {
                this.resizeTabGroup("up");
            },
        });

        // Resize tab group down
        this.addCommand({
            id: "resize-tab-down",
            name: "Stretch tab group downward",
            callback: () => {
                this.resizeTabGroup("down");
            },
        });

        // Resize right sidebar
        this.addCommand({
            id: "resize-right-sidebar-wider",
            name: "Widen right sidebar",
            callback: () => {
                resizeRightSidebar(this.app, "wider");
            },
        });

        this.addCommand({
            id: "resize-right-sidebar-narrower",
            name: "Narrow right sidebar",
            callback: () => {
                resizeRightSidebar(this.app, "narrower");
            },
        });
    }

    moveTabToDirection(direction: "left" | "right" | "up" | "down") {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) {
            return;
        }

        // Get layout information
        const layoutInfo = this.getLayoutInfo();
        const currentPosition = this.getLeafPosition(activeLeaf, layoutInfo);

        if (!currentPosition) {
            return;
        }

        // Determine target position with wrapping
        const targetPosition = { ...currentPosition };
        
        if (direction === "right") {
            targetPosition.col = (currentPosition.col + 1) % MAX_COLUMNS;
        } else if (direction === "left") {
            targetPosition.col = (currentPosition.col - 1 + MAX_COLUMNS) % MAX_COLUMNS;
        } else if (direction === "down") {
            targetPosition.row = (currentPosition.row + 1) % MAX_ROWS;
        } else if (direction === "up") {
            targetPosition.row = (currentPosition.row - 1 + MAX_ROWS) % MAX_ROWS;
        }

        // Find or create target split at the target position
        let targetLeaf = this.findSplitAtPosition(targetPosition, layoutInfo);

        // If no split exists at target position, create it
        if (!targetLeaf) {
            targetLeaf = this.createSplitAtPosition(targetPosition, activeLeaf);
        }

        if (targetLeaf && targetLeaf !== activeLeaf) {
            // Move the active leaf to the target split
            const view = activeLeaf.view;
            const state = view.getState();
            const eState = (view as any).getEphemeralState?.() || {};

            // Detach the leaf from its current parent
            activeLeaf.detach();

            // Create new leaf in target parent and restore the view
            const newLeaf = this.app.workspace.createLeafInParent(targetLeaf.parent, -1);
            newLeaf.setViewState({
                type: view.getViewType(),
                state: state,
                active: true,
            });

            // Restore ephemeral state
            if ((newLeaf.view as any).setEphemeralState) {
                (newLeaf.view as any).setEphemeralState(eState);
            }

            // Set the new leaf as active
            this.app.workspace.setActiveLeaf(newLeaf, { focus: true });
        }
    }

    getLayoutInfo(): any {
        const rootSplit = this.app.workspace.rootSplit;
        const layout = {
            columns: [] as any[],
            columnCount: 0,
            maxRows: 0
        };

        // Check if root has vertical split (columns)
        if ((rootSplit as any).direction === "vertical") {
            layout.columns = (rootSplit as any).children || [];
            layout.columnCount = layout.columns.length;
            
            // Check each column for horizontal splits (rows)
            for (const col of layout.columns) {
                if ((col as any).direction === "horizontal") {
                    const rowCount = (col as any).children?.length || 1;
                    layout.maxRows = Math.max(layout.maxRows, rowCount);
                } else {
                    layout.maxRows = Math.max(layout.maxRows, 1);
                }
            }
        } else if ((rootSplit as any).direction === "horizontal") {
            // Single column with multiple rows
            layout.columnCount = 1;
            layout.columns = [rootSplit];
            layout.maxRows = (rootSplit as any).children?.length || 1;
        } else {
            // Single pane
            layout.columnCount = 1;
            layout.columns = [rootSplit];
            layout.maxRows = 1;
        }

        return layout;
    }

    getLeafPosition(leaf: WorkspaceLeaf, layoutInfo: any): { row: number; col: number } | null {
        // Find which column and row the leaf belongs to
        for (let colIndex = 0; colIndex < layoutInfo.columns.length; colIndex++) {
            const column = layoutInfo.columns[colIndex];
            
            if ((column as any).direction === "horizontal") {
                // Column has multiple rows
                const rows = (column as any).children || [];
                for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    const row = rows[rowIndex];
                    if (this.splitContainsLeaf(row, leaf)) {
                        return { col: colIndex, row: rowIndex };
                    }
                }
            } else {
                // Column is a single row
                if (this.splitContainsLeaf(column, leaf)) {
                    return { col: colIndex, row: 0 };
                }
            }
        }

        return null;
    }

    splitContainsLeaf(split: any, leaf: WorkspaceLeaf): boolean {
        if (split === leaf) {
            return true;
        }
        if (split.children) {
            for (const child of split.children) {
                if (this.splitContainsLeaf(child, leaf)) {
                    return true;
                }
            }
        }
        return false;
    }

    findSplitAtPosition(position: { row: number; col: number }, layoutInfo: any): WorkspaceLeaf | null {
        if (position.col >= layoutInfo.columns.length) {
            return null;
        }

        const column = layoutInfo.columns[position.col];

        if ((column as any).direction === "horizontal") {
            const rows = (column as any).children || [];
            if (position.row >= rows.length) {
                return null;
            }
            const row = rows[position.row];
            return this.getFirstLeafInSplit(row);
        } else {
            if (position.row === 0) {
                return this.getFirstLeafInSplit(column);
            }
            return null;
        }
    }

    createSplitAtPosition(targetPosition: { row: number; col: number }, currentLeaf: WorkspaceLeaf): WorkspaceLeaf | null {
        const layoutInfo = this.getLayoutInfo();
        const currentPosition = this.getLeafPosition(currentLeaf, layoutInfo);

        if (!currentPosition) {
            return null;
        }

        // Determine what needs to be created
        const needNewColumn = targetPosition.col >= layoutInfo.columnCount;
        const needNewRow = targetPosition.row > 0;

        let targetLeaf: WorkspaceLeaf | null = null;

        if (needNewColumn && layoutInfo.columnCount < MAX_COLUMNS) {
            // Create a new column
            targetLeaf = this.app.workspace.createLeafBySplit(currentLeaf, "vertical", targetPosition.col > currentPosition.col);
        } else if (!needNewColumn && needNewRow) {
            // Need to add a row to an existing column
            const column = layoutInfo.columns[targetPosition.col];
            const existingLeaf = this.getFirstLeafInSplit(column);
            
            if (existingLeaf) {
                const columnLayoutInfo = this.getColumnRowCount(column);
                if (columnLayoutInfo < MAX_ROWS) {
                    targetLeaf = this.app.workspace.createLeafBySplit(existingLeaf, "horizontal", targetPosition.row > 0);
                } else {
                    // Max rows reached, return existing leaf at row 0
                    targetLeaf = this.findSplitAtPosition({ col: targetPosition.col, row: 0 }, layoutInfo);
                }
            }
        } else {
            // Cannot create more splits, return existing leaf at that position
            targetLeaf = this.findSplitAtPosition(targetPosition, layoutInfo);
        }

        return targetLeaf;
    }

    getColumnRowCount(column: any): number {
        if ((column as any).direction === "horizontal") {
            return (column as any).children?.length || 1;
        }
        return 1;
    }

    getFirstLeafInSplit(split: any): WorkspaceLeaf | null {
        if (split.children) {
            for (const child of split.children) {
                const leaf = this.getFirstLeafInSplit(child);
                if (leaf) {
                    return leaf;
                }
            }
        } else if (split instanceof WorkspaceLeaf) {
            return split;
        }
        return null;
    }

    resizeTabGroup(direction: "left" | "right" | "up" | "down") {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) {
            return;
        }

        // Find the parent container of the active leaf
        const parent = activeLeaf.parent;
        if (!parent) {
            return;
        }

        // Determine if we need to resize horizontal or vertical split
        const isHorizontalResize = direction === "left" || direction === "right";

        // Traverse up to find the correct split and sibling
        let current: any = activeLeaf.parent;
        let targetSplit: any = null;
        let parentSplit: any = null;

        while (current) {
            if (current.parent) {
                const parentDirection = (current.parent as any).direction;
                
                // For horizontal resize (left/right), we need a vertical split parent
                // For vertical resize (up/down), we need a horizontal split parent
                if ((isHorizontalResize && parentDirection === "vertical") ||
                    (!isHorizontalResize && parentDirection === "horizontal")) {
                    targetSplit = current;
                    parentSplit = current.parent;
                    break;
                }
            }
            current = current.parent;
        }

        if (!targetSplit || !parentSplit) {
            return;
        }

        // Get the children array and find our target's index
        const children = (parentSplit as any).children;
        const targetIndex = children.indexOf(targetSplit);

        if (targetIndex === -1 || children.length < 2) {
            return;
        }

        // Determine which edge to expand/shrink based on position
        // For leftmost (index 0): right = expand (push right edge), left = shrink (pull right edge)
        // For rightmost (last index): left = expand (push left edge), right = shrink (pull left edge)
        // For middle: try both sides
        
        const isFirstInSplit = targetIndex === 0;
        const isLastInSplit = targetIndex === children.length - 1;

        let shouldExpand: boolean;
        let siblingIndex: number;

        if (isHorizontalResize) {
            if (isFirstInSplit) {
                // Leftmost group
                shouldExpand = direction === "right";
                siblingIndex = targetIndex + 1; // Always affect right sibling
            } else if (isLastInSplit) {
                // Rightmost group
                shouldExpand = direction === "left";
                siblingIndex = targetIndex - 1; // Always affect left sibling
            } else {
                // Middle group - expand toward the direction, shrink away from it
                shouldExpand = true; // Always expand toward the pressed direction
                siblingIndex = direction === "right" ? targetIndex + 1 : targetIndex - 1;
            }
        } else {
            // Vertical resize
            if (isFirstInSplit) {
                // Top group
                shouldExpand = direction === "down";
                siblingIndex = targetIndex + 1; // Always affect bottom sibling
            } else if (isLastInSplit) {
                // Bottom group
                shouldExpand = direction === "up";
                siblingIndex = targetIndex - 1; // Always affect top sibling
            } else {
                // Middle group
                shouldExpand = true;
                siblingIndex = direction === "down" ? targetIndex + 1 : targetIndex - 1;
            }
        }

        if (siblingIndex < 0 || siblingIndex >= children.length) {
            return;
        }

        const sibling = children[siblingIndex];

        // Calculate size adjustment
        const increment = shouldExpand ? RESIZE_STEP : -RESIZE_STEP;

        const currentSize = (targetSplit as any).size || 100;
        const newSize = Math.max(50, currentSize + increment);

        const siblingSize = (sibling as any).size || 100;
        const siblingNewSize = Math.max(50, siblingSize - increment);

        // Only apply if both sizes are valid
        if (newSize < 50 || siblingNewSize < 50) {
            return;
        }

        // Apply new sizes
        (targetSplit as any).size = newSize;
        (sibling as any).size = siblingNewSize;

        // Force layout update
        if ((parentSplit as any).containerEl) {
            // Update flex-grow values for the children
            if ((targetSplit as any).containerEl) {
                (targetSplit as any).containerEl.style.flexGrow = String(newSize);
            }
            if ((sibling as any).containerEl) {
                (sibling as any).containerEl.style.flexGrow = String(siblingNewSize);
            }
        }

        // Trigger workspace layout
        this.app.workspace.requestSaveLayout();
    }
}
