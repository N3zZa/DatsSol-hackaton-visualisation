# DatsSol Hackaton – 3D Space Visualization

Interactive 3D map for the DatsSol arena game.  
Built with React, Three.js (React Three Fiber), and TypeScript.

## Features

- 🪐 **Real-time arena data** – auto‑refreshes every second via REST API  
- 🏭 **3D units** – main laboratory, factories, enemies, beavers, mountains  
- 🌿 **Terraformed cells** – progress & degradation indicators with grass rendering  
- 🌪 **Weather effects** – sandstorms and earthquakes (visual + alerts)  
- 📊 **Upgrade panel** – show upgrade tiers and points  
- 🎥 **Smart camera** – click on any base to instantly jump to its location  
- 💾 **Collapsible UI panels** – left info panel and right base list  
- ✨ **Post‑processing** – bloom, vignette, volumetric ground, space background  

## Tech Stack

- React 18 + TypeScript  
- Vite  
- React Three Fiber / Drei  
- Three.js (shadow maps, fog, effects)  
- Axios  
- Postprocessing (Bloom, Vignette)  

## Installation

```bash
git clone https://github.com/N3zZa/DatsSol-hackaton-visualisation
cd datssol-map
npm install
```

## Environment Variables

Create a `.env` file in the root:

```env
VITE_API_TOKEN=your_arena_api_token_here
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)


## Usage

- Left panel – shows turn number, upgrade points, action range, etc.  
- Right panel – list of your plantations, click to focus camera.  
- Pause button – stops auto‑refresh.  
- Drag / rotate / zoom – standard OrbitControls (no damping).  

## API Endpoint

`https://games-test.datsteam.dev/api/arena`  
Requires `X-Auth-Token` header.

## License

MIT
