const fs = require('fs');
const path = require('path');

const rules = [
  // Backgrounds
  { regex: /bg-\[#000000\]/g, replace: 'bg-background' },
  { regex: /bg-\[#09090B\]/g, replace: 'bg-background' },
  { regex: /bg-\[#08080A\]/g, replace: 'bg-background' },
  { regex: /bg-\[#111216\]/g, replace: 'bg-surface' },
  { regex: /bg-\[rgba\(28,28,30,0\.72\)\]/g, replace: 'bg-panel' },
  { regex: /bg-\[rgba\(28,28,30,0\.2\)\]/g, replace: 'bg-panel' },
  { regex: /bg-\[rgba\(28,28,30,0\.4\)\]/g, replace: 'bg-panel' },
  { regex: /bg-\[#1A1C20\]/g, replace: 'bg-input' },
  { regex: /bg-\[#0B0B0D\]/g, replace: 'bg-card' },

  // Text
  { regex: /text-\[#F5F5F5\]/g, replace: 'text-primary' },
  { regex: /(?<!\w)text-white(?!\/[0-9]+)/g, replace: 'text-primary' }, // only exact 'text-white'
  { regex: /text-\[#B8B8BC\]/g, replace: 'text-secondary' },
  { regex: /text-\[#B8BDC7\]/g, replace: 'text-secondary' },
  { regex: /text-\[#8A9099\]/g, replace: 'text-tertiary' },
  { regex: /text-\[#86868b\]/g, replace: 'text-tertiary' },
  { regex: /text-\[#A1A1AA\]/g, replace: 'text-tertiary' },

  // Borders
  { regex: /border-\[rgba\(255,255,255,0\.06\)\]/g, replace: 'border-divider' },
  { regex: /border-\[rgba\(255,255,255,0\.03\)\]/g, replace: 'border-divider' },
  { regex: /border-white\/5/g, replace: 'border-divider' },
  { regex: /border-white\/\[0\.02\]/g, replace: 'border-divider' },
  { regex: /border-white\/\[0\.03\]/g, replace: 'border-divider' },
  { regex: /border-zinc-800/g, replace: 'border-divider' },
  { regex: /border-white\/10/g, replace: 'border-border-strong' },

  // Divide (for tables and lists)
  { regex: /divide-white\/\[0\.02\]/g, replace: 'divide-divider' },
  { regex: /divide-white\/5/g, replace: 'divide-divider' },
  { regex: /divide-border\/60/g, replace: 'divide-divider' },

  // Hovers
  { regex: /hover:bg-\[#15171B\]/g, replace: 'hover:bg-hover' },
  { regex: /hover:bg-white\/5/g, replace: 'hover:bg-hover' },
  { regex: /hover:bg-white\/\[0\.02\]/g, replace: 'hover:bg-hover' },
  { regex: /hover:bg-white\/\[0\.03\]/g, replace: 'hover:bg-hover' },
  { regex: /hover:bg-\[rgba\(255,255,255,0\.04\)\]/g, replace: 'hover:bg-hover' },

  // Extra explicit elements that might be problematic in light mode if not updated
  { regex: /sys-bg\/20/g, replace: 'bg-hover' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      rules.forEach(rule => {
        if (content.match(rule.regex)) {
          content = content.replace(rule.regex, rule.replace);
          modified = true;
        }
      });
      
      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  });
}

const targetDir = path.join(__dirname, 'src');
processDirectory(targetDir);
console.log('Refactoring complete!');
