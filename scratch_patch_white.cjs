const fs = require('fs');
const path = require('path');

const rules = [
  // Fix text-white with opacity that doesn't adapt to light mode
  { regex: /text-white\/60/g, replace: 'text-tertiary' },
  { regex: /text-white\/50/g, replace: 'text-tertiary' },
  { regex: /text-white\/40/g, replace: 'text-tertiary' },
  { regex: /text-white\/30/g, replace: 'text-tertiary' },
  
  // Fix bg-white with opacity
  { regex: /bg-white\/5(?![0-9])/g, replace: 'bg-divider' },
  { regex: /bg-white\/10(?![0-9])/g, replace: 'bg-hover' },
  { regex: /bg-white\/30(?![0-9])/g, replace: 'bg-divider' },
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
console.log('Patch complete!');
