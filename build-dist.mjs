// Собирает dist/ — то, что кладётся внутрь настольного приложения.
// Сайт на GitHub Pages живёт прямо из корня, оттого отдельной сборки ему не
// надобно; настольной же обёртке нужна папка с одними лишь игровыми файлами,
// без сервера, без узлов npm и без прочего хозяйства.
import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const TAKE = ['index.html', 'game.js', 'manifest.webmanifest', 'sw.js', 'fonts'];

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
for (const name of TAKE) {
  try {
    await cp(join(ROOT, name), join(DIST, name), { recursive: true });
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    console.warn('нет файла, пропущен:', name);
  }
}

let bytes = 0;
async function weigh(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await weigh(p); else bytes += (await stat(p)).size;
  }
}
await weigh(DIST);
console.log('dist собран · ' + (bytes / 1048576).toFixed(2) + ' МБ');
