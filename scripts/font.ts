// fonts-local/Pixelta-*.ttf -> public/fonts/*.woff2 (all git-ignored; licensed fonts, SPEC §2.1)
import fs from 'node:fs';
import wawoff2 from 'wawoff2';
for (const name of ['Pixelta-Regular', 'Pixelta-Rounded']) {
  const src = `fonts-local/${name}.ttf`;
  if (!fs.existsSync(src)) {
    console.log(`No ${src}; the app falls back to Pixelify Sans.`);
    continue;
  }
  fs.writeFileSync(`public/fonts/${name}.woff2`, await wawoff2.compress(fs.readFileSync(src)));
  console.log('wrote', `public/fonts/${name}.woff2`);
}
