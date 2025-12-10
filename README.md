# Containment Breach (iOS)

This repository now contains a fully native SwiftUI/SpriteKit implementation of the Containment Breach arcade survival game, redesigned specifically for horizontal (landscape) mobile play. The original web implementation has been superseded by an immersive dual-stick touch experience with controller-quality feedback and pacing.

## Highlights

- **Landscape-only** presentation with enforced horizontal orientation for the entire application lifecycle.
- **SpriteKit world simulation** that mirrors the procedural lab facility, wave-based enemy spawns, and combat systems from the original project.
- **Dual-stick controls** providing smooth movement and independent aiming. Dedicated touch targets offer one-tap firing and grenade tossing.
- **Comprehensive combat model** including the pistol, rifle, shotgun, katana, and shuriken loadouts, grenade throws, enemy AI archetypes, pickups, and player shields/health tracking.
- **Adaptive HUD** tuned for mobile ergonomics with real-time feedback for health, shield, weapon, ammo, waves, and score.
- **End-of-run summary** presenting accuracy, wave progression, and kill counts sourced from persistent in-memory statistics.

## Project structure

```
ContainmentBreach/
├── ContainmentBreachApp.swift   // SwiftUI entry point & landscape enforcement
├── Core/                        // Core utilities (math, tile map, stats)
├── Controls/                    // Touch control surfaces
├── Entities/                    // Player, enemy, projectile, pickup definitions
├── Scenes/GameScene.swift       // Main SpriteKit scene and gameplay loop
└── GameView.swift               // SwiftUI wrapper hosting SpriteKit content
```

## Running the game

1. Open the folder in Xcode 15 or newer.
2. Select the `ContainmentBreachApp` target and run on an iOS simulator (iPhone 14 Pro landscape recommended) or a physical device.
3. Use the left virtual joystick to move and the right joystick to aim. Tap **FIRE** for precise single bursts or hold the aim stick to auto-fire. Tap **GRENADE** to throw an explosive when available.

Enjoy breaching containment on the go!
