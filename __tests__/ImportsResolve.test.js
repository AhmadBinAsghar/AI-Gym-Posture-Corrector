const fs = require('fs');
const path = require('path');

// Metro bundles a wrong relative path without complaint and only fails at
// runtime, so verify every relative import points at a real file.
const ROOTS = [path.join(__dirname, '..', 'src'), path.join(__dirname, '..', 'App.js')];
const EXTS = ['', '.js', '.ts', '.tsx', '.json', '/index.js', '/index.ts'];

const walk = p =>
  fs.statSync(p).isDirectory()
    ? fs.readdirSync(p).flatMap(f => walk(path.join(p, f)))
    : p.endsWith('.js')
    ? [p]
    : [];

test('every relative import resolves to an existing file', () => {
  const missing = [];
  for (const file of ROOTS.flatMap(walk)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/(?:from|require\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(file), m[1]);
      if (!EXTS.some(e => fs.existsSync(target + e) && fs.statSync(target + e).isFile())) {
        missing.push(`${path.relative(process.cwd(), file)} -> ${m[1]}`);
      }
    }
  }
  expect(missing).toEqual([]);
});
