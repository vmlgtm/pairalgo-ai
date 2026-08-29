import type { ClientState } from '../engine/types';

let currentClientState: ClientState = {
  view: 'dashboard',
  userReadiness: 0,
  streakDays: 0,
  targetFilter: 'all'
};

const listeners = new Set<(state: ClientState) => void>();

/**
 * Gets the current ambient client state.
 */
export function getClientState(): ClientState {
  return { ...currentClientState };
}

/**
 * Updates client state and synchronizes with WebMCP agent protocol.
 */
export function setClientState(partial: Partial<ClientState>): ClientState {
  currentClientState = {
    ...currentClientState,
    ...partial
  };

  // 1. Sync with standard WebMCP navigator.tools if supported
  if (typeof navigator !== 'undefined' && (navigator as any).tools?.setClientState) {
    try {
      (navigator as any).tools.setClientState(currentClientState);
    } catch (e) {
      console.warn('[WebMCP] navigator.tools.setClientState failed:', e);
    }
  }

  // 2. Sync with document.modelContext fallback
  if (typeof document !== 'undefined' && (document as any).modelContext?.setClientState) {
    try {
      (document as any).modelContext.setClientState(currentClientState);
    } catch (e) {
      console.warn('[WebMCP] document.modelContext.setClientState failed:', e);
    }
  }

  // 3. Store on window for inspection
  if (typeof window !== 'undefined') {
    (window as any).__webmcp_client_state = currentClientState;
    window.dispatchEvent(
      new CustomEvent('prep-cockpit:state-change', { detail: currentClientState })
    );
  }

  // Notify internal listeners
  for (const listener of listeners) {
    listener(currentClientState);
  }

  return currentClientState;
}

/**
 * Subscribe to state changes.
 */
export function onClientStateChange(callback: (state: ClientState) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
