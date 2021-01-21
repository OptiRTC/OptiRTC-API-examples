const path = require('path');
const {find} = require('shelljs');
const appRootDir = require('app-root-dir').get();
const {existsSync, mkdirSync, readFileSync, writeFileSync} = require('graceful-fs');
const tmpDir = path.join(appRootDir, '.tmp');
const {minify} = require('terser');
const options = {
  ecma: 5,
  toplevel: false,
  mangle: true,
  compress: true
};

//Each js file is minified separately. They are not bundled for ArcGIS AppBuilder
(async() => {
  for (const f of find(tmpDir)) {
    const inputExt = path.extname(f);
    if (inputExt === '.js') {
      const outDir = path.join('dist', 'OptiSites', path.dirname(path.relative(tmpDir, f)));
      const outFilename = path.basename(f, inputExt) + '.js';
      const out = path.join(outDir, outFilename);
      const relInput = path.relative(appRootDir, f);
      console.log(`Minifying ${relInput} to ${out}`);
      if (!existsSync(outDir)) {
        mkdirSync(outDir, {recursive: true});
      }
      const inputContent = readFileSync(f).toString();
      const {code} = await minify(inputContent, options)
      console.log(`Compression: ${inputContent.length} bytes => ${code.length} bytes`);
      writeFileSync(out, code);
    }
  }
})();
