You are running inside this local project:

- Git branch: CodexAttempt
- Working directory: /home/linux/Personal/Facultate/licenta/CampusPlannerInfo/kaggle_FloorPlan_AsutoshPrad_notebook/POF/CodexAttempt
- Implementation app: ./Implementation
- Design mockup: ../DesignMockup
- Existing graphify output: ./graphify-out

Task:
Proceed with matching the exact UI/UX design of ./Implementation to ../DesignMockup. Preserve concrete functionality, make the implementation follow the mockup's intended step structure, and align page flows, component layout, visual language, spacing, typography, controls, and states as closely as the current codebase allows.

Use the current state of the project at execution time. There may already be uncommitted changes; treat them as intentional user work. Do not revert unrelated changes, and do not run destructive git commands.

Before editing:
1. Inspect ./graphify-out/graph.json and ./graphify-out/GRAPH_REPORT.md if present. Use them as a fast map of the current project state.
2. If graphify output is missing or clearly stale for the files you need, inspect the source files directly and proceed without blocking.
3. Compare ../DesignMockup against ./Implementation. Identify the design structure, workflows, screens, and interactions that need to be mirrored.

Implementation expectations:
1. Make focused changes under ./Implementation unless a small supporting doc or script change is truly necessary.
2. Prefer existing project patterns, components, styling conventions, and package scripts.
3. Keep behavior concrete: preserve real navigation, state handling, forms, buttons, empty/loading/error states, and workflow steps rather than creating static mock screens.
4. Match the mockup's UI/UX as exactly as practical while keeping the implementation runnable.
5. Avoid broad rewrites unrelated to matching the mockup.

Verification:
1. Run the relevant package scripts from ./Implementation, such as lint, typecheck, test, and build, based on package.json.
2. If a script cannot run because dependencies or environment are missing, record the exact failure and continue with the best local verification available.
3. Summarize changed files, what design/flow gaps were closed, and remaining risks.

Do not create a git commit unless explicitly instructed in a later prompt.
