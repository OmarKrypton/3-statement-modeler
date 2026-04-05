"""
server.py — Entry point used by PyInstaller.

This script starts the FastAPI/uvicorn backend programmatically so that
PyInstaller can bundle it into a single binary. It is NOT used in development
(use `uvicorn app.main:app --reload` for that).
"""
import os
import sys
import signal
import logging


def get_base_dir() -> str:
    """
    When frozen by PyInstaller, sys._MEIPASS points to the temp directory
    where bundled resources are extracted. We set the CWD there so that
    relative imports inside the `app` package work correctly.
    """
    if getattr(sys, "frozen", False):
        return sys._MEIPASS  # type: ignore[attr-defined]
    return os.path.dirname(os.path.abspath(__file__))


def main() -> None:
    base_dir = get_base_dir()
    # Make sure the bundled `app` package is importable
    if base_dir not in sys.path:
        sys.path.insert(0, base_dir)

    os.chdir(base_dir)

    import uvicorn

    # Handle SIGTERM gracefully (sent by Electron when the window closes)
    def handle_sigterm(*_):
        logging.info("Received SIGTERM — shutting down.")
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_sigterm)

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        log_level="warning",   # Keep stdout clean; Electron will discard it anyway
    )


if __name__ == "__main__":
    main()
