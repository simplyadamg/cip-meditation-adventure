# CIP Meditation Adventure — agreed design

## Purpose

A bright, warm, lightly humorous 3D browser journey through Chicago's Andersonville that makes meditation approachable and invites visitors to the independently organized Waking Up Andersonville meetup. Original neighborhood artwork, inspired by the five PNGs in Starting Files.

## Confirmed decisions

Desktop browser, single-player with simulated neighbors. A low, smooth camera follows over the left shoulder, with Q/E camera orbit and zoom. As revised by the user on 2026-09-11, W/Up walks along the character's current heading, S/Down backs up without turning around, and A/D or Left/Right steer (including turning in place). Camera movement never steers the character. This supersedes both the original camera-relative movement and the temporary north-locked controls. Space meditates; Enter examines non-CIP storefronts. Small preset character selection based on the references: red hair/pink shirt, green cap/backpack, purple hair, dark hair/jacket. Pixelated texture/rendering treatment with warm windows and lively greenery.

Start at Foster and Clark near Middle East Bakery. Compress travel distances while preserving Google's researched geographic layout, sides of street, relative locations and intersections. Extend side streets half a block. All 15 listed landmarks are required in the release, but the initial review checkpoint may have one detailed block and clearly identified blockout elsewhere.

Storefront examination moves the camera closer and shows the character thoughtfully facing the window. Location-specific thoughts encourage continuing to CIP. Thoughts and an optional subtle direction cue help navigation.

Pedestrians yield where possible. Traffic gives a harmless pause/nudge with no injury or penalty. Off-site meditation is interrupted by passersby, bikes or cars, automatically standing the player up with a humorous thought.

Clark Street has green bike lanes on both sides, with bicycles traveling in both directions between vehicle traffic and the sidewalks. Cyclists are ambient traffic and do not damage or score against the player.

Approaching CIP automatically zooms the camera; players can still move and sit anywhere across its sidewalk frontage. Space starts hands-free meditation: glow, gradually joining meditators, distracting thoughts appearing and fading. Sixty continuous seconds brings an invitation. Standing or walking before then resets the sequence.

By default, the first ten active seconds of CIP meditation are quiet. Settings can change the player's first-thought delay (0–60 seconds) and the quiet gap between successive thoughts (0–60 seconds, default 3). Each meditation thought is visible for 4.5 seconds. Saved timing changes apply to the next sit, and do not change the 60-second invitation timer. Only one thought bubble can appear at CIP at once: the first belongs to the player, then subsequent thoughts move around seated meditators. All use the same editable Meditation phrase pool and cloud outline with small trailing dots. There is no separate Crowd category; custom legacy Crowd phrases migrate into Meditation without duplicates. The invitation thought replaces the current cloud, then shared meditation thoughts resume. Spoken NPC dialogue uses a pointed speech-bubble tail. All ordinary pedestrian, car and bicycle traffic pauses immediately during CIP meditation and remains paused at the invitation. Only joining meditators continue moving. Standing before the invitation or restarting resumes ordinary traffic.

After invitation, the player is locked into the seated scene. Neighbors keep joining (bounded to a performance-safe crowd), and thoughts continue throughout the crowd. A link opens https://wakingup.carrd.co and Restart begins again. No health, combat, inventory, points, enemies or conventional win screen.

A gear opens settings. All authored thought phrases ship with generated defaults and are editable and saved only in this browser. Music and neighborhood ambience mute independently. Footsteps, bicycle bells and polite honks are not muted by those controls.

Settings also provides walking-camera height, distance, shoulder offset and view size with live preview, Save and Restore camera defaults. Restart preserves saved camera preferences. Mouse motion does not rotate the camera. Storefront and CIP meditation framing remain automatic. The Foster start is on the east sidewalk, facing north toward CIP; subsequent forward movement follows whichever direction the player turns to face.

Expanded camera ranges: height 4–100, distance 8–140, shoulder offset −60 to +60, and view size 10–100. Fog distance follows the camera so pulling back does not hide the neighborhood in fog; very wide views still expose provisional map edges.

## Routine implementation defaults

These are practical defaults, not additional confirmed user requirements: Q/E rotate, mouse wheel or +/- zoom; Escape or movement exits normal storefront inspection; Space or movement stands before invitation; pause simulation on hidden tabs or settings so background time does not count as continuous meditation. A restart preserves phrase and sound settings. Presets do not imply actual people's identities. Readable HTML text overlays remain crisp over pixelated graphics.

## Architecture

TypeScript + Three.js, Vite build, static deployment, no server/database/authentication. Browser-local preferences in versioned localStorage with error handling. Pure gameplay state machine independently tested from rendering. Web Audio channels for music, ambience, mandatory interaction effects. Original synthesized sample sounds avoid external audio licensing dependencies.

Blender MCP is the authoring bridge. Versioned Python scripts create named collections and export selected assets to GLB. Source .blend files remain in assets/blender; exports in public/assets. Runtime loads authored GLB assets; semantic tags drive collision, storefront inspection and CIP meditation frontage. Use instancing/shared materials, low render resolution and nearest-neighbor sampling.

## Review checkpoint

One detailed CIP-area block, a map blockout linking the Foster start, character presets, walking, quarter-turn/zoom camera, inspection, interruption, hands-free CIP sequence, persistent phrases and audio controls. Show the local playable sample for review of art, scale, navigation and tone. Do not produce all final storefront art until this is reviewed.

The sample must retain honest geographic placement: CIP is not moved to the south boundary. An explicit development shortcut may take a reviewer to the detailed block; it must not masquerade as release gameplay.

## Meetup source

Carrd checked 2026-09-10: Chicago Integrative Psychotherapy, 5537 N. Clark St.; every other Friday, 6–8 p.m.; free, no experience/app/religious identity required. Keep the link authoritative for future dates. Do not promise food, particular instructors or clinical benefits.

## Release storefront inventory (addresses remain research inputs)

| ID | Name | Reference address |
|---|---|---|
| middle-east | Middle East Bakery & Grocery | 5200 N Clark / 1512 W Foster |
| museum | Swedish American Museum | 5211 N Clark |
| bookstore | Women & Children First | 5233 N Clark |
| galleria | Andersonville Galleria | 5247 N Clark |
| gym | Cheetah Gym | 5248 N Clark |
| larson | Lost Larson | 5318 N Clark |
| calo | Calo Ristorante | 5343 N Clark |
| replay | Replay Andersonville | 5358 N Clark |
| heaven | A Taste of Heaven | 5401 N Clark |
| elephant | The Brown Elephant | 5404 N Clark |
| colectivo | Colectivo Coffee | 5425 N Clark |
| lobo | Pizza Lobo | 5457 N Clark |
| tea | Eli Tea Bar | 5507 N Clark |
| cip | Chicago Integrative Psychotherapy | 5537 N Clark, 2nd floor |
| studio | The Coffee Studio | 5628 N Clark |
