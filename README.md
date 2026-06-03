# NEOiD PTZ Deck

A Stream Deck plugin for controlling PTZ cameras over a local network — no joystick or dedicated software required.

---

## Supported Cameras

| Brand | Protocol | Notes |
|---|---|---|
| **NEOiD** | CGI/HTTP + VISCA fallback | No credentials required |
| **Telycam** | JSON API + VISCA fallback | Requires username and password |

---

## Actions

| Action | Description |
|---|---|
| **Select Camera** | Registers a camera by its IP address and makes it available to all other actions. NEOiD cameras briefly display a tally indicator — red for PGM, green for PVW — after a successful connection. |
| **Controls** | Pan/Tilt in 8 directions plus Home. Hold to move, release to stop. Supports Camera IP Default mode to control a fixed camera independently of the active selection. |
| **Zoom** | Continuous zoom in/out. Hold to zoom, release to stop. Speed is set by the Speed action. |
| **Focus** | Manual focus in, manual focus out, or auto focus. Hold for continuous manual adjustment, release to stop. |
| **Speed** | Cycles through 5 speed levels (slowest → slow → normal → fast → fastest) for a selected channel: Pan/Tilt, Zoom, or Focus. |
| **Preset** | Short press recalls the preset. Long press (1.1 s) saves the current camera position. NEOiD: optionally displays a snapshot of the saved position on the button. |
| **Tracking** | Short press cycles through tracking modes. Long press (0.9 s) toggles tracking on/off. Mode names are shown on the button; the button image reflects the active/inactive state. |
| **Backlight** | Toggles the camera backlight on or off. |
| **OSD Menu** | Opens, navigates, and closes the camera's on-screen display menu. |
| **Focus Dial** | Encoder-only (Stream Deck+). Rotate for manual focus near/far; press the encoder for auto focus. Auto-stops 200 ms after the last rotation. |
| **Zoom Dial** | Encoder-only (Stream Deck+). Rotate to zoom in or out. Auto-stops 200 ms after the last rotation. |

### Tracking modes

| Camera | Mode 1 | Mode 2 | Mode 3 |
|---|---|---|---|
| NEOiD | Presenter | Zone | Auto Frame |
| Telycam | Tracking | Head Framing | Body Framing |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- [Elgato Stream Deck app](https://www.elgato.com/downloads) v6.5 or later
- Stream Deck CLI:

```bash
npm install -g @elgato/cli
```

### Setup

```bash
git clone <repository-url>
cd ptzneoid
npm install
```

---

## How to Use

### 1. Register a camera

Drag the **Select Camera** action onto a button. In the Property Inspector:

- Enter the camera's **IP address** (e.g. `192.168.1.100`)
- Select the camera type: **NEOiD** or **Telycam**
- For Telycam, enter the username and password
- Press the button — the plugin tests the connection and registers the camera

All other actions will automatically use this camera from that point on.

### 2. Add controls

Drag any action onto a button and configure it in the Property Inspector. Each action shows only the options relevant to it.

### 3. Encoders (Stream Deck+)

- **Rotate** → sends the command continuously while rotating
- **Stop rotating** → the camera stops automatically after 200 ms
- **Push the Focus encoder** → triggers auto focus

### 4. Multi-camera setup with Camera IP Default

The **Controls** and **Preset** actions support a **Camera IP Default** mode that lets a button control a fixed camera IP independently of the currently active selection.

This is useful for multi-camera profiles where different buttons need to control different cameras at the same time — the active camera set via Select Camera does not affect these buttons.

> **Note:** Camera IP Default mode always uses NEOiD protocol by default. Telycam cameras in this mode use VISCA for movement and preset commands.

---

## Development

### Local development

```bash
# Link the plugin folder to the Stream Deck app (run once)
streamdeck link com.neoid.ptzneoid.sdPlugin

# Watch mode: recompiles and restarts the plugin on every change in src/
npm run watch
```

### Production build

```bash
npm run build
```

Outputs `com.neoid.ptzneoid.sdPlugin/bin/plugin.js`.

### Package for distribution

```bash
streamdeck pack com.neoid.ptzneoid.sdPlugin
```

Produces `com.neoid.ptzneoid.streamDeckPlugin` — double-click to install in the Stream Deck app.

---

## Requirements

- Stream Deck app v6.5+
- macOS 12+ or Windows 10+
- Node.js 20 (bundled with the plugin at runtime)
- PTZ camera accessible on the local network
