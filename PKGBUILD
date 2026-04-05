# Maintainer: Omar <omar@3smodeler.com>
pkgname=3-statement-modeler
pkgver=1.0.0
pkgrel=1
pkgdesc="Automated 3-Statement Financial Modeler"
arch=('x86_64')
url="https://github.com/omar/3-statement-modeler"
license=('Propietary')
depends=()
options=('!strip')
source=("3-statement-modeler.desktop")
sha256sums=('SKIP')

# Paths relative to project root
_PROJECT_ROOT="/home/omar/My-Projects/3-statement-modeler"
_TAURI_BIN_DIR="$_PROJECT_ROOT/tauri/src-tauri/target/release"

package() {
  # ── Step 1: Install binary folder to /opt ───────────────────────────────────
  install -dm755 "$pkgdir/opt/$pkgname"
  # Copy the binary and its sidecar (the python backend)
  cp "$_TAURI_BIN_DIR/three-statement-modeler" "$pkgdir/opt/$pkgname/"
  
  # Provide the sidecar in BOTH root and 'binaries' folder for maximum compatibility
  install -dm755 "$pkgdir/opt/$pkgname/binaries"
  cp "$_PROJECT_ROOT/tauri/src-tauri/binaries/3sm-"* "$pkgdir/opt/$pkgname/"
  cp "$_PROJECT_ROOT/tauri/src-tauri/binaries/3sm-"* "$pkgdir/opt/$pkgname/binaries/"
  
  # CRITICAL: Copy the entire internal library folder required by the python backend
  cp -r "$_PROJECT_ROOT/backend/dist/3sm/_internal" "$pkgdir/opt/$pkgname/"

  chmod +x "$pkgdir/opt/$pkgname/3sm-"*
  chmod +x "$pkgdir/opt/$pkgname/binaries/3sm-"*

  # ── Step 2: Symlink to /usr/bin ─────────────────────────────────────────────
  install -dm755 "$pkgdir/usr/bin"
  ln -s "/opt/$pkgname/three-statement-modeler" "$pkgdir/usr/bin/$pkgname"

  # ── Step 3: Install desktop entry ───────────────────────────────────────────
  install -Dm644 "$_PROJECT_ROOT/3-statement-modeler.desktop" \
    "$pkgdir/usr/share/applications/$pkgname.desktop"

  # ── Step 4: Install icon ────────────────────────────────────────────────────
  # Using /usr/share/pixmaps is the most reliable catch-all for PNG icons on Linux
  install -Dm644 "$_PROJECT_ROOT/assets/icon.png" \
    "$pkgdir/usr/share/pixmaps/$pkgname.png"
}
