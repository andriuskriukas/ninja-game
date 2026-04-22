# Fire Ninja: Wave Survival

A browser-based wave survival game built with Phaser and TypeScript.

You play as the Fire Ninja and survive endless waves of dragons, enders, and zombies.

## Features

- Wave-based enemy spawning with increasing difficulty
- Distinct enemy archetypes (zombie, ender, dragon)
- Auto-targeting fireball attacks
- Player health, score, and wave HUD
- Game over and restart flow

## Tech Stack

- Phaser 3
- TypeScript
- Vite

## Project Structure

- `src/main.ts`: Core game scene, combat loop, waves, and HUD
- `src/style.css`: Page and canvas styling
- `public/visuals/`: Runtime image assets used by Phaser
- `visuals/`: Source image assets uploaded for characters

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run in development mode

```bash
npm run dev
```

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```

## Controls

- Move: `W`, `A`, `S`, `D` or Arrow keys
- Restart after game over: `R`

## Gameplay Notes

- Enemies spawn from arena edges.
- Fire Ninja auto-shoots toward the nearest enemy.
- Survive as many waves as possible and maximize score.

## Future Improvements

- Add player abilities and upgrade choices between waves
- Add enemy attack telegraphs and boss waves
- Add sound effects, music, and richer combat VFX
- Add mobile touch controls
