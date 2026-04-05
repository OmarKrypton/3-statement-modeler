#!/usr/bin/env bash
# =============================================================================
# build.sh — Full build script for 3-Statement Modeler (Linux, Tauri)
# =============================================================================
# Run from the project root:   ./build.sh
# Output:  tauri/src-tauri/target/release/bundle/
# =============================================================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
TAURI_DIR="$PROJECT_DIR/tauri/src-tauri"
ASSETS_DIR="$PROJECT_DIR/assets"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       3-Statement Modeler — build.sh (Tauri)        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Build Next.js static export ──────────────────────────────────────
echo "▶ [1/5] Building Next.js frontend (static export)..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
  echo "  (Fresh clone detected: Installing frontend dependencies...)"
  npm install --quiet
fi
npm run build
echo "  ✓ Frontend built → frontend/out/"

# ── Step 2: Copy static export into backend/static/ ──────────────────────────
echo "▶ [2/5] Copying static frontend into backend/static/..."
rm -rf "$BACKEND_DIR/static"
cp -r "$FRONTEND_DIR/out" "$BACKEND_DIR/static"
echo "  ✓ Copied → backend/static/"

# ── Step 3: Bundle backend with PyInstaller ───────────────────────────────────
echo "▶ [3/5] Bundling backend with PyInstaller..."
cd "$BACKEND_DIR"
if [ ! -d ".venv" ]; then
  echo "  (Fresh clone detected: Creating Python virtual environment...)"
  python -m venv .venv
  .venv/bin/python -m pip install --upgrade pip --quiet
  .venv/bin/python -m pip install -r requirements.txt --quiet
fi
.venv/bin/python -m pip install pyinstaller --quiet
.venv/bin/python -m PyInstaller 3sm.spec --noconfirm
echo "  ✓ Backend bundled → backend/dist/3sm/"

# ── Step 4: Stage the backend binary as a Tauri sidecar ──────────────────────
# Tauri requires the sidecar binary to be named with the Rust target triple.
echo "▶ [4/5] Staging backend sidecar for Tauri..."
TARGET_TRIPLE=$(rustup show active-toolchain | awk '{print $1}' | sed 's/[^-]*-//')
# Fallback if rustup parsing fails
TARGET_TRIPLE="${TARGET_TRIPLE:-x86_64-unknown-linux-gnu}"
SIDECAR_DIR="$TAURI_DIR/binaries"
mkdir -p "$SIDECAR_DIR"
cp "$BACKEND_DIR/dist/3sm/3sm" "$SIDECAR_DIR/3sm-${TARGET_TRIPLE}"
chmod +x "$SIDECAR_DIR/3sm-${TARGET_TRIPLE}"
echo "  ✓ Sidecar staged → tauri/src-tauri/binaries/3sm-${TARGET_TRIPLE}"

# ── Step 4b: Generate Tauri icons from master PNG ─────────────────────────────
echo "  Generating Tauri icon set from icon.png..."
ICONS_DIR="$TAURI_DIR/icons"
mkdir -p "$ICONS_DIR"
# Use cargo tauri icon if tauri-cli is installed, otherwise use ImageMagick
if command -v cargo &>/dev/null && cargo tauri --version &>/dev/null 2>&1; then
  cargo tauri icon "$ASSETS_DIR/icon.png" --output "$ICONS_DIR"
elif command -v convert &>/dev/null; then
  convert "$ASSETS_DIR/icon.png" -resize 32x32   "$ICONS_DIR/32x32.png"
  convert "$ASSETS_DIR/icon.png" -resize 128x128  "$ICONS_DIR/128x128.png"
  convert "$ASSETS_DIR/icon.png" -resize 256x256  "$ICONS_DIR/128x128@2x.png"
  cp "$ASSETS_DIR/icon.png"                        "$ICONS_DIR/icon.png"
  cp "$ASSETS_DIR/icon.ico"                        "$ICONS_DIR/icon.ico"
  # icns (macOS) — skip on Linux
  touch "$ICONS_DIR/icon.icns"
else
  # Plain copy fallbacks — Tauri will warn but still build
  cp "$ASSETS_DIR/icon.png" "$ICONS_DIR/32x32.png"
  cp "$ASSETS_DIR/icon.png" "$ICONS_DIR/128x128.png"
  cp "$ASSETS_DIR/icon.png" "$ICONS_DIR/128x128@2x.png"
  cp "$ASSETS_DIR/icon.png" "$ICONS_DIR/icon.png"
  cp "$ASSETS_DIR/icon.ico" "$ICONS_DIR/icon.ico"
  touch "$ICONS_DIR/icon.icns"
fi
echo "  ✓ Icons ready → tauri/src-tauri/icons/"

# ── Step 5: Build Tauri app ───────────────────────────────────────────────────
echo "▶ [5/5] Building Tauri desktop app (Rust compile)..."
cd "$TAURI_DIR"
# Install cargo-tauri if needed
if ! cargo tauri --version &>/dev/null 2>&1; then
  echo "  Installing tauri-cli..."
  cargo install tauri-cli --version "^2.0" --locked
fi
# We only build the .deb bundle because linuxdeploy (AppImage) is failing on your system.
# The PKGBUILD will take the raw binary from the release folder.
cargo tauri build --bundles deb
echo "  ✓ Tauri app built → tauri/src-tauri/target/release/bundle/"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Build complete! 🎉                                  ║"
echo "║  Packages are in:                                    ║"
echo "║    tauri/src-tauri/target/release/bundle/            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
