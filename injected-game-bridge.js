// ===== 3D GAME BRIDGE =====
// Injected into page context to provide Socket.io and backend URL

(function() {
  'use strict';

  console.log('[Game Bridge] Initializing in page context');

  // Set backend URL
  window.GAME_BACKEND_URL = 'http://localhost:3002';

  // Load Socket.io from CDN if not already loaded
  if (typeof io === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
    script.onload = () => {
      console.log('[Game Bridge] Socket.io loaded');
      window.dispatchEvent(new CustomEvent('socketio-ready'));
    };
    (document.head || document.documentElement).appendChild(script);
  } else {
    console.log('[Game Bridge] Socket.io already available');
    window.dispatchEvent(new CustomEvent('socketio-ready'));
  }

  console.log('[Game Bridge] Ready - Backend URL:', window.GAME_BACKEND_URL);
})();
