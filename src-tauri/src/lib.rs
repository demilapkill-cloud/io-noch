// Настольная обёртка держит игру при себе: ни сети, ни установщика для
// запуска не нужно. Сама игра — те же index.html и game.js, что и на сайте,
// оттого правка в одном месте достаётся сразу и браузеру, и приложению.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
