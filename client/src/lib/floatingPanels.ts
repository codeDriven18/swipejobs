type PanelEntry = { id: string; close: () => void };

let activePanel: PanelEntry | null = null;

/** Ensures only one floating panel/menu is open at a time. */
export function registerFloatingPanel(id: string, close: () => void): void {
  if (activePanel && activePanel.id !== id) {
    activePanel.close();
  }
  activePanel = { id, close };
}

export function unregisterFloatingPanel(id: string): void {
  if (activePanel?.id === id) {
    activePanel = null;
  }
}

export function closeActiveFloatingPanel(): void {
  activePanel?.close();
  activePanel = null;
}

export function getActiveFloatingPanelId(): string | null {
  return activePanel?.id ?? null;
}
