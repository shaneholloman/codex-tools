# AGENTS.md — Tool Selection (Generic)

When you need to call tools from the shell, use this rubric:

- Find files by file name: `fd`
- Print absolute paths: `fd -p '<pattern>'`
- Match against full path: `fd --full-path '<pattern>'`
- List files in a directory: `fd . <directory>`
- Find files with extension and pattern: `fd -e <extension> <pattern>`
- Find Text: `rg` (ripgrep)
- Find Code Structure: `ast-grep`
  - Default to TypeScript when in TS/TSX repos:
    - `.ts` → `ast-grep --lang ts -p '<pattern>'`
    - `.tsx` (React) → `ast-grep --lang tsx -p '<pattern>'`
  - Other common languages:
    - Python → `ast-grep --lang python -p '<pattern>'`
    - Bash → `ast-grep --lang bash -p '<pattern>'`
    - JavaScript → `ast-grep --lang js -p '<pattern>'`
    - Rust → `ast-grep --lang rust -p '<pattern>'`
    - JSON → `ast-grep --lang json -p '<pattern>'`
- Select deterministically (non-interactive):
  - `fd --full-path '<pattern>' | head -n 1`
  - `ast-grep -l --lang <lang> -p '<pattern>' | head -n 10`
  - Or: `fzf --filter 'term' | head -n 1` (non-interactive)
- JSON: `jq`
- YAML/XML: `yq`

If `ast-grep` is available, avoid plain‑text searches (`rg`/`grep`) when you need syntax‑aware matching. Use `rg` only when a plain‑text search is explicitly requested.

Avoid interactive tools
- Avoid interactive TUI tools (fzf without `--filter`, less, vim) unless the user explicitly asks for them. Prefer deterministic, non-interactive commands (`head`, `--filter`, `--json` + `jq`) so runs are reproducible.
