# Progress

## 2026-09-10 — initializer

Interview decisions captured in docs/design.md and AGENTS.md. References inspected. Blank workspace; Blender MCP operational. Stack selected: TypeScript/Three.js/Vite; Blender GLB pipeline. Scope is playable-sample, then human review; full production remains pending. No Google API requests made yet. No deployed game exists.

Next: validate bounded runner, research sample location, create original Blender block and character assets, implement and verify the sample. Do not mark browser/visual checks passing without evidence.

## 2026-09-10 — playable sample implementation

- H01: bounded Codex harness added in `scripts/harness.mjs`; dry-run and malformed-iteration tests pass. Each worker is capped at 20 minutes, batches at 60 minutes, and protected criteria are checked.
- G01: Google Geocoding API used for 21 bounded address/intersection lookups; coordinates recorded in `src/geography.json` and research limitations in `docs/research.md`. Places API New was unavailable because the project service is disabled; no Cloud settings changed.
- A01: Blender MCP scene `CIP_Sample_1` generated from `scripts/build_blender_sample.py`; original scene preserved. Saved source `assets/blender/andersonville-sample.blend`; exports in `public/assets` include the neighborhood, four characters and car.
- P01/P02/P03/P04: TypeScript/Three.js browser slice implemented. Browser evidence: Foster start, detailed CIP shortcut, Enter storefront thought, 90-degree/zoom controls in UI, settings dialog, full 60-second hands-free meditation, crowd thoughts, invitation lock, meetup link, restart, and browser-local phrase/audio controls. State tests cover reset, interruption, lock and invalid timers.
- Visual limitation: the sample currently uses original provisional geometry; blockout buildings remain visibly simpler than final reference-level art. Browser rendering is readable after reduced lighting and a camera cutaway, but requires human review for scale, framing, pixel treatment and tone.
- Technical limitation: workspace `.git` is read-only in this environment, so the required commit could not be created. No destructive workaround was attempted. Site hosting is not completed because the source repository cannot be initialized/pushed from this checkout.

Next action: user reviews the local playable sample. Only after review feedback and explicit approval should final storefront production begin.

## 2026-09-10 — movement bug fix

- Fixed character yaw to use the authored glTF -Z forward axis; cardinal and diagonal movement now face travel direction.
- Removed the custom fragment-discard cutaway shader that produced the wedge/slicing artifact around the character. Buildings now render normally.
- Added radius-aware collision rectangles for all storefront building volumes plus generated tree, lamp and bench props. Movement still permits the street, sidewalks and half-block side streets while preventing corner clipping.
- Added pure movement and collision tests. Browser recheck remains required for all camera angles and corner cases.

- Browser recheck completed: fresh desktop preview loaded; Foster start, forward movement, quarter-turn camera, rotated movement, and a storefront/prop stress pass were exercised. The character visibly tracks movement direction, no wedge/slice appears, and the player remains on navigable surfaces around storefront/tree/bench boundaries. Full long-run route coverage is still pending until the sample is reviewed.

## 2026-09-10 — bidirectional bike lanes

- Added Blender-authored green bike lanes and boundary markings along both sides of Clark Street. Added a low-poly pixel bicycle asset and ten slowly moving bicycles, five per direction, positioned between traffic and the sidewalk.

- Because Blender’s background export crashed in this environment before writing `bike.glb`, the browser currently generates the same original low-poly bicycle and lane geometry at runtime so the preview remains usable. The reproducible Blender source changes remain in `scripts/build_blender_sample.py` for the next successful Blender MCP export. Browser preview shows both green lanes; full art and traffic tuning remain review work.

## 2026-09-10 — Vercel deployment

- Deployed the static Vite build to Vercel production project `cip-meditation-adventure`.
- Public alias: https://cip-meditation-adventure.vercel.app/
- Local preview remains http://127.0.0.1:5173/ via `npm run dev`. The hosted build and local build share the same source/assets.

## 2026-09-10 — forward-axis correction

- Follow-up report showed the player was still reversed. The exported Blender geometry faces glTF `+Z`, so `facingYaw` now uses `atan2(vx, vz)` and pedestrians use the matching orientation. Added test expectation for the corrected diagonal heading.

## 2026-09-10 — interruption bubble fix

- Fixed repeated sidewalk interruption announcements. The interrupted state persists until movement/reset, but the thought and bell now trigger only once on entry to that state, preventing phrase cycling/flicker.

## 2026-09-11 — heading controls, camera settings and quiet CIP meditation

- Superseded the temporary north-locked controls with user-requested heading-relative forward/backward movement and left/right steering. Camera follows independently; short keyboard taps are retained between animation frames.
- Added browser-saved camera height, distance, shoulder offset and view size, live preview and restore defaults. Updated control hints and agreed design.
- CIP meditation begins with ten active seconds without thoughts. Player and crowd use one cloud style with dotted tails; NPC speech uses a pointed tail.
- Ordinary cars, bicycles and pedestrians pause during CIP meditation and invitation; joining meditators continue and avoid occupied seat locations. Exiting or restarting restores normal traffic.
- Baseline 19 tests passed; updated 25 tests, typecheck and build passed. Browser evidence includes turning then walking forward, persisted camera preferences, quiet opening, a real full-minute invitation, unchanged ordinary traffic and restart resumption. Details and limitations: `docs/qa-controls-2026-09-11.md`.
- Historical correction: GitHub linking and Vercel deployment were completed after the initializer's blocked note. The preceding commit `bc7017a` contains the Blender export/navigation update. This entry concerns the next local iteration, not a new deployment.

Checkpoint remains playable-sample. Final neighborhood production and release verification are not approved or complete.
