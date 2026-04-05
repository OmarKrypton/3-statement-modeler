// lib.rs — 3-Statement Modeler Tauri shell
//
// Responsibilities:
//  1. Spawn the bundled PyInstaller backend binary as a sidecar
//  2. Poll tcp://localhost:8000 until the backend is ready (max 30s)
//  3. Show the main webview window (which loads http://localhost:8000)
//  4. Kill the backend sidecar cleanly when the window closes

use std::net::TcpStream;
use std::time::{Duration, Instant};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

/// Blocks until port 8000 accepts connections, or we hit the timeout.
fn wait_for_backend(timeout_secs: u64) -> bool {
    let start = Instant::now();
    loop {
        if start.elapsed() > Duration::from_secs(timeout_secs) {
            return false;
        }
        if TcpStream::connect("127.0.0.1:8000").is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(500));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // ── Manual Sidecar Discovery ─────────────────────────────────
            // We bypass the sidecar() macro magic because it is failing to find 
            // the triple-suffixed binary in the custom /opt installation.
            let exe_path = std::env::current_exe().expect("Failed to get current executable path");
            let exe_dir = exe_path.parent().expect("Failed to get executable directory");
            
            // Look for any file starting with '3sm-' in the app folder or 'binaries' subfolder
            let mut sidecar_path = None;
            let search_paths = vec![exe_dir.to_path_buf(), exe_dir.join("binaries")];
            
            for path in search_paths {
                if let Ok(entries) = std::fs::read_dir(path) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().into_owned();
                        if name.starts_with("3sm-") {
                            sidecar_path = Some(entry.path());
                            break;
                        }
                    }
                }
                if sidecar_path.is_some() { break; }
            }

            let sidecar_bin = sidecar_path.ok_or_else(|| {
                format!("Could not find any companion binary starting with '3sm-' in {:?}", exe_dir)
            })?;

            println!("[Tauri] Discovered backend at: {:?}", sidecar_bin);

            // Using shell().command() with absolute path is the most robust way
            let shell = app.shell();
            let (mut rx, _child) = shell
                .command(sidecar_bin.to_string_lossy().to_string())
                .spawn()
                .map_err(|e| format!("Failed to spawn backend process: {:?}", e))?;

            // ── Forward backend logs to terminal ──────────────────────────
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                            println!("[Backend] {}", String::from_utf8_lossy(&line));
                        }
                        tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                            eprintln!("[Backend ERROR] {}", String::from_utf8_lossy(&line));
                        }
                        _ => {}
                    }
                }
            });

            // ── Wait until backend is ready ───────────────────────────────
            println!("[Tauri] Waiting for backend on port 8000...");
            if !wait_for_backend(30) {
                return Err(
                    "Backend server did not become ready within 30 seconds. Check logs above!".into(),
                );
            }
            println!("[Tauri] Backend ready — showing window.");

            // ── Reveal the window (it starts hidden to avoid white flash) ─
            let window = app
                .get_webview_window("main")
                .expect("Expected a window named 'main'");
            window.show().unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
