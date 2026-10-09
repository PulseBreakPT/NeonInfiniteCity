# AFTERFALL // NEON INFINITE SURVIVAL

A new original isometric zombie survival game set in an infinite procedural quarantined world, inspired by the *survival genre* of Project Zomboid (no proprietary assets or code reused). Replaces the flight simulator in NEON INFINITE with a human-scale survival experience.

**[JOGAR — GitHub Pages](https://pulsebreakpt.github.io/NeonInfiniteCity/)**

## Playable features

- Infinite **seeded** regions: **aldeias**, farm fields and crop rows, thick forests, suburbs, prisons with fences and watchtowers, military bunkers and factories.
- Isometric camera on HTML5 Canvas, multi-storey buildings, windows, pitched roofs, doors, interior reveal, houses, markets, barns, warehouses and cell blocks.
- Enter buildings through doors to loot supplies, enter a bunker hatch with **E**, explore underground and exit via the marked exit.
- Zombies with pursuit, attack damage, hit feedback and melee combat. Zombie density depends on region danger.
- Hunger, thirst, energy, health, food/water/medical supplies, gathering, simple crafting, day/night time, rain, kills, map and backpack.
- Deterministic procedurally generated world, 6-second autosave via localStorage, no login or backend.
- Desktop and Android controls. No JS framework or CDN is required for core functionality (Google Fonts enhancement only).

## Controls

| Action | Desktop | Android |
| --- | --- | --- |
| Move | WASD or arrows | Virtual joystick |
| Sprint | Shift | Hold CORRER |
| Attack | Space | ATACAR |
| Loot / enter / leave bunker | E | REVISTAR |
| Eat / drink / heal | 1 / 2 / 3 | Bottom hotbar |
| Backpack | I | MOCHILA |
| Map | M | MAPA |
| Craft bandages | C | CREATE in backpack |
| Flashlight | F | Key F (desktop) |
| Pause | P | Pause button |
| Zoom | Mouse wheel | Fixed mobile zoom |

The bunker hatch can be found in regions marked **B** on the strategic map. The prison appears as **P**.

## Local test

```sh
npm run check
npm test
python3 -m http.server 8080
```

Open http://localhost:8080. Publishing is automated by `.github/workflows/pages.yml`: JavaScript syntax and deterministic world tests run before GitHub Pages deployment.

## Scope / known limitations

This is a *playable browser survival prototype*, not the original Project Zomboid game. Buildings have exterior walls, doors and interior reveal, but limited furniture; items spawn as procedural loot. Zombies use simple local pursuit rather than global pathfinding. Vehicle driving, construction of free-form bases, multiplayer, complex infection and detailed health simulations are future extensions.

Copyright © 2026 PulseBreakPT. MIT licensed for this original project; no copyrighted Project Zomboid game files included.
