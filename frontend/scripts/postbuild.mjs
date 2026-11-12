// Makes dist/index.html openable directly from the file system (file://) without a server:
// module scripts with crossorigin are blocked on file://, so load the bundle as a deferred classic script.
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'dist/index.html';
const html = readFileSync(file, 'utf8')
  .replace(/<script type="module" crossorigin/, '<script defer')
  .replace(/ crossorigin(?:="")?(?=[^>]*\.\/assets)/g, '');

writeFileSync(file, html);
