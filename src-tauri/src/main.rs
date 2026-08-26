// Прихожая настольной «бесконечной ночи».
// Окно без рамочных излишеств, а вся игра — внутри, как и в браузере.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    noch_lib::run();
}
