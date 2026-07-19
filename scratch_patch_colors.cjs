const fs = require('fs');
const path = require('path');

const rules = [
  // Fix blue buttons having text-primary (which is black in light mode)
  { regex: /bg-\[#3f6ad5\]([\s\S]*?)text-primary/g, replace: 'bg-[#3f6ad5]$1text-white' },
  // Fix missed DatabaseTab container which had 0.3 opacity
  { regex: /bg-\[rgba\(28,28,30,0\.3\)\]/g, replace: 'bg-card' },
  // Also any bg-black inside panels that might have been missed
  { regex: /bg-black\/40/g, replace: 'bg-surface/50' }
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
