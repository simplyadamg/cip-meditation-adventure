# CIP Meditation Adventure

Read `docs/design.md`, `harness/features.json`, and `harness/progress.md` before working. Read git status and recent history. Preserve user changes and Starting Files.

## Workflow

- Work on one verifiable feature at a time, highest-risk dependencies first.
- Scope is the current milestone in `harness/features.json`. Stop at a human review checkpoint. Do not start whole-neighborhood production before the playable sample is reviewed.
- Run the baseline checks before editing; finish with relevant checks and browser interaction evidence for gameplay. Unit tests alone cannot prove the game looks or plays correctly.
- Never relax/delete acceptance criteria to obtain a pass. Preserve feature IDs, requirements, and dependencies; only the user can change scope. Status may change when evidence supports it.
- Record evidence paths and limitations. `implemented` is different from `verified`; a visual-review requirement stays unverified until reviewed.
- Update progress and commit a coherent change after checks pass. Do not claim the game is complete unless every release requirement is verified.
- Prefer the existing Codex session for interactive iteration. `npm run harness:once` and the capped loop are optional fresh-session entry points, not a requirement to nest agents.
- Do not run concurrent writers against one Blender scene or checkout. Do not spawn Codex recursively from a worker run.
- Preserve sandboxing, existing authentication, and configured model defaults. No bypass flags, infinite loops, unrequested deployments, or API keys in source, logs, generated assets, or browser code.

## Product invariants

- Original 3D assets authored through Blender MCP; reproducible source scripts and `.blend` + `.glb` outputs. References guide color, character proportions, and detail, not exact addresses or adjacency.
- Desktop, single-player, pixelated RPG view; Q/E camera orbit and zoom. Per user revision 2026-09-11, W/Up walks forward along character heading, S/Down backs up, and A/D or Left/Right steer. Camera follows smoothly over the shoulder and cannot change heading. Browser-local camera controls adjust height, distance, shoulder offset and view size. Space meditates, Enter examines non-CIP storefronts.
- Public interruptions automatically stand the character up with humor. Only CIP's sidewalk frontage protects meditation.
- CIP approach zooms automatically and permits movement throughout frontage. CIP meditation runs hands-free for 60 continuous active seconds. Leaving resets progress.
- CIP has one thought cloud at a time, moving from the player around seated meditators, all using the Meditation phrase pool. Browser-saved timing controls adjust the initial delay (default 10 seconds) and quiet gap (default 3 seconds); each ordinary thought lasts 4.5 seconds. Timing changes apply on the next sit, not to the invitation timer.
- Invitation locks movement and meditation exit; crowd and thoughts continue. Meetup link and Restart remain accessible. Restart preserves browser phrase/audio preferences.
- No enemies, combat, health, inventory, scoring, or conventional win screen.
- Music and ambience mute independently. Interaction effects (steps, bells, polite honks) remain audible within the game settings.
- All authored thought phrases have editable defaults and browser-local persistence. No backend or accounts.
- Full map: Foster–Olive along Clark, compressed blocks, correct sides/order/intersections, side streets half a block. Start Foster/Clark. Never relocate CIP to Foster to simplify a sample.

## Research and QA

- Recheck current signage, tenancy, addresses, and facades immediately before final art; record date, URL/provider and certainty in `docs/research.md`.
- Google Maps API is optional research only, never a runtime dependency. Use limited fields, bounded request counts and no automatic retries. Keep supplied credentials out of the repository.
- User-provided concept images contain invented facades, addresses and neighboring businesses. Never treat those as geographic evidence or repeat unsupported claims about the meetup.
- Use four reference-inspired character presets, warm storefront light, dense greenery and readable overlay text. Generic cubes are blockout, not finished artwork.
- Browser checks must cover movement at all camera angles, storefront focus and exit, off-site interruption, actual 60-second CIP sequence, reset before invitation, final lock, restart, local settings, and audio routing.
- Prefer deterministic clock/state tests for meditation logic; browser evidence is separately required. Never speed up the production meditation timer to satisfy a test.
