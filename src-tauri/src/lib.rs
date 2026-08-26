// Настольная обёртка держит игру при себе: ни сети, ни установщика для
// запуска не нужно. Сама игра — те же index.html и game.js, что и на сайте,
// оттого правка в одном месте достаётся сразу и браузеру, и приложению.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Linux: WebKitGTK по умолчанию отдаёт картинку через DMABUF, а на иных
    // связках драйвера и композитора этот путь не заводится вовсе — окно
    // умирает при рождении («Error 71 (Protocol error) dispatching to Wayland
    // display», а под XWayland — «Failed to create GBM buffer»). Проверено на
    // KWin/Wayland. Отключаем DMABUF, покуда хозяин машины не сказал иного:
    // заданную снаружи переменную не трогаем, оттого её всегда можно вернуть.
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("не удалось поднять окно игры");
}
