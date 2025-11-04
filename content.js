

console.log('[Game Content] Content script loaded');
console.log('[Game Content] Running in:', window.location.href);
console.log('[Game Content] Is iframe?', window !== window.top);

const processedMessages = new Set();

window.addEventListener('message', async (event) => {
  const message = event.data;

  

  if (!message || !message.type || !message.type.startsWith('GAME_')) return;
  if (message.type.endsWith('_RESPONSE')) return; 

  

  const backgroundToPageMessages = ['GAME_CONNECTED', 'GAME_DISCONNECTED', 'GAME_STATE', 'GAME_PLAYER_JOINED',
    'GAME_PLAYER_LEFT', 'GAME_PLAYER_MOVED', 'GAME_BULLET_FIRED', 'GAME_BLOCK_PLACED', 'GAME_BLOCK_DESTROYED',
    'yourSocketId', 'playerStats'];
  if (backgroundToPageMessages.includes(message.type)) {
    console.log('[Game Content] Ignoring background-to-page message:', message.type);
    return;
  }

  

  

  const messageKey = `${message.type}_${message.requestId}`;
  if (processedMessages.has(messageKey)) {
    console.log('[Game Content] Ignoring duplicate message:', messageKey);
    return;
  }
  processedMessages.add(messageKey);

  

  if (processedMessages.size > 100) {
    const firstKey = processedMessages.values().next().value;
    processedMessages.delete(firstKey);
  }

  console.log('[Game Content] Message from page:', message.type, 'source:', event.origin);

  try {
    

    const backgroundMessage = {
      type: message.type,
      ...message
    };

    console.log('[Game Content] Sending to background:', backgroundMessage);

    const response = await chrome.runtime.sendMessage(backgroundMessage);

    console.log('[Game Content] Response from background:', response);

    

    const responseMessage = {
      type: message.type + '_RESPONSE',
      requestId: message.requestId,
      success: response.success,
      error: response.error,
      ...response
    };

    

    window.postMessage(responseMessage, '*');

    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(responseMessage, '*');
      } catch (e) {
        console.log('[Game Content] Could not send to parent:', e.message);
      }
    }

    if (window.top && window.top !== window) {
      try {
        window.top.postMessage(responseMessage, '*');
      } catch (e) {
        console.log('[Game Content] Could not send to top:', e.message);
      }
    }

    

    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow.postMessage(responseMessage, '*');
      } catch (e) {
        

      }
    });

    console.log(`[Game Content] Response sent to all contexts + ${iframes.length} iframes`);

  } catch (error) {
    console.error('[Game Content] Error forwarding message:', error);

    const errorMessage = {
      type: message.type + '_RESPONSE',
      requestId: message.requestId,
      success: false,
      error: error.message
    };

    

    window.postMessage(errorMessage, '*');
    if (window.parent && window.parent !== window) {
      try { window.parent.postMessage(errorMessage, '*'); } catch (e) {}
    }
    if (window.top && window.top !== window) {
      try { window.top.postMessage(errorMessage, '*'); } catch (e) {}
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Game Content] Message from background to relay:', message.type);

  

  window.postMessage(message, '*');

  

  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage(message, '*');
    } catch (e) {}
  }

  

  if (window.top && window.top !== window) {
    try {
      window.top.postMessage(message, '*');
    } catch (e) {}
  }

  

  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    try {
      iframe.contentWindow.postMessage(message, '*');
    } catch (e) {}
  });

  console.log(`[Game Content] Relayed to all contexts + ${iframes.length} iframes`);

  sendResponse({ received: true });
  return true;
});

console.log('[Game Content] Ready to relay messages (iframe-aware)');
