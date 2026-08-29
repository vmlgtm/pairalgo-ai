import './style.css';
import { seedInitialData } from './engine/db';
import { registerAllTools } from './webmcp/register';
import { renderDashboard } from './ui/dashboard';
import { renderWorkspace } from './ui/workspace';
import { setClientState } from './webmcp/state';

async function initApp() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  // Check URL query parameters for ?demo=true or ?demo=1
  const urlParams = new URLSearchParams(window.location.search);
  const isDemo = urlParams.get('demo') === 'true' || urlParams.get('demo') === '1';

  // Seed IndexedDB database
  await seedInitialData(isDemo);

  // Register WebMCP Tools
  registerAllTools();

  // Simple Router
  const handleRoute = async () => {
    const hash = window.location.hash;

    if (hash.startsWith('#p=') || hash.startsWith('#problem=')) {
      const problemId = hash.includes('#p=')
        ? hash.replace('#p=', '')
        : hash.replace('#problem=', '');

      if (problemId) {
        await renderWorkspace(
          appContainer,
          problemId,
          () => {
            window.location.hash = '';
          },
          (nextId) => {
            window.location.hash = `#p=${nextId}`;
          }
        );
        return;
      }
    }

    // Default to Dashboard
    setClientState({ view: 'dashboard' });
    await renderDashboard(appContainer, (problemId) => {
      window.location.hash = `#p=${problemId}`;
    });
  };

  window.addEventListener('hashchange', handleRoute);
  await handleRoute();
}

// Boot application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
