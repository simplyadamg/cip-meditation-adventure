# Research ledger

- 2026-09-10: https://wakingup.carrd.co read directly; meetup address and accessibility/welcome information recorded in design.md.
- Five local concept images reviewed in this conversation. They establish aesthetic direction only. Example discrepancies include fictional Lost Larson and A Taste of Heaven address numbers, altered business roles, and invented adjacency. Correct through current geographic/visual research before final production.
- Blender MCP connected 2026-09-10. Scene contained only Camera and Light; no pre-existing game assets.
- Workflow sources: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents and https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum . Adapt initializer/worker separation, durable progress, one feature per iteration, risk-first selection, bounded loops, and real browser evidence.
- Codex docs read: https://learn.chatgpt.com/docs/non-interactive-mode and https://learn.chatgpt.com/docs/agent-configuration/agents-md . Local `codex exec --help` confirmed `--sandbox workspace-write`, `--json`, `--output-schema`, `--output-last-message`, and configured-model default. We do not use deprecated full-auto/bypass switches.

## Production gate

Address coordinates are now verified through Google Geocoding API in src/geography.json (2026-09-10). This does NOT verify live tenancy. Initial sample art is provisional until street photographs/signage are reviewed. Record new evidence here rather than silently changing locations.

## Google lookup results

One Places API (New) request returned SERVICE_DISABLED. Geocoding API succeeded; no Cloud Console settings were changed. Twenty-one successful address/intersection geocodes were obtained with no retries. No key is stored in this repository or sent to the browser. Google coordinates establish street sides/order and the northward bend of Clark; distances are compressed for play. API usage billing was not independently inspected.

https://www.chicagointegrativepsychotherapy.com/contact-us/ confirms 5537 N Clark, 2nd floor. https://www.eliteabar.com/pages/contact-eli-tea confirms 5507 N Clark. These are address confirmations, not current facade photographs. CIP and Eli sample facades are original provisional artwork, not claims of exact storefront appearance.
