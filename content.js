// ===== GAME EXTENSION CONTENT SCRIPT =====
// Relays postMessage between game HTML and background script

console.log('[Game Content] Content script loaded');
console.log('[Game Content] Running in:', window.location.href);
console.log('[Game Content] Is iframe?', window !== window.top);

// Track processed messages to avoid duplicates
const processedMessages = new Set();

// Listen for messages from the webpage (Game HTML)
window.addEventListener('message', async (event) => {
  const message = event.data;

  // Only handle game messages (but NOT responses!)
  if (!message || !message.type || !message.type.startsWith('GAME_')) return;
  if (message.type.endsWith('_RESPONSE')) return; // Don't handle our own responses

  // Don't relay messages that are FROM background TO page (only relay page TO background)
  const backgroundToPageMessages = ['GAME_CONNECTED', 'GAME_DISCONNECTED', 'GAME_STATE', 'GAME_PLAYER_JOINED',
    'GAME_PLAYER_LEFT', 'GAME_PLAYER_MOVED', 'GAME_BULLET_FIRED', 'GAME_BLOCK_PLACED', 'GAME_BLOCK_DESTROYED',
    'yourSocketId', 'playerStats'];
  if (backgroundToPageMessages.includes(message.type)) {
    console.log('[Game Content] Ignoring background-to-page message:', message.type);
    return;
  }

  // CRITICAL: Deduplicate messages by requestId
  // Messages are sent to parent AND top, so we may see duplicates
  const messageKey = `${message.type}_${message.requestId}`;
  if (processedMessages.has(messageKey)) {
    console.log('[Game Content] Ignoring duplicate message:', messageKey);
    return;
  }
  processedMessages.add(messageKey);

  // Clean up old messages (keep only last 100)
  if (processedMessages.size > 100) {
    const firstKey = processedMessages.values().next().value;
    processedMessages.delete(firstKey);
  }

  console.log('[Game Content] Message from page:', message.type, 'source:', event.origin);

  try {
    // Forward to background script
    const backgroundMessage = {
      type: message.type,
      ...message
    };

    console.log('[Game Content] Sending to background:', backgroundMessage);

    const response = await chrome.runtime.sendMessage(backgroundMessage);

    console.log('[Game Content] Response from background:', response);

    // Create response message (keep same requestId for promise resolution)
    const responseMessage = {
      type: message.type + '_RESPONSE',
      requestId: message.requestId,
      success: response.success,
      error: response.error,
      ...response
    };

    // Send to all window contexts
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

    // Send to all iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow.postMessage(responseMessage, '*');
      } catch (e) {
        // Cross-origin iframes will fail - that's ok
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

    // Send error to all contexts
    window.postMessage(errorMessage, '*');
    if (window.parent && window.parent !== window) {
      try { window.parent.postMessage(errorMessage, '*'); } catch (e) {}
    }
    if (window.top && window.top !== window) {
      try { window.top.postMessage(errorMessage, '*'); } catch (e) {}
    }
  }
});

// Listen for messages from background script (to relay to game)
// This handles notifications like GAME_CONNECTED, GAME_STATE, etc.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Game Content] Message from background to relay:', message.type);

  // Send to current window
  window.postMessage(message, '*');

  // Send to parent (if in iframe)
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage(message, '*');
    } catch (e) {}
  }

  // Send to top window
  if (window.top && window.top !== window) {
    try {
      window.top.postMessage(message, '*');
    } catch (e) {}
  }

  // Send to all iframes
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
