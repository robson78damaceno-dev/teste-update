#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::async_runtime::spawn;
use tauri::Manager;
use tokio::time::{sleep, Duration};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            spawn(async move {
                sleep(Duration::from_secs(2)).await;
                if let Some(splash) = handle.get_webview_window("splash") {
                    let _ = splash.close();
                }
                if let Some(main_win) = handle.get_webview_window("main") {
                    let _ = main_win.show();
                    let _ = main_win.maximize();
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
