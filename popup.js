// ===== GAME EXTENSION POPUP =====

const LOCAL_URL = 'http://localhost:3002';
const PRODUCTION_URL = 'https://backend-ordgame-production.up.railway.app';

let backendUrl = PRODUCTION_URL;

const backendUrlInput = document.getElementById('backendUrl');
const useLocalBtn = document.getElementById('useLocalBtn');
const useProductionBtn = document.getElementById('useProductionBtn');
const testBtn = document.getElementById('testBtn');
const statusDiv = document.getElementById('status');
const helpText = document.getElementById('helpText');
const connectionIndicator = document.getElementById('connectionIndicator');
const connectionText = document.getElementById('connectionText');

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['gameBackendUrl']);

  if (stored.gameBackendUrl) {
    backendUrl = stored.gameBackendUrl;
    backendUrlInput.value = backendUrl;
    console.log('[Game Popup] Using stored URL:', backendUrl);
  } else {
    console.log('[Game Popup] No stored URL, auto-detecting...');
    backendUrl = await detectEnvironment();
    backendUrlInput.value = backendUrl;
    await chrome.storage.local.set({ gameBackendUrl: backendUrl });
  }

  updateButtonStates();
  await testConnection();
});

// Auto-detect local vs production
async function detectEnvironment() {
  console.log('[Game Popup] Testing local backend...');

  const isLocal = await testBackendHealth(LOCAL_URL);

  if (isLocal) {
    console.log('[Game Popup] ✓ Local backend detected');
    helpText.textContent = 'localhost:3002 - for development';
    return LOCAL_URL;
  }

  console.log('[Game Popup] ✓ Using production backend');
  helpText.textContent = 'Railway production - shared by all players';
  return PRODUCTION_URL;
}

// Test if backend is reachable
async function testBackendHealth(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${url}/health`, {
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return data.status === 'healthy';
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Update button active states
function updateButtonStates() {
  if (backendUrl === LOCAL_URL) {
    useLocalBtn.classList.add('active');
    useProductionBtn.classList.remove('active');
    helpText.textContent = 'localhost:3002 - for development';
  } else {
    useLocalBtn.classList.remove('active');
    useProductionBtn.classList.add('active');
    helpText.textContent = 'Railway production - shared by all players';
  }
}

// Switch to local backend
useLocalBtn.addEventListener('click', async () => {
  backendUrl = LOCAL_URL;
  backendUrlInput.value = LOCAL_URL;

  await chrome.storage.local.set({ gameBackendUrl: LOCAL_URL });
  updateButtonStates();
  showStatus('info', 'Switched to local backend. Testing...');

  await testConnection();
});

// Switch to production backend
useProductionBtn.addEventListener('click', async () => {
  backendUrl = PRODUCTION_URL;
  backendUrlInput.value = PRODUCTION_URL;

  await chrome.storage.local.set({ gameBackendUrl: PRODUCTION_URL });
  updateButtonStates();
  showStatus('info', 'Switched to production backend. Testing...');

  await testConnection();
});

// Test connection button
testBtn.addEventListener('click', async () => {
  showStatus('info', 'Testing connection...');
  await testConnection();
});

// Test connection to backend
async function testConnection() {
  connectionText.textContent = 'Testing connection...';
  connectionIndicator.className = 'connection-indicator checking';

  try {
    const response = await fetch(`${backendUrl}/health`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'healthy') {
      showStatus('success', `✓ Connected to backend!\n\nPlayers online: ${data.players || 0}\nBlocks placed: ${data.blocks || 0}\nUptime: ${Math.round(data.uptime)}s`);
      connectionIndicator.className = 'connection-indicator online';
      connectionText.textContent = 'Backend Online';
      return true;
    } else {
      throw new Error('Health check failed');
    }
  } catch (error) {
    showStatus('error', `✗ Connection failed: ${error.message}\n\nMake sure backend is running:\n  cd game-backend\n  yarn start`);
    connectionIndicator.className = 'connection-indicator offline';
    connectionText.textContent = 'Backend Offline';
    return false;
  }
}

// Show status message
function showStatus(type, message) {
  statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
}
