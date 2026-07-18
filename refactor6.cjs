const fs = require('fs');
const path = require('path');

const targetDir = 'c:/ShieldAI/ShieldAI/src/components/recruiter';

const replacements = [
  // 1. Main Headings (// TITLE)
  { 
    regex: /<h2 className="text-\[10px\] font-mono font-bold tracking-widest text-\[\#5B8CFF\] uppercase">(\/\/[^<]+)<\/h2>/g, 
    replacement: '<h2 className="text-[12px] font-heading font-bold tracking-wider text-[#5B8CFF] uppercase">$1</h2>' 
  },
  { 
    regex: /<h2 className="text-xs font-mono font-bold tracking-widest text-\[\#5B8CFF\] uppercase">(\/\/[^<]+)<\/h2>/g, 
    replacement: '<h2 className="text-[12px] font-heading font-bold tracking-wider text-[#5B8CFF] uppercase">$1</h2>' 
  },
  // 2. Subtitles underneath headings
  { 
    regex: /<span className="text-\[10px\] sys-text-body font-mono mt-1 block">([^<]+)<\/span>/g, 
    replacement: '<span className="text-[11px] sys-text-body font-sans mt-1 block font-medium">$1</span>' 
  },
  { 
    regex: /<span className="text-xs sys-text-body font-mono mt-1 block">([^<]+)<\/span>/g, 
    replacement: '<span className="text-[11px] sys-text-body font-sans mt-1 block font-medium">$1</span>' 
  }
];

fs.readdirSync(targetDir).forEach(f => {
  if (f.endsWith('.tsx')) {
    let filepath = path.join(targetDir, f);
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
      console.log(`Updated headings in ${f}`);
    }
  }
});
