# Visual QA Tools

Two helper skills were installed for future UI checks:

- `screenshot`: OS-level screenshots.
- `agent-browser`: browser automation workflow instructions.

Restart Codex before relying on either skill in a fresh session.

## Current Limits

The `agent-browser` skill is installed, but its runnable CLI/browser runtime was not installed. That higher-risk setup is intentionally separate:

```bash
npm i -g agent-browser
agent-browser install
```

Only run those commands after explicit approval.

Mapbox checks require a valid `mapboxAccessToken` in:

```text
apps/web/src/environments/environment.ts
```

## Quick Checks

Use these checks when validating map-related UI changes:

- `/maps/new` renders Mapbox with the configured token.
- Street and satellite styles both render.
- Style switching does not remove the floor-plan overlay.
- Floor-plan toggle shows and hides only the plan image.
- Footprint drawing and vertex editing update the GeoJSON textarea.
- Room selection in the booking form still works.
- Desktop and narrow mobile layouts do not overlap controls, map, or form text.

Temporary screenshots can be saved under:

```text
tmp/visual-qa/
```

Keep those screenshots out of commits unless they are deliberately used as docs or fixtures.

