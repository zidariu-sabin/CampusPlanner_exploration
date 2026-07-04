#!/usr/bin/env bash
set -Eeuo pipefail

export TZ=Europe/Bucharest

WORKSPACE="/home/linux/Personal/Facultate/licenta/CampusPlannerInfo/kaggle_FloorPlan_AsutoshPrad_notebook/POF/CodexAttempt"
PROMPT_FILE="$WORKSPACE/.claude/automations/ui-match-prompt-2026-06-11.md"
LOG_DIR="$WORKSPACE/.claude/automation-logs"
LOG_FILE="$LOG_DIR/ui-match-2026-06-11.log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S %Z %z')] Starting scheduled Claude UI/UX matching run"
echo "Workspace: $WORKSPACE"
echo "Prompt: $PROMPT_FILE"

cd "$WORKSPACE"

current_branch="$(git branch --show-current)"
if [ "$current_branch" != "CodexAttempt" ]; then
  echo "Refusing to run: expected branch CodexAttempt, got '$current_branch'"
  exit 1
fi

if [ ! -d "Implementation" ]; then
  echo "Refusing to run: missing Implementation directory"
  exit 1
fi

if [ ! -d "../DesignMockup" ]; then
  echo "Refusing to run: missing ../DesignMockup directory"
  exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Refusing to run: missing prompt file $PROMPT_FILE"
  exit 1
fi

if command -v claude >/dev/null 2>&1; then
  CLAUDE_BIN="$(command -v claude)"
elif [ -x "/home/linux/.local/bin/claude" ]; then
  CLAUDE_BIN="/home/linux/.local/bin/claude"
else
  echo "Refusing to run: claude CLI was not found"
  exit 1
fi

if [ -f "graphify-out/graph.json" ]; then
  echo "Found graphify graph: $WORKSPACE/graphify-out/graph.json"
else
  echo "No graphify graph found; Claude prompt allows direct source inspection fallback"
fi

echo "Current git status before Claude run:"
git status --short

set +e
"$CLAUDE_BIN" -p "$(cat "$PROMPT_FILE")"
claude_status=$?
set -e

echo "[$(date '+%Y-%m-%d %H:%M:%S %Z %z')] Claude run finished with exit code $claude_status"
exit "$claude_status"
