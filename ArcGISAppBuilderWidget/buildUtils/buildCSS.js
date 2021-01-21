const path = require('path');
const {find} = require('shelljs');
const appRootDir = require('app-root-dir').get();
const {existsSync, mkdirSync, writeFileSync} = require('graceful-fs');
const sass = require('sass');
const inputExts = new Set([
  // '.css',
  '.scss'
]);

//Each css file is built separately. They are not bundled for ArcGIS AppBuilder
for (const f of find(path.join(appRootDir, 'OptiSites'))) {
  const inputExt = path.extname(f);
  if (inputExts.has(inputExt)) {
    const outDir = path.join('dist', path.dirname(path.relative(appRootDir, f)));
    const outFilename = path.basename(f, inputExt) + '.css';
    const out = path.join(outDir, outFilename);
    console.log(`Writing ${out}`);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, {recursive: true});
    }
    const cssContent = sass.renderSync({file: f, outputStyle: 'compressed'}).css;
    writeFileSync(out, cssContent);
  }
}
