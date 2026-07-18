const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/pages/candidate/Dashboard.tsx',
  'src/pages/candidate/ExamShell.tsx',
  'src/pages/recruiter/Dashboard.tsx'
];

const replacements = [
  // Kill gradients
  { regex: /bg-gradient-to-[a-z]+\s+from-[\w-\/\[\]#]+\s+to-[\w-\/\[\]#]+/g, replacement: 'sys-bg' },
  { regex: /bg-gradient-[a-z-]+\s+from-[\w-\/\[\]#]+\s+via-[\w-\/\[\]#]+\s+to-[\w-\/\[\]#]+/g, replacement: 'sys-bg' },
  
  // Kill specific colors
  { regex: /text-teal-[0-9]+/g, replacement: 'text-[#5B8CFF]' },
  { regex: /bg-teal-[0-9]+\/[0-9]+/g, replacement: 'bg-[#5B8CFF]/10' },
  { regex: /bg-teal-[0-9]+/g, replacement: 'bg-[#5B8CFF]' },
  { regex: /border-teal-[0-9]+\/[0-9]+/g, replacement: 'border-[#5B8CFF]/20' },
  { regex: /border-teal-[0-9]+/g, replacement: 'border-[#5B8CFF]' },
  
  { regex: /text-indigo-[0-9]+/g, replacement: 'text-[#5B8CFF]' },
  { regex: /bg-indigo-[0-9]+\/[0-9]+/g, replacement: 'bg-[#5B8CFF]/10' },
  { regex: /bg-indigo-[0-9]+/g, replacement: 'bg-[#5B8CFF]' },
  { regex: /border-indigo-[0-9]+\/[0-9]+/g, replacement: 'border-[#5B8CFF]/20' },
  { regex: /border-indigo-[0-9]+/g, replacement: 'border-[#5B8CFF]' },

  { regex: /text-rose-[0-9]+/g, replacement: 'text-[#86868b]' },
  { regex: /bg-rose-[0-9]+\/[0-9]+/g, replacement: 'bg-[#1c1c1e]' },
  { regex: /bg-rose-[0-9]+/g, replacement: 'bg-[#1c1c1e]' },

  { regex: /text-amber-[0-9]+/g, replacement: 'text-[#86868b]' },
  { regex: /bg-amber-[0-9]+\/[0-9]+/g, replacement: 'bg-[#1c1c1e]' },
  { regex: /bg-amber-[0-9]+/g, replacement: 'bg-[#1c1c1e]' },
  
  { regex: /text-zinc-[0-9]+/g, replacement: 'sys-text-body' },
  { regex: /bg-zinc-[0-9]+\/[0-9]+/g, replacement: 'sys-card' },
  { regex: /bg-zinc-[0-9]+/g, replacement: 'sys-card' },
  { regex: /border-zinc-[0-9]+\/[0-9]+/g, replacement: 'border-[#38383a]' },
  { regex: /border-zinc-[0-9]+/g, replacement: 'border-[#38383a]' },

  { regex: /text-white\/[0-9]+/g, replacement: 'sys-text-body' },
];

targetFiles.forEach(file => {
  const filepath = path.join('c:/ShieldAI/ShieldAI', file);
  if (fs.existsSync(filepath)) {
    let content = fs.readFileSync(filepath, 'utf-8');
    
    replacements.forEach(({ regex, replacement }) => {
      content = content.replace(regex, replacement);
    });
    
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
});
