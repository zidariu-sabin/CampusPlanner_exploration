# Agent Browser And Screenshot Setup Notes

## Purpose

Campus Planner has several UI surfaces where visual QA is more useful than only type checks:

- Mapbox footprint drawing and style switching.
- Floor-plan image overlays on a geographic map.
- SVG/canvas room drawing and projection behavior.
- Booking view room selection over a map.
- Responsive layout checks for the map editor and booking form.

The goal of this setup is to make those checks repeatable with two Codex helpers:

- `screenshot`: OS-level screenshot capture when a tool-specific browser capture is unavailable.
- `agent-browser`: browser automation workflow instructions for navigating, clicking, inspecting, and taking browser screenshots.

## What Was Done

The curated screenshot skill was installed from `openai/skills`:

```bash
python /home/linux/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo openai/skills \
  --path skills/.curated/screenshot
```

Installed location:

```text
/home/linux/.codex/skills/screenshot
```

The Vercel agent-browser repository was inspected for a Codex skill file. A skill directory was found at `skills/agent-browser`, then installed with:

```bash
python /home/linux/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo vercel-labs/agent-browser \
  --path skills/agent-browser \
  --name agent-browser
```

Installed location:

```text
/home/linux/.codex/skills/agent-browser
```

## Risk Classification

Low risk:

- Writing this documentation in `POF/CodexAttempt/Docs/AgentBrowserScreenshotSetup.md`.
- Writing the shorter app usage note in `POF/CodexAttempt/Implementation/docs/visual-qa-tools.md`.

Medium risk:

- Installing the `screenshot` skill into `/home/linux/.codex/skills`.
- Installing the `agent-browser` skill stub into `/home/linux/.codex/skills`.
- These steps write outside the repository and require restarting Codex before the newly installed skills are available in a fresh session.

Higher risk, not performed:

```bash
npm i -g agent-browser
agent-browser install
```

Those commands install the runnable agent-browser CLI and browser/runtime assets. They may modify global npm state, download browser binaries, and require additional permissions. Run them only after separate approval.

## Current State

The skill files are installed, but Codex must be restarted before they appear as normally available skills in a new session.

The `agent-browser` skill file installed from Vercel is a discovery stub. It expects the runnable CLI to exist before commands such as this can work:

```bash
agent-browser skills get core
```

Until the CLI/runtime install is approved and completed, use the installed `screenshot` skill for OS-level screenshots and any already available browser tooling for app screenshots.

## Manual Setup Requirements

Usually no manual input is needed for the skill-file install itself. Manual action may still be required for:

- Restarting Codex so the new skills are loaded.
- Approving the higher-risk `agent-browser` CLI/browser runtime install.
- Resolving npm global permission issues if the runtime install is later approved.
- Installing Linux screenshot prerequisites if none are present. The screenshot skill can use `scrot`, `gnome-screenshot`, or ImageMagick `import`.
- Providing a valid Mapbox public token in the Angular environment, because Mapbox visual tests cannot render map tiles without it.

For this project, Mapbox token configuration is still expected in:

```text
POF/CodexAttempt/Implementation/apps/web/src/environments/environment.ts
```

## Suggested Visual QA Workflow

1. Start the app from `POF/CodexAttempt/Implementation`.
2. Open the map editor route, such as `/maps/new`.
3. Verify Mapbox renders with the configured token.
4. Draw or paste a footprint polygon and confirm the GeoJSON textarea remains `[longitude, latitude]`.
5. Switch between street and satellite styles and confirm overlays still render.
6. Toggle the floor-plan image overlay and confirm it appears and disappears without breaking the footprint.
7. Edit footprint vertices and confirm the SVG editor preview follows the saved geometry.
8. Open the booking form for the same map and confirm the view-only Mapbox/SVG state matches the configured map.
9. Capture screenshots for desktop and a narrow mobile viewport.

## Suggested Screenshot Locations

For temporary visual QA output, save screenshots under a temporary local folder such as:

```text
POF/CodexAttempt/Implementation/tmp/visual-qa/
```

Do not commit temporary screenshots unless they are intentionally added as documentation or test fixtures.

## Troubleshooting

Mapbox does not render:

- Check that `mapboxAccessToken` is populated.
- Check browser console errors for token, style URL, or network failures.
- Confirm the selected style URL is valid for the token.

Floor-plan overlay disappears after style change:

- Re-check whether custom image sources/layers are re-added after the Mapbox `style.load` event.
- Confirm source and layer IDs are unique and are not being added twice.

Screenshot skill fails on Linux:

- Install one of `scrot`, `gnome-screenshot`, or ImageMagick `import`.
- For region capture, prefer `scrot` or ImageMagick.

Agent-browser commands fail:

- Confirm the CLI exists with `agent-browser --help`.
- If missing, the higher-risk runtime install has not been done yet.
- Restart Codex after installing the skill and after installing the CLI/runtime.

New skills do not appear:

- Restart Codex. Skill discovery happens at session startup.

