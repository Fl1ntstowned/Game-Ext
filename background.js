console.log('[Game Extension] Background service worker started');

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Game Extension] Extension installed/updated', details.reason);

  if (details.reason === 'install') {
    console.log('[Game Extension] First time installation');
    chrome.storage.local.set({
      gameBackendUrl: 'http://localhost:3002'
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Game Extension] Browser startup - service worker active');
});

importScripts('socket.io.min.js');

let backendUrl = null;

const tabSockets = new Map(); 

console.log('[Game Background] Socket.io loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  console.log('[Game Background] Message:', message.type, 'from tab:', tabId);

  

  if (message.type === 'GAME_INIT') {
    handleGameInit(tabId).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      console.error('[Game Background] Init error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  

  const tabSocket = tabSockets.get(tabId);
  if (!tabSocket || !tabSocket.socket || !tabSocket.socket.connected) {
    sendResponse({ success: false, error: 'Not connected to backend' });
    return true;
  }

  

  if (message.type === 'GAME_SELECT_CHARACTER') {
    tabSocket.socket.emit('selectCharacter', message.character);
    tabSocket.character = message.character;
    console.log('[Game Background] Tab', tabId, 'selected:', message.character);
    sendResponse({ success: true });
    return true;
  }

  

  if (message.type === 'GAME_SET_PLAYER_NAME') {
    tabSocket.socket.emit('setPlayerName', message.playerName);
    console.log('[Game Background] Tab', tabId, 'set player name:', message.playerName);
    sendResponse({ success: true });
    return true;
  }

  

  if (message.type === 'GAME_PLAYER_MOVE') {
    tabSocket.socket.emit('playerMove', {
      position: message.position,
      rotation: message.rotation
    });
    sendResponse({ success: true });
    return true;
  }

  

  if (message.type === 'GAME_PLAYER_SHOOT') {
    tabSocket.socket.emit('playerShoot', {
      position: message.position,
      direction: message.direction,
      character: message.character 

    });
    console.log('[Game Background] Tab', tabId, 'shot');
    sendResponse({ success: true });
    return true;
  }

  

  if (message.type === 'GAME_PLACE_BLOCK') {
    tabSocket.socket.emit('placeBlock', {
      id: message.id,
      position: message.position,
      blockType: message.blockType || 'grass'
    });
    console.log('[Game Background] Tab', tabId, 'placed block');
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GAME_DESTROY_BLOCK') {
    tabSocket.socket.emit('destroyBlock', message.id);
    console.log('[Game Background] Tab', tabId, 'destroyed block:', message.id);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GAME_PLAYER_DIED') {
    tabSocket.socket.emit('playerDied', { killerId: message.killerId });
    console.log('[Game Background] Tab', tabId, 'player died, killer:', message.killerId);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GAME_PLAYER_RESPAWNED') {
    tabSocket.socket.emit('playerRespawned');
    console.log('[Game Background] Tab', tabId, 'player respawned');
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GAME_REQUEST_GLOBAL_STATS') {
    tabSocket.socket.emit('requestGlobalStats', { playerName: message.playerName });
    console.log('[Game Background] Tab', tabId, 'requesting global stats for:', message.playerName);
    sendResponse({ success: true });
    return true;
  }
});

async function handleGameInit(tabId) {
  console.log('[Game Background] GAME_INIT for tab:', tabId);

  

  if (!backendUrl) {
    const stored = await chrome.storage.local.get('gameBackendUrl');
    backendUrl = stored.gameBackendUrl || 'http://localhost:3002';
    console.log('[Game Background] Using backend URL:', backendUrl);
  }

  

  if (tabSockets.has(tabId)) {
    const existing = tabSockets.get(tabId);
    if (existing.socket && existing.socket.connected) {
      console.log('[Game Background] Tab', tabId, 'already has active socket');
      sendToTab(tabId, { type: 'GAME_CONNECTED' });
      return;
    } else {
      

      if (existing.socket) {
        existing.socket.disconnect();
      }
      tabSockets.delete(tabId);
    }
  }

  

  await createSocketForTab(tabId);
}

async function createSocketForTab(tabId) {
  console.log('[Game Background] Creating socket for tab:', tabId);

  

  const socketConfig = {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10
  };

  const socket = io(backendUrl, socketConfig);

  

  tabSockets.set(tabId, {
    socket: socket,
    character: null
  });

  socket.on('connect', () => {
    console.log('[Game Background] Tab', tabId, 'WebSocket connected, Socket ID:', socket.id);
    sendToTab(tabId, { type: 'GAME_CONNECTED' });
  });

  socket.on('disconnect', (reason) => {
    console.log('[Game Background] Tab', tabId, 'WebSocket disconnected, reason:', reason);
    sendToTab(tabId, { type: 'GAME_DISCONNECTED' });

    if (reason === 'io server disconnect' || reason === 'io client disconnect') {
      console.log('[Game Background] Tab', tabId, 'permanent disconnect, cleaning up');
      tabSockets.delete(tabId);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('[Game Background] Tab', tabId, 'connection error:', error.message);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('[Game Background] Tab', tabId, 'reconnection attempt:', attemptNumber);
  });

  socket.on('reconnect_failed', () => {
    console.error('[Game Background] Tab', tabId, 'reconnection failed after max attempts');
    tabSockets.delete(tabId);
    sendToTab(tabId, { type: 'GAME_DISCONNECTED' });
  });

  

  socket.on('yourSocketId', (socketId) => {
    console.log('[Game Background] Tab', tabId, 'received socket ID:', socketId);
    sendToTab(tabId, { type: 'yourSocketId', id: socketId });
  });

  socket.on('gameState', (state) => {
    console.log('[Game Background] Tab', tabId, 'received gameState');
    sendToTab(tabId, { type: 'GAME_STATE', state });
  });

  socket.on('playerJoined', (data) => {
    console.log('[Game Background] Tab', tabId, 'player joined:', data.character);
    sendToTab(tabId, { type: 'GAME_PLAYER_JOINED', ...data });
  });

  socket.on('playerLeft', (id) => {
    console.log('[Game Background] Tab', tabId, 'player left:', id);
    sendToTab(tabId, { type: 'GAME_PLAYER_LEFT', id });
  });

  socket.on('playerMoved', (data) => {
    sendToTab(tabId, { type: 'GAME_PLAYER_MOVED', ...data });
  });

  socket.on('bulletFired', (bullet) => {
    console.log('[Game Background] Tab', tabId, 'bullet fired');
    sendToTab(tabId, { type: 'GAME_BULLET_FIRED', bullet });
  });

  socket.on('blockPlaced', (block) => {
    console.log('[Game Background] Tab', tabId, 'block placed');
    sendToTab(tabId, { type: 'GAME_BLOCK_PLACED', block });
  });

  socket.on('blockDestroyed', (id) => {
    console.log('[Game Background] Tab', tabId, 'block destroyed:', id);
    sendToTab(tabId, { type: 'GAME_BLOCK_DESTROYED', id });
  });

  socket.on('playerKilled', (data) => {
    console.log('[Game Background] Tab', tabId, 'player killed:', data);
    sendToTab(tabId, { type: 'GAME_PLAYER_KILLED', ...data });
  });

  socket.on('playerStats', (stats) => {
    console.log('[Game Background] Tab', tabId, 'received player stats');
    sendToTab(tabId, { type: 'GAME_PLAYER_STATS', stats });
  });

  socket.on('matchEnded', (data) => {
    console.log('[Game Background] Tab', tabId, 'match ended:', data);
    sendToTab(tabId, { type: 'GAME_MATCH_ENDED', ...data });
  });

  socket.on('globalStats', (stats) => {
    console.log('[Game Background] Tab', tabId, 'received global stats:', stats);
    sendToTab(tabId, { type: 'GAME_GLOBAL_STATS', stats });
  });

  socket.on('playerRespawned', (playerId) => {
    console.log('[Game Background] Tab', tabId, 'player respawned:', playerId);
    sendToTab(tabId, { type: 'GAME_PLAYER_RESPAWNED', id: playerId });
  });

  socket.on('matchRestarting', (data) => {
    console.log('[Game Background] Tab', tabId, 'match restarting in', data.countdown, 'seconds');
    sendToTab(tabId, { type: 'GAME_MATCH_RESTARTING', countdown: data.countdown });
  });

  socket.on('matchRestarted', () => {
    console.log('[Game Background] Tab', tabId, 'match restarted');
    sendToTab(tabId, { type: 'GAME_MATCH_RESTARTED' });
  });
}

async function sendToTab(tabId, data) {
  try {
    await chrome.tabs.sendMessage(tabId, data);
  } catch (error) {
    console.log('[Game Background] Failed to send to tab', tabId, '- tab may be closed');

    

    const tabSocket = tabSockets.get(tabId);
    if (tabSocket && tabSocket.socket) {
      tabSocket.socket.disconnect();
    }
    tabSockets.delete(tabId);
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  const tabSocket = tabSockets.get(tabId);

  if (tabSocket) {
    console.log('[Game Background] Tab', tabId, 'closed, disconnecting socket');

    if (tabSocket.socket) {
      tabSocket.socket.disconnect();
    }

    tabSockets.delete(tabId);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tabSockets.has(tabId)) {
    console.log('[Game Background] Tab', tabId, 'is reloading, disconnecting socket');

    const tabSocket = tabSockets.get(tabId);
    if (tabSocket && tabSocket.socket) {
      tabSocket.socket.disconnect();
    }

    tabSockets.delete(tabId);
  }
});

console.log('[Game Extension] Background service worker ready');
