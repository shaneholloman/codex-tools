#!/usr/bin/env bash
set -euo pipefail

need() { command -v "$1" >/dev/null 2>&1; }
check() { if need "$1"; then echo "✔ $1"; else echo "✖ $1 (missing)"; fi }

toml_root_value() {
  local key="$1"
  local file="$2"
  awk -v k="$key" '
    BEGIN { in_root = 1 }
    /^[[:space:]]*\[/ { in_root = 0 }
    in_root && $0 !~ /^[[:space:]]*#/ {
      line = $0
      sub(/^[[:space:]]+/, "", line)
      if (index(line, k " ") == 1 || index(line, k "=") == 1) {
        sub(/^[^=]*=/, "", line)
        sub(/[[:space:]]+$/, "", line)
        gsub(/^[[:space:]]+/, "", line)
        gsub(/^"|"$/, "", line)
        print line
        exit
      }
    }
  ' "$file"
}

toml_table_value() {
  local table="$1"
  local key="$2"
  local file="$3"
  awk -v t="$table" -v k="$key" '
    BEGIN { in_table = 0 }
    {
      raw = $0
      trimmed = raw
      sub(/^[[:space:]]+/, "", trimmed)
      sub(/[[:space:]]+$/, "", trimmed)
      if (trimmed ~ /^[[]/) {
        if (trimmed == "[" t "]") {
          in_table = 1
          next
        }
        if (in_table) {
          exit
        }
      }
      if (in_table && trimmed !~ /^#/ && trimmed ~ ("^" k "[[:space:]]*=")) {
        sub(/^[^=]*=/, "", trimmed)
        sub(/[[:space:]]+$/, "", trimmed)
        gsub(/^[[:space:]]+/, "", trimmed)
        gsub(/^"|"$/, "", trimmed)
        print trimmed
        exit
      }
    }
  ' "$file"
}

toml_profiles_with_feature_key() {
  local key="$1"
  local file="$2"
  awk -v k="$key" '
    BEGIN { current_profile = "" }
    {
      raw = $0
      trimmed = raw
      sub(/^[[:space:]]+/, "", trimmed)
      sub(/[[:space:]]+$/, "", trimmed)

      if (trimmed ~ /^\[profiles\.[^.[:space:]]+\.features\]$/) {
        current_profile = trimmed
        sub(/^\[profiles\./, "", current_profile)
        sub(/\.features\]$/, "", current_profile)
        next
      }

      if (trimmed ~ /^\[/) {
        current_profile = ""
        next
      }

      if (current_profile != "" && trimmed !~ /^#/ && trimmed ~ ("^" k "[[:space:]]*=")) {
        if (!seen[current_profile]++) {
          print current_profile
        }
      }
    }
  ' "$file"
}

echo "codex-1up doctor"
echo "--- binaries ---"
for c in node npm codex ast-grep rg fd fdfind fzf jq yq bat batcat git delta gh code; do
  check "$c"
done

echo "--- codex paths ---"
if command -v codex >/dev/null 2>&1; then
  # Show all codex candidates on PATH (guarded to avoid exiting with -e)
  type -a codex 2>/dev/null || which -a codex 2>/dev/null || command -v codex 2>/dev/null
else
  echo "codex not found on PATH"
fi

echo "--- git ---"
echo "diff.external = $(git config --global --get diff.external || echo "(none)")"
echo "core.pager = $(git config --global --get core.pager || echo "(none)")"

echo "--- codex config ---"
CFG="$HOME/.codex/config.toml"
if [ -f "$CFG" ]; then
  echo "found: $CFG"
  active_profile="$(toml_root_value "profile" "$CFG")"
  [ -n "$active_profile" ] || active_profile="(unset)"
  echo "profile = ${active_profile}"

  ws_profile=""
  if [ "$active_profile" != "(unset)" ]; then
    ws_profile="$(toml_table_value "profiles.${active_profile}" "web_search" "$CFG")"
  fi
  ws_root="$(toml_root_value "web_search" "$CFG")"

  effective_ws="$ws_profile"
  source_label="profiles.${active_profile}.web_search"
  if [ -z "$effective_ws" ]; then
    effective_ws="$ws_root"
    source_label="web_search"
  fi

  if [ -n "$effective_ws" ]; then
    echo "✔ web_search = ${effective_ws} (${source_label})"
  else
    echo "ℹ web_search not set (Codex default: cached)"
  fi

  ma_profile=""
  ma_profile_legacy=""
  if [ "$active_profile" != "(unset)" ]; then
    ma_profile="$(toml_table_value "profiles.${active_profile}.features" "multi_agent" "$CFG")"
    ma_profile_legacy="$(toml_table_value "profiles.${active_profile}.features" "collab" "$CFG")"
  fi
  ma_root="$(toml_table_value "features" "multi_agent" "$CFG")"
  ma_root_legacy="$(toml_table_value "features" "collab" "$CFG")"

  effective_ma="$ma_profile"
  ma_source="profiles.${active_profile}.features.multi_agent"
  if [ -z "$effective_ma" ] && [ -n "$ma_profile_legacy" ]; then
    effective_ma="$ma_profile_legacy"
    ma_source="profiles.${active_profile}.features.collab (legacy)"
  fi
  if [ -z "$effective_ma" ] && [ -n "$ma_root" ]; then
    effective_ma="$ma_root"
    ma_source="features.multi_agent"
  fi
  if [ -z "$effective_ma" ] && [ -n "$ma_root_legacy" ]; then
    effective_ma="$ma_root_legacy"
    ma_source="features.collab (legacy)"
  fi

  if [ -n "$effective_ma" ]; then
    echo "✔ multi_agent = ${effective_ma} (${ma_source})"
  else
    echo "ℹ multi_agent not set (enable via /experimental or [features].multi_agent)"
  fi

  if [ -n "$ma_profile_legacy" ] || [ -n "$ma_root_legacy" ]; then
    echo "⚠ legacy feature key 'collab' detected; migrate to 'multi_agent'"
  fi

  removed_feature_keys=(search_tool request_rule experimental_windows_sandbox elevated_windows_sandbox include_apply_patch_tool)
  for key in "${removed_feature_keys[@]}"; do
    removed_root="$(toml_table_value "features" "$key" "$CFG")"
    while IFS= read -r profile_name; do
      [ -n "$profile_name" ] || continue
      echo "⚠ removed feature key '$key' detected at profiles.${profile_name}.features.${key}; remove it"
    done < <(toml_profiles_with_feature_key "$key" "$CFG")
    if [ -n "$removed_root" ]; then
      echo "⚠ removed feature key '$key' detected at features.${key}; remove it"
    fi
  done

  deprecated_feature_keys=(web_search_request web_search_cached)
  for key in "${deprecated_feature_keys[@]}"; do
    deprecated_root="$(toml_table_value "features" "$key" "$CFG")"
    while IFS= read -r profile_name; do
      [ -n "$profile_name" ] || continue
      echo "ℹ deprecated feature key '$key' set at profiles.${profile_name}.features.${key}; prefer profiles.${profile_name}.web_search"
    done < <(toml_profiles_with_feature_key "$key" "$CFG")
    if [ -n "$deprecated_root" ]; then
      echo "ℹ deprecated feature key '$key' set at features.${key}; prefer root web_search = \"disabled|cached|live\""
    fi
  done
else
  echo "✖ ~/.codex/config.toml not found"
fi

echo "--- shell rc hints ---"
echo "SHELL=$SHELL"
for rc in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.config/fish/config.fish"; do
  if [ -f "$rc" ]; then
    if grep -q "# >>> codex-1up >>>" "$rc"; then
      echo "Found codex-1up block in $rc"
    elif grep -q ">>> codex-1up >>>" "$rc"; then
      echo "Found codex-1up block in $rc (legacy format - remove manually)"
    fi
  fi
done

echo "Done."
