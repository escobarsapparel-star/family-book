import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(root, 'android-app');
const www = path.join(app, 'www');
const require = createRequire(path.join(app, 'package.json'));
const { build } = require('esbuild');
const hash = createHash('sha256');
const lock = JSON.parse(await fs.readFile(path.join(app, 'package-lock.json')));
// Hash native source/config and resolved runtime dependencies. A changed native
// plugin or permission creates a separate feed, requiring a new APK.
for (const [name, info] of Object.entries(lock.packages).sort()) {
  if (name.includes('node_modules/@capacitor/') || name.includes('node_modules/@capgo/')) {
    hash.update(name + ':' + info.version + ':' + (info.integrity || ''));
  }
}
async function nativeFiles(dir) {
  for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
    if (['build','.gradle','.idea','assets','capacitor-cordova-android-plugins'].includes(entry.name)) continue;
    if (['local.properties','google-services.json','capacitor.build.gradle','capacitor.settings.gradle','key.properties','keystore.properties'].includes(entry.name) || /\.(jks|keystore)$/.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (path.relative(app, full).replaceAll('\\','/') === 'android/app/src/main/res/xml/config.xml') continue;
    if (entry.isDirectory()) await nativeFiles(full);
    else if (entry.isFile()) {
      const relative = path.relative(app,full).replaceAll('\\','/');
      let content = await fs.readFile(full);
      // Android versionCode/versionName identify the APK build, but they do not
      // change WebView/plugin compatibility. Ignore only those two metadata lines
      // so a normal app version bump does not strand existing installs on a new
      // OTA feed. Any other native Gradle/source change still changes the runtime.
      if (relative === 'android/app/build.gradle') {
        const normalized = content.toString('utf8')
          .replace(/(^\s*versionCode\s+)\d+/gm,'$1<RUNTIME_VERSION_CODE>')
          .replace(/(^\s*versionName\s+)"[^"]*"/gm,'$1"<RUNTIME_VERSION_NAME>"');
        content = Buffer.from(normalized,'utf8');
      }
      hash.update(relative);
      hash.update(content);
    }
  }
}
await nativeFiles(path.join(app,'android'));
hash.update(await fs.readFile(path.join(app,'capacitor.config.json')));
const runtime = hash.digest('hex').slice(0,20);
let commit = process.env.GITHUB_SHA;
if (!commit) { try { commit = execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(); } catch { commit = '0'.repeat(40); } }
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid source commit');
const version = `web-${commit}`;
await fs.rm(www,{recursive:true,force:true}); await fs.mkdir(www,{recursive:true});
for (const dir of ['js','css','assets','legal']) await fs.cp(path.join(root,dir),path.join(www,dir),{recursive:true});
for (const name of ['index.html','family-fun.html','manifest.json']) await fs.copyFile(path.join(root,name),path.join(www,name));
await fs.cp(path.join(app,'web-overrides'),www,{recursive:true});
await fs.mkdir(path.join(www,'vendor'),{recursive:true});
const vendors = [
  ['https://unpkg.com/lucide@latest','lucide/dist/umd/lucide.js','vendor/lucide.js'],
  ['https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js','html2canvas/dist/html2canvas.min.js','vendor/html2canvas.js'],
  ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','@supabase/supabase-js/dist/umd/supabase.js','vendor/supabase.js']
];
let html = await fs.readFile(path.join(www,'index.html'),'utf8');
for (const [url,source,target] of vendors) {
  await fs.copyFile(path.join(app,'node_modules',source),path.join(www,target));
  if (!html.includes(url)) throw new Error(`Vendor reference changed: ${url}`);
  html = html.replaceAll(url,target);
}
html = html.replace('</head>','<link rel="stylesheet" href="css/apk-native.css">\n<script src="js/apk-native-bridge.js"></script>\n</head>');
html = html.replace('</body>','<script src="js/apk-native-enhancements.js"></script>\n</body>');
// The native updater owns the bundle cache; a website service worker must not
// intercept it and return files from an older bundle.
html = html.replace("if('serviceWorker' in navigator)","if(!window.Capacitor?.isNativePlatform?.() && 'serviceWorker' in navigator)");
await fs.writeFile(path.join(www,'index.html'),html);

// Family Fun is a standalone document inside the Android bundle, so it must
// receive the same native bridge/overrides as index.html. Without this, the
// app loads website behavior here and bypasses Android-specific gallery fixes.
let familyFunHtml = await fs.readFile(path.join(www,'family-fun.html'),'utf8');
familyFunHtml = familyFunHtml.replace('</head>','<link rel="stylesheet" href="css/apk-native.css">\n<script src="js/apk-native-bridge.js"></script>\n</head>');
familyFunHtml = familyFunHtml.replace('</body>','<script src="js/apk-native-enhancements.js"></script>\n</body>');
await fs.writeFile(path.join(www,'family-fun.html'),familyFunHtml);
await build({entryPoints:[path.join(app,'native-bridge-entry.js')],bundle:true,format:'iife',target:'es2020',outfile:path.join(www,'js/apk-native-bridge.js'),define:{__FB_RUNTIME__:JSON.stringify(runtime),__FB_BUNDLE_VERSION__:JSON.stringify(version)}});
// Catch broken static entrypoint references before publishing any update.
for (const match of html.matchAll(/(?:src|href)="([^"?#]+)[^"]*"/g)) {
  const ref = match[1];
  if (/^(https?:|data:|#|\/)/.test(ref)) continue;
  await fs.access(path.join(www,ref));
}
await fs.writeFile(path.join(app,'bundle-info.json'),JSON.stringify({runtime,version,commit},null,2)+'\n');
console.log(`Prepared ${version} for Android runtime ${runtime}`);
