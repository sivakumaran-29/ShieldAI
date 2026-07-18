const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const targetDirs = [
  'c:/ShieldAI/ShieldAI/src/pages',
  'c:/ShieldAI/ShieldAI/src/components'
];

const replacements = [
  { regex: /border-border/g, replacement: 'border-white/5' },
  { regex: /border-\[\#38383a\]/g, replacement: 'border-white/5' },
  { regex: /border-\[\#38383a\]\/50/g, replacement: 'border-white/5' },
  { regex: /bg-\[\#1c1c1e\]/g, replacement: 'bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px]' },
  { regex: /bg-\[\#1c1c1e\]\/50/g, replacement: 'bg-[rgba(28,28,30,0.5)] backdrop-blur-[16px]' },
  { regex: /bg-\[\#1c1c1e\]\/30/g, replacement: 'bg-[rgba(28,28,30,0.3)] backdrop-blur-[16px]' },
];

targetDirs.forEach(dir => {
  walkDir(dir, filepath => {
    if (filepath.endsWith('.tsx') && !filepath.includes('AmbientGlow')) {
      let content = fs.readFileSync(filepath, 'utf-8');
      
      let modified = false;
      replacements.forEach(({ regex, replacement }) => {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      });
      
      if (modified) {
        fs.writeFileSync(filepath, content, 'utf-8');
        console.log(`Updated ${path.basename(filepath)}`);
      }
    }
  });
});
