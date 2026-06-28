# ZOOMVERSE Prototype — Changelog

## v1.0 — Feature-complete + deployable
- **All 6 race planets** playable and gated in sequence: Toy City Speedway,
  Galaxy Loop Road, Ocean Tunnel Dash, Robot Factory Run, Rainbow Stunt Planet,
  and the Star Castle Finale (which unlocks the Dream Team car).
- **Hub lap-time leaderboard**: best time per track shown on each card.
- **Settings screen**: music + SFX volume and camera distance, saved and applied.
- **Consistent navigation**: every screen has a Hub link; race pauses have
  Back-to-Hub; the Hub is now the home page (`index.html`).
- **Deployable**: GitHub Pages guide (`DEPLOY-GITHUB.md`) and an Android APK guide
  via Capacitor (`packaging/BUILD-APK.md`).

## v0.7 — Stunts, positions, Planet 3 & particles
- **Stunt scoring**: jumps now earn stunt points from air time + spins, shown in
  the HUD and on the results screen.
- **Live race position**: the HUD shows your current P1/P3 placing during the race,
  not just at the finish.
- **Planet 3 — Ocean Tunnel Dash** (`ocean.html`, `src/world3.js`): a glass-tunnel
  loop with 20 stars and **slow-bubble hazards** that cap your speed. Locked until
  Galaxy Loop Road is cleared.
- **Particle polish** (`src/particles.js`): cyan boost trails, gold star-collect
  sparkles, ramp-launch bursts, and bubble splashes.

## v0.6 — Jumps, rivals & textures
- **Real jump physics**: the race car now has vertical motion + gravity. Both
  race tracks have a **launch ramp** that pops the car into the air; the **Jump**
  garage upgrade increases height. The car pitches its nose while airborne.
- **AI rival racers**: two StarBots pace around the loop. Finishing now shows your
  **position (🥇/🥈/🥉)** based on progress vs the rivals.
- **Textured car & buildings**: the #07 body uses a blue/gold panel texture; the
  Command HQ buildings and stations use a metal-panel texture.

## v0.5 — Planet 2
- Added **Galaxy Loop Road** (Planet 2): a floating neon space loop with 5 star
  rings, 15 total stars, and 3 boost lanes (`galaxy.html`, `src/world2.js`).
- Race engine is now **track-aware** (`window.ZV_TRACK`) and reuses the same car,
  HUD, upgrades, countdown, timer and save for any track.
- Galaxy Loop Road is **locked on the Hub** until Toy City Speedway is cleared;
  best times are tracked per track (`race`, `race2`).

## v0.4 — Feel & progression
- **Garage upgrades now affect the car** in-race: Engine (speed/accel), Wheels
  (steering), Boost (power/recharge), Magnet (pickup radius).
- Races start with a **3-2-1-GO countdown**, show a **live lap timer**, and save a
  **best time** ("New best!" on the results screen).

## v0.3 — Connect & polish
- **Galaxy Hub** (`hub.html`) links all modes; shared **localStorage save**
  (`src/save.js`) carries stars and completion across modes.
- **Garage** upgrade screen (`garage.html`): spend stars on 6 tracks × 5 levels.
- **Texture pass**: tileable road/space textures on the race and command grounds.
- **Audio** (`src/audio.js`): synthesized SFX (star, boost, win, repair, click)
  and a soft music pad — no audio files.

## v0.2 — Three modes
- **Build Mode** (`build.html`): place road tiles on a snap grid, then test-drive.
- **Command Mode** (`command.html`): select Builder Bots, spend Star Energy,
  repair 3 stations.

## v0.1 — First playable
- **Race Mode** (`index.html`): 3D car, chase camera, Toy City Speedway loop,
  boost pads, 20 stars, 2 laps, HUD, pause/reset.
