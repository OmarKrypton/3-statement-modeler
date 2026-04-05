#!/usr/bin/env bash
# =============================================================================
# install-arch.sh — Build and Install 3-Statement Modeler (Arch Tauri Way)
# =============================================================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICON_SRC="$PROJECT_DIR/assets/icon.png"
DESKTOP_SRC="$PROJECT_DIR/3-statement-modeler.desktop"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       3-Statement Modeler — install-arch.sh         ║"
echo "║             (Tauri Migration Version)               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Full build ────────────────────────────────────────────────────────
# Note: build.sh now handles Frontend, Backend, AND Tauri packaging.
echo "▶ [1/3] Running full Tauri build (Frontend, Backend, Rust)..."
"$PROJECT_DIR/build.sh"

# ── Step 2: Install via makepkg ───────────────────────────────────────────────
echo "▶ [2/3] Installing officially via makepkg (requires sudo)..."
cd "$PROJECT_DIR"
# -f: force overwrite, -s: install dependencies, -i: install package
makepkg -fsi --noconfirm

# ── Step 3: Refresh system caches ─────────────────────────────────────────────
echo "▶ [3/3] Refreshing system desktop and icon caches..."
# Force install icon and desktop entry just in case makepkg ran from an old cache
sudo install -Dm644 "$ICON_SRC" "/usr/share/pixmaps/3-statement-modeler.png"
sudo install -Dm644 "$DESKTOP_SRC" "/usr/share/applications/3-statement-modeler.desktop"

sudo update-desktop-database /usr/share/applications/
sudo gtk-update-icon-cache -f -t /usr/share/icons/hicolor/ 2>/dev/null || true
xdg-desktop-menu forceupdate 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Installation Complete! 🎉                           ║"
echo "║  Launch via: Application Menu or terminal:           ║"
echo "║  $ 3-statement-modeler                               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Architecture: TAURI (Rust + WebKit)"
echo "  Icon:         /usr/share/pixmaps/3-statement-modeler.png"
echo ""
