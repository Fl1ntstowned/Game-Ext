# 🎮 3D Multiplayer Game Extension

Browser extension for playing a multiplayer 3D game on Bitcoin Ordinals.

## 🚀 Quick Start

### 1. Install the Extension

**Chrome / Edge / Brave:**

1. Download or clone this repository
2. Open your browser and go to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `game-extension` folder
6. The extension is now installed! 🎉

**Firefox:**

1. Download or clone this repository
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select the `manifest.json` file from the `game-extension` folder

### 2. Play the Game

1. **Copy the game HTML** from `multiplayer-game.html` in this repository
2. **Inscribe it** on Bitcoin as an inscription (or use the Unisat Ordinals Viewer for testing)
3. **Open the inscription** in your browser
4. The extension will automatically connect to the backend server
5. **Enter your name** and **select a character**
6. **Start playing!**

## 🎯 Controls

- **WASD** - Move (strafe)
- **SPACE** - Jump
- **Mouse** - Aim (move mouse to look around)
- **Left Click** - Shoot
- **E** - Place block
- **ESC** - Pause

## ⚙️ Backend Configuration

The extension connects to the production backend by default:
- **Production**: `https://backend-ordgame-production.up.railway.app`

### Switching Between Local and Production

1. Click the extension icon in your browser toolbar
2. Choose:
   - **🏠 Local** - Connect to `http://localhost:3002` (for development)
   - **☁️ Production** - Connect to live server (for playing with others)
3. Click **Test Connection** to verify

### Running Local Backend (Optional)

If you want to run your own backend server:

```bash
# Clone the backend repository
git clone https://github.com/Fl1ntstowned/Backend-ordgame.git
cd Backend-ordgame

# Install dependencies
yarn install

# Start the server
yarn start
```

Then switch the extension to **Local** mode.

## 📁 Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker for Socket.io connections
- `content.js` - Content script injected into game pages
- `popup.html` / `popup.js` - Extension settings popup
- `socket.io.min.js` - Socket.io client library
- `multiplayer-game.html` - The actual game (inscribe this on Bitcoin)

## 🎨 Features

- **Real-time Multiplayer** - Play with others in real-time using Socket.io
- **6 Unique Characters** - Soldier, Robot, Ninja, Wizard, Knight, Archer
- **Persistent Stats** - Kills, deaths, and scores tracked across games
- **3D Graphics** - Built with Three.js and custom GLTF models
- **Block Building** - Place and destroy blocks in the arena
- **FPS-Style Controls** - Mouse aiming with camera-relative movement

## 🔧 Troubleshooting

**Extension not connecting:**
- Check the extension popup to see connection status
- Make sure the backend server is running (green indicator = online)
- Try switching between Local/Production modes

**Game not loading:**
- Open browser console (F12) and check for errors
- Make sure you're viewing the game through an inscription viewer
- Verify the HTML was inscribed correctly

**Mouse controls not working:**
- Make sure you've selected a character
- Move your mouse within the game window
- Check console for "Mouse moving" messages

## 🌐 Backend Repository

The backend server code is available at:
- [Backend-ordgame](https://github.com/Fl1ntstowned/Backend-ordgame.git)

## 📝 License

MIT

---

**Built with ❤️ for Bitcoin Ordinals**
