#!/usr/bin/env bash
# Run native tests in a disposable scaffold profile, including root-run containers.
set -euo pipefail
: "${ZOTERO_BIN:?Set ZOTERO_BIN to an extracted Linux Zotero executable}"
for tool in node npm xvfb-run realpath; do
  command -v "$tool" >/dev/null || { printf 'Missing command: %s\n' "$tool" >&2; exit 1; }
done
export ZOTERO_BIN
ZOTERO_BIN="$(realpath "$ZOTERO_BIN")"
test -x "$ZOTERO_BIN" || { printf 'Not executable: %s\n' "$ZOTERO_BIN" >&2; exit 1; }
ANNOTATION_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ANNOTATION_PROJECT_DIR
cd "$ANNOTATION_PROJECT_DIR"
if [[ $(id -u) == 0 ]]; then
  command -v runuser >/dev/null
  if ! id zotero-compat >/dev/null 2>&1; then
    useradd --system --home-dir /tmp/zotero-compat-home --create-home --shell /bin/sh zotero-compat
  fi
fi
ANNOTATION_LAUNCHER_DIR="$(mktemp -d "${TMPDIR:-/tmp}/annotation-test.XXXXXX")"
trap 'rm -rf -- "$ANNOTATION_LAUNCHER_DIR"' EXIT
cat > "$ANNOTATION_LAUNCHER_DIR/launch-zotero" <<'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail
if [[ $(id -u) == 0 ]]; then
  # Scaffold creates these disposable directories before launching Zotero.
  chown -R zotero-compat:zotero-compat "$ANNOTATION_PROJECT_DIR/.scaffold/test/profile" "$ANNOTATION_PROJECT_DIR/.scaffold/test/data"
  exec runuser -u zotero-compat -- xvfb-run -a "$ZOTERO_BIN" "$@"
fi
exec xvfb-run -a "$ZOTERO_BIN" "$@"
LAUNCHER
chmod +x "$ANNOTATION_LAUNCHER_DIR/launch-zotero"
# Avoid scaffold's CI auto-install path, which assumes a different Linux distribution.
CI=false ZOTERO_PLUGIN_ZOTERO_BIN_PATH="$ANNOTATION_LAUNCHER_DIR/launch-zotero" npm run test:integration
