# AGENTS.md — Tool Selection (TypeScript)

- Find files by file name: `fd`
- Print absolute paths: `fd -p '<pattern>'`
- Match against full path: `fd --full-path '<pattern>'`
- List files in a directory: `fd . <directory>`
- Find files with extension and pattern: `fd -e <extension> <pattern>`
- Find text: `rg`
- Structured code search and codemods: `ast-grep`
  - Default languages:
    - `.ts` → `ast-grep --lang ts -p '<pattern>'`
    - `.tsx` → `ast-grep --lang tsx -p '<pattern>'`
  - Common languages:
    - Python → `ast-grep --lang python -p '<pattern>'`
    - JavaScript → `ast-grep --lang js -p '<pattern>'`
    - Rust → `ast-grep --lang rust -p '<pattern>'`
    - Bash → `ast-grep --lang bash -p '<pattern>'`
    - JSON → `ast-grep --lang json -p '<pattern>'`
  - Select deterministically (non-interactive):
    - `fd --full-path '<pattern>' | head -n 1`
    - `ast-grep -l --lang ts -p '<pattern>' | head -n 10`
    - Or: `fzf --filter 'term' | head -n 1`
  - JSON: `jq`
  - YAML/XML: `yq`

If `ast-grep` is available, avoid `rg` or `grep` unless a plain-text search is explicitly requested.

- Prefer `tsx` for fast Node execution:
  - Run a TS file quickly: `tsx scripts/task.ts --flag`

### Structured search and refactors with ast-grep

* Find all exported interfaces:
  `ast-grep --lang ts -p 'export interface $I { ... }'`
* Find default exports:
  `ast-grep --lang ts -p 'export default $X'`
* Find a function call with args:
  `ast-grep --lang ts -p 'axios.get($URL, $$REST)'`
* Rename an imported specifier (codemod):
  `ast-grep --lang ts -p 'import { $Old as $Alias } from "$M"' --rewrite 'import { $Old } from "$M"' -U`
* Disallow await in Promise.all items (quick fix):
  `ast-grep --lang ts -p 'await $X' --inside 'Promise.all($_)' --rewrite '$X'`
* React hook smell: empty deps array in useEffect:
  `ast-grep --lang tsx -p 'useEffect($FN, [])'`
* List matches deterministically:
  `ast-grep --lang ts -p '<pattern>' -l | head -n 10 | xargs -r sed -n '1,120p'`

Avoid interactive tools
- Avoid interactive TUI tools (fzf without `--filter`, less, vim) unless the user explicitly asks for them. Prefer deterministic, non-interactive commands (`head`, `--filter`, `--json` + `jq`) so runs are reproducible.
