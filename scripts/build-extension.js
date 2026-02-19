import { build } from 'vite';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildExtension() {
  console.log('Building extension...');
  
  // Build with Vite
  await build();
  
  console.log('Copying extension files...');
  
  // Copy manifest.json
  const manifestPath = resolve(__dirname, '../manifest.json');
  const distManifestPath = resolve(__dirname, '../dist/manifest.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    
    // Update paths in manifest for dist structure
    manifest.side_panel.default_path = 'src/sidebar/sidebar.html';
    manifest.options_page = 'src/options/options.html';
    
    writeFileSync(distManifestPath, JSON.stringify(manifest, null, 2));
  }
  
  // Fix HTML files: Remove crossorigin attribute which can cause MIME type issues
  const sidebarHtmlPath = resolve(__dirname, '../dist/src/sidebar/sidebar.html');
  const optionsHtmlPath = resolve(__dirname, '../dist/src/options/options.html');
  
  if (existsSync(sidebarHtmlPath)) {
    let sidebarHtml = readFileSync(sidebarHtmlPath, 'utf-8');
    // Remove crossorigin attribute from script and link tags
    sidebarHtml = sidebarHtml.replace(/\scrossorigin/g, '');
    writeFileSync(sidebarHtmlPath, sidebarHtml);
  }
  
  if (existsSync(optionsHtmlPath)) {
    let optionsHtml = readFileSync(optionsHtmlPath, 'utf-8');
    // Remove crossorigin attribute
    optionsHtml = optionsHtml.replace(/\scrossorigin/g, '');
    writeFileSync(optionsHtmlPath, optionsHtml);
  }
  
  // Copy icons
  const iconsDir = resolve(__dirname, '../icons');
  const distIconsDir = resolve(__dirname, '../dist/icons');
  if (existsSync(iconsDir)) {
    mkdirSync(distIconsDir, { recursive: true });
    const { readdirSync, statSync } = await import('fs');
    readdirSync(iconsDir).forEach(file => {
      const srcPath = resolve(iconsDir, file);
      const destPath = resolve(distIconsDir, file);
      if (statSync(srcPath).isFile()) {
        copyFileSync(srcPath, destPath);
      }
    });
  }
  
  // Copy background and content scripts
  const filesToCopy = [
    { src: 'src/background/service-worker.js', dest: 'src/background/service-worker.js' },
    { src: 'src/content/content-script.js', dest: 'src/content/content-script.js' }
  ];
  
  filesToCopy.forEach(({ src, dest }) => {
    const srcPath = resolve(__dirname, '..', src);
    const destPath = resolve(__dirname, '../dist', dest);
    if (existsSync(srcPath)) {
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    }
  });
  
  // Copy other source files that might be needed
  const srcDirs = ['src/core', 'src/services', 'src/modules', 'src/utils'];
  const { readdirSync, statSync } = await import('fs');
  const copyRecursive = (src, dest) => {
    if (!existsSync(src)) return;
    mkdirSync(dest, { recursive: true });
    readdirSync(src).forEach(file => {
      const srcFile = resolve(src, file);
      const destFile = resolve(dest, file);
      if (statSync(srcFile).isDirectory()) {
        mkdirSync(destFile, { recursive: true });
        copyRecursive(srcFile, destFile);
      } else {
        copyFileSync(srcFile, destFile);
      }
    });
  };
  
  srcDirs.forEach(dir => {
    const srcPath = resolve(__dirname, '..', dir);
    const destPath = resolve(__dirname, '../dist', dir);
    copyRecursive(srcPath, destPath);
  });
  
  console.log('Build complete! Extension files are in dist/');
}

buildExtension().catch(console.error);
