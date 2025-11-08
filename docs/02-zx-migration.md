# Plan: Port installer to Node + zx

Status: draft • Owner: @maintainers • Date: 2025-11-08

## Goals
- Replace `install.sh` with a fully Node/TypeScript implementation using [google/zx](https://github.com/google/zx) so the CLI handles *all* install logic (UX + ops).
- Keep the experience Clack-driven: wizard prompts → zx-powered actions → structured logging.
- Eliminate shell prompts/side effects outside our control; everything should be testable in TS.
- No backwards-compat shims; `install.sh` will be removed once feature parity lands.

## Non-goals
- Supporting legacy shells (dash, older bash) or platforms we don’t already support.
- Maintaining parallel bash + Node installers.

## References
- `zx.md` (in repo) – quick reference for zx setup, runtimes, and API.
- google/zx docs for `$`, presets, timeouts, env.

## High-level roadmap
1. **Bootstrap zx runtime**
   - Add zx, @types/node, @types/fs-extra as deps in `cli/`.
   - Create `cli/src/installers/` with zx helpers (`$run`, `ensurePkgManager`, etc.).
   - Decide how to expose the new installer: e.g., `src/installers/main.ts` exporting `runInstaller(options)`.

2. **Extract install steps from bash**
   - Enumerate `install.sh` responsibilities (ensure_node, install_npm_globals, ensure_tools, write_codex_config, ensure_notify_hook, maybe_prompt_global_agents, etc.).
   - For each step:
     - Define a TypeScript function with clear inputs/outputs.
     - Implement using zx (`await $`), fs/promises, and typed helpers.
     - Mirror the logging/backup behavior from bash (e.g., config backups, cp + chmod).
   - Keep prompts entirely in the CLI layer; installer functions must rely on explicit options, not `confirm`.

3. **Wire CLI → zx installer**
   - Replace the current `execa('bash', install.sh …)` call with `await runInstaller({ … })`.
   - Continue to use Clack for UX; pass structured options (profile, overwriteConfig, notifyAction, globalAgentsAction, etc.).
   - Ensure spinner/output semantics match or improve on the current experience.

4. **Testing & parity**
   - Unit tests: each installer module (e.g., `ensureNode`, `writeConfig`, `configureNotify`) should have tests with mocked `$` invocations.
   - Integration tests: run the zx installer in a temp directory with fake HOME to assert config/agent/notify files.
   - Remove `install.sh` once CI + manual smoke tests confirm parity on macOS + Ubuntu.

5. **Cleanup/documentation**
   - Delete bash assets; update README to mention the zx-based installer.
   - Document how to run installer tests locally (`pnpm test install`), how to run in verbose mode, etc.

## Detailed breakdown

### Step 1: Bootstrap zx runtime
- [ ] Add zx + typings to `cli/package.json`.
- [ ] Create `cli/src/installers/types.ts` for shared interfaces:
  ```ts
  interface InstallerOptions {
    profile: 'balanced'|'safe'|'minimal'|'yolo'
    overwriteConfig: 'yes'|'no'
    notify: 'yes'|'no'
    globalAgents: 'create-default'|'overwrite-default'|'skip'
    mode: 'recommended'|'manual'
    flags: string[] // existing CLI flags
  }
  ```
- [ ] Create zx helpers (`const $$ = $({stdio: 'inherit'})`).

### Step 2: Port individual steps
For each bash function:
- `ensure_node`
  - Detect Node/npm; install via nvm or brew/apt.
  - Use zx for curl/bash scripts; handle nvm sourcing.
- `install_npm_globals`
  - Compare `npm view` vs `npm ls -g`; install missing versions.
  - Consider using `npm exec` for version queries.
- `ensure_tools`
  - Map package managers to arrays of packages; run via zx with sudo when needed.
  - Include fd symlink logic.
- `write_codex_config`
  - Use fs/promises to copy template, create backups, inject profile.
  - Support profile selection via options only.
- `ensure_notify_hook`
  - Copy template, mark executable, update config (notify + tui.notifications).
- `maybe_prompt_global_agents`
  - Copy AGENTS template based on options; handle backups.
- `maybe_install_vscode_ext`
  - Optional; run `code --install-extension` if requested.

Each function should:
- Accept an `InstallerContext` (cwd, logger, options).
- Throw on failure; let CLI show errors.

### Step 3: CLI integration
- Replace `execa('bash', install.sh …)` with `await runInstaller(options)`.
- Keep existing Clack prompts; they now produce structured options for the installer.
- Spinner/logging: wrap large steps with `p.spinner()` or `p.note()`.

### Step 4: Testing
- Unit:
  - Mock zx `$` with a fake runner to verify commands issued.
  - Use temp dirs for file operations (fs.mkdtemp / memfs).
- Integration:
  - In CI, run `codex-1up install --dry-run` (zx path) on macOS + Ubuntu containers.
  - Possibly provide a `pnpm test:install` that spins up a temp HOME and runs the installer.

### Step 5: Decommission bash
- Remove `install.sh`, `templates/...` copies managed only by bash.
- Update README + docs to mention zx-based installer.
- Tag release v1.0 once bash dependency is gone.

## Risks & mitigations
- **Package manager differences**: need thorough testing on Homebrew + apt; write adapters per PM.
- **Permissions/sudo**: consider prompting once for sudo (or documenting that certain steps require it). zx’s `$` handles interactive sudo as long as stdio is inherited.
- **Environment pollution**: ensure zx commands inherit the right `HOME`, `SHELL`, etc.; provide overrides for tests.
- **Migration complexity**: tackle one subsystem at a time, guarded by feature flags, until parity is achieved.

## Next steps
1. Approve this plan.
2. Land Step 1 (zx bootstrap + helper scaffolding).
3. Begin porting `ensure_node` and `install_npm_globals` as the first zx-based modules.
