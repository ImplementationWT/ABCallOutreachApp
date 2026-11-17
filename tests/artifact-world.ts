/* Runs the domain part of artifact/app.html's script (everything before "===== STATE =====")
 * in Node and returns its collections, to compare them with lib/domain. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function artifactWorld() {
  const html = readFileSync(join(__dirname, '..', 'artifact', 'app.html'), 'utf8');
  const script = html.slice(html.indexOf('<script>') + '<script>'.length, html.lastIndexOf('</script>'));
  const start = script.indexOf("'use strict';") + "'use strict';".length;
  const end = script.indexOf('/* ===== STATE ===== */');
  const body = script.slice(start, end) + '\nreturn {PROPS, CTS, CALLS, LEADS, SYNC, DAY, DAYM, CLOCK};';
  return new Function(body)();
}
