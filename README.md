# CIP Meditation Adventure

Desktop browser game. Current milestone: **playable sample awaiting human review**, not the complete neighborhood.

`npm install` then `npm run dev` starts the local game. `npm run check` checks types, state transitions and production build. Browser acceptance is tracked separately in `harness/features.json`.

The production deployment is available at https://cip-meditation-adventure.vercel.app/ . The local and Vercel versions use the same static Vite build and load the Blender-authored GLB assets from `public/assets`.

## Codex harness

Read AGENTS.md and docs/design.md. `npm run harness:dry-run` previews the next run without launching an agent. `npm run harness:once` performs one fresh Codex iteration; `npm run harness:loop -- --iterations 5` caps a batch to five iterations. Each run has a 20-minute maximum and a batch has a 60-minute maximum. Authentication/model use the existing Codex CLI setup; no API key required in this project.

The runner requires a clean Git worktree, records local JSONL events and structured results, checks protected criteria and build results, and stops for failure, no progress, blocked access, or review. It does not launch itself automatically. The current interactive Codex task follows the same worker contract.

Full-neighborhood work is gated on the user's review of the sample. Keep Starting Files intact. The asset pipeline uses Blender MCP, a reproducible script, source .blend and exported .glb. See docs/research.md for geography/visual evidence and limitations.
