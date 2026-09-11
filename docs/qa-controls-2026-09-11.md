# Controls and quiet CIP meditation — 2026-09-11

Scope: user-requested playable-sample controls, camera preferences and meditation presentation. Final neighborhood art approval remains pending.

## Automated evidence

Baseline: 19 tests passed before edits. Updated `npm run check`: typecheck, 25 tests and production build passed. Tests cover character-relative forward/backward travel and steering, independent camera offsets, preference validation/migration, ten-second thought threshold, paused time, reset, and meditation/invitation traffic policy. Existing Vite bundle-size warning remains.

## Browser interaction evidence

Local Vite at http://127.0.0.1:5173/, actual keyboard, settings and restart interactions; production meditation timing was not accelerated. Read-only development canvas snapshots supplied the numeric observations below.

- Turned right, then pressed Up: heading stayed at 2.9528254191 radians and movement delta was x +0.1014801308, z -0.5311933952. Camera orbit remained 6.0944180727 radians. Forward followed the new heading rather than world north.
- Camera settings showed live scene preview beside the panel. Height 16, distance 30, shoulder -6 and view 24 survived Save and reload. Restored and saved defaults afterward (22, 38, -12, 28).
- At 8.7243 active seconds of CIP meditation, no player thought was visible and every car and bike reported stopped.
- At the invitation (60.0015 active seconds), complete car, bicycle and pedestrian snapshot arrays were identical to the 8.7243-second sample. The meditation crowd had reached 48 members, with seated and still-arriving participants. Ordinary traffic had not accumulated additional arrivals.
- Restart returned to walking. Subsequent snapshots showed changes in all three ordinary traffic arrays, confirming movement resumed.
- A fresh sit showed the player cloud at 12.6458 active seconds with “There’s a thought. And another.” The visible cloud had a scalloped outline and small trailing dots; its DOM class was `thought thought-cloud`, shared with meditation crowd labels.
- At the invitation, visually confirmed a seated crowd member's “We can just be here.” cloud matched the player's outline, typography and dotted tail. Browser error log was empty.

## Limitations

This is targeted iteration evidence, not full release acceptance. Human art review, all storefronts, full-route collision stress testing, 200% text testing and sustained performance remain pending. Previously present ambient actors freeze in place rather than disappearing. Long crowd paths can still take time to reach their seats.
