// main.rs — Tauri entry point (thin wrapper around lib.rs)
// The actual application logic lives in lib.rs so it can be
// shared with the mobile entry point macro.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_lib::run();
}
