import loader from '@monaco-editor/loader';

let editorInstance: any = null;
let resizeObserver: ResizeObserver | null = null;
let resizeRaf: number | null = null;

export async function initEditor(
  container: HTMLElement,
  initialCode: string,
  onRunTests: () => void,
  onChange?: (val: string) => void
): Promise<any> {
  // Dispose old instance if present
  disposeEditor();

  const monaco = await loader.init();

  editorInstance = monaco.editor.create(container, {
    value: initialCode,
    language: 'typescript',
    theme: 'vs-dark',
    automaticLayout: false, // Disabled to prevent ResizeObserver layout thrashing / CPU spikes
    fontSize: 13,
    fontFamily: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
    minimap: { enabled: false },
    tabSize: 2,
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    folding: true,
    scrollbar: {
      verticalScrollbarSize: 6,
      horizontalScrollbarSize: 6
    }
  });

  // Register Ctrl+S / Cmd+S shortcut to run tests instantly
  editorInstance.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
    () => {
      onRunTests();
    }
  );

  if (onChange) {
    editorInstance.onDidChangeModelContent(() => {
      onChange(editorInstance.getValue());
    });
  }

  // Controlled, throttled resize observer without automaticLayout thrashing
  if (typeof ResizeObserver !== 'undefined') {
    let lastWidth = 0;
    let lastHeight = 0;

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (Math.abs(width - lastWidth) > 2 || Math.abs(height - lastHeight) > 2) {
          lastWidth = width;
          lastHeight = height;

          if (resizeRaf) cancelAnimationFrame(resizeRaf);
          resizeRaf = requestAnimationFrame(() => {
            if (editorInstance) {
              editorInstance.layout({ width, height });
            }
          });
        }
      }
    });

    resizeObserver.observe(container);
  }

  // Initial layout after mount
  setTimeout(() => {
    if (editorInstance && container) {
      const rect = container.getBoundingClientRect();
      editorInstance.layout({ width: rect.width, height: rect.height });
    }
  }, 50);

  // Expose on window for WebMCP tool access
  if (typeof window !== 'undefined') {
    (window as any).__prep_cockpit_editor = editorInstance;
  }

  return editorInstance;
}

export function setEditorValue(code: string): void {
  if (editorInstance) {
    editorInstance.setValue(code);
  }
}

export function getEditorValue(): string {
  return editorInstance ? editorInstance.getValue() : '';
}

export function layoutEditor(): void {
  if (editorInstance) {
    editorInstance.layout();
  }
}

export function disposeEditor(): void {
  if (resizeRaf) {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = null;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (editorInstance) {
    try {
      editorInstance.dispose();
    } catch {
      // ignore
    }
    editorInstance = null;
  }
  if (typeof window !== 'undefined') {
    (window as any).__prep_cockpit_editor = null;
  }
}
