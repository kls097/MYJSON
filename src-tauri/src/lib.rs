use tauri::{Emitter, Manager};
use std::fs;
use std::io::Write;
use std::sync::{Arc, Mutex};

fn log_to_file(msg: &str) {
    let log_dir = dirs::home_dir()
        .map(|p| p.join(".my-json"))
        .unwrap_or_else(|| std::path::PathBuf::from(".my-json"));

    // Create directory if not exists
    let _ = fs::create_dir_all(&log_dir);

    let log_file = log_dir.join("app.log");
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
    {
        let _ = writeln!(f, "[{}] {}", chrono::Local::now().format("%Y-%m-%d %H:%M:%S"), msg);
    }
}

fn emit_file_to_window(window: &tauri::WebviewWindow, path_str: &str) -> bool {
    if !path_str.ends_with(".json") && !path_str.ends_with(".txt") {
        return false;
    }
    match fs::read_to_string(path_str) {
        Ok(content) => {
            log_to_file(&format!("File read successfully, size: {} bytes", content.len()));
            let file_name = std::path::Path::new(path_str)
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| "unknown".to_string());
            let payload = serde_json::json!({
                "path": path_str,
                "name": file_name,
                "content": content
            });
            let _ = window.emit("open-file", payload);
            log_to_file(&format!("Event emitted for file: {}", file_name));
            true
        }
        Err(e) => {
            log_to_file(&format!("Failed to read file: {}", e));
            false
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    log_to_file("Application starting...");

    // Pending files that arrive before the window is ready
    let pending_files: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    let pending_for_setup = pending_files.clone();
    let pending_for_run = pending_files.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            log_to_file(&format!("Single instance callback: {:?}", argv));

            if argv.len() > 1 {
                let file_path = &argv[1];
                log_to_file(&format!("Single instance file path: {}", file_path));

                if let Some(window) = app.get_webview_window("main") {
                    emit_file_to_window(&window, file_path);
                    let _ = window.set_focus();
                }
            }
        }))
        .setup(move |app| {
            log_to_file("Setup phase started");

            // Register deep link handler
            #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    let urls = event.urls();
                    log_to_file(&format!("Deep link received: {:?}", urls));
                    for url in urls {
                        let url_str = url.to_string();
                        log_to_file(&format!("Processing URL: {}", url_str));

                        // Handle jsonbox://open?path=/path/to/file.json
                        if let Some(query) = url.query() {
                            if query.starts_with("path=") {
                                let file_path = &query[5..];
                                log_to_file(&format!("Extracted file path from deep link: {}", file_path));

                                if let Some(window) = handle.get_webview_window("main") {
                                    emit_file_to_window(&window, file_path);
                                }
                            }
                        }
                    }
                });
            }

            // Handle file open from command line args
            let args: Vec<String> = std::env::args().collect();
            log_to_file(&format!("Command line args: {:?}", args));

            if args.len() > 1 {
                let file_path = &args[1];
                log_to_file(&format!("Setup file path: {}", file_path));

                if file_path.ends_with(".json") || file_path.ends_with(".txt") {
                    if let Some(window) = app.get_webview_window("main") {
                        emit_file_to_window(&window, file_path);
                    }
                }
            } else {
                log_to_file("No command line args found");
            }

            // Process any pending files that arrived via RunEvent::Opened before setup
            let pending = pending_for_setup.lock().unwrap().clone();
            if !pending.is_empty() {
                log_to_file(&format!("Processing {} pending files from early RunEvent::Opened", pending.len()));
                if let Some(window) = app.get_webview_window("main") {
                    for path_str in &pending {
                        log_to_file(&format!("Emitting pending file: {}", path_str));
                        emit_file_to_window(&window, path_str);
                    }
                    pending_for_setup.lock().unwrap().clear();
                } else {
                    log_to_file("Window still not ready during setup, files remain pending");
                }
            }

            // Also set up a delayed emit for pending files (window webview might not be fully loaded yet)
            let handle = app.handle().clone();
            let pending_for_delayed = pending_for_setup.clone();
            std::thread::spawn(move || {
                // Wait for the frontend to be ready
                std::thread::sleep(std::time::Duration::from_millis(1500));
                let pending = pending_for_delayed.lock().unwrap().clone();
                if !pending.is_empty() {
                    log_to_file(&format!("Delayed: processing {} pending files", pending.len()));
                    if let Some(window) = handle.get_webview_window("main") {
                        for path_str in &pending {
                            emit_file_to_window(&window, path_str);
                        }
                        pending_for_delayed.lock().unwrap().clear();
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) = event {
                for path in paths {
                    if let Some(ext) = path.extension() {
                        if ext == "json" || ext == "txt" {
                            let path_str = path.to_string_lossy().to_string();
                            log_to_file(&format!("Drag-drop file: {}", path_str));
                            if !path_str.ends_with(".json") && !path_str.ends_with(".txt") {
                                continue;
                            }
                            match fs::read_to_string(&path_str) {
                                Ok(content) => {
                                    let file_name = path.file_name()
                                        .map(|s| s.to_string_lossy().to_string())
                                        .unwrap_or_else(|| "unknown".to_string());
                                    let payload = serde_json::json!({
                                        "path": path_str,
                                        "name": file_name,
                                        "content": content
                                    });
                                    let _ = window.emit("open-file", payload);
                                    log_to_file(&format!("Drag-drop event emitted for: {}", file_name));
                                }
                                Err(e) => {
                                    log_to_file(&format!("Failed to read drag-drop file: {}", e));
                                }
                            }
                        }
                    }
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |app, event| {
            if let tauri::RunEvent::Opened { urls } = event {
                log_to_file(&format!("RunEvent::Opened received: {:?}", urls));

                for url in urls {
                    let file_path = url.to_file_path().unwrap_or_default();
                    let path_str = file_path.to_string_lossy().to_string();
                    log_to_file(&format!("Processing opened file: {}", path_str));

                    if !path_str.ends_with(".json") && !path_str.ends_with(".txt") {
                        continue;
                    }

                    if let Some(window) = app.get_webview_window("main") {
                        emit_file_to_window(&window, &path_str);
                        let _ = window.set_focus();
                    } else {
                        // Window not ready yet, queue for later
                        log_to_file(&format!("Window not ready, queuing file: {}", path_str));
                        pending_for_run.lock().unwrap().push(path_str);
                    }
                }
            }
        });
}
