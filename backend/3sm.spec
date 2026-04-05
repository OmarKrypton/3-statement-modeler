# -*- mode: python ; coding: utf-8 -*-
#
# PyInstaller spec for 3-Statement Modeler backend
#
# Run from the `backend/` directory:
#   pyinstaller 3sm.spec
#
# Output: dist/3sm/   (folder mode, easier for Electron to bundle)

import os
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

block_cipher = None

# ── Collect hidden imports that PyInstaller misses ──────────────────────────
hidden_imports = (
    collect_submodules("uvicorn")
    + collect_submodules("fastapi")
    + collect_submodules("sqlalchemy")
    + collect_submodules("starlette")
    + collect_submodules("pydantic")
    + collect_submodules("anyio")
    + collect_submodules("app")
    + [
        "anyio._backends._asyncio",
        "anyio._backends._trio",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "email.mime.text",
        "email.mime.multipart",
    ]
)

# ── Data files ───────────────────────────────────────────────────────────────
# Include the Next.js static build.
# The build script copies frontend/out/ → backend/static/ before running PyInstaller.
datas = []

static_dir = os.path.join(os.path.dirname(os.path.abspath(SPEC)), "static")
if os.path.exists(static_dir):
    datas.append((static_dir, "static"))

# Include pydantic's data files needed at runtime
datas += collect_data_files("pydantic")
datas += collect_data_files("fastapi")

# ── Analysis ─────────────────────────────────────────────────────────────────
a = Analysis(
    ["server.py"],
    pathex=["."],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "test", "_pytest"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="3sm",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,          # No terminal window on Windows; set True to debug
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="3sm",
)
