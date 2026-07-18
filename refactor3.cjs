const fs = require('fs');
const path = require('path');

const targetDir = 'c:/ShieldAI/ShieldAI/src/components/recruiter';
const files = fs.readdirSync(targetDir).filter(file => file.endsWith('.tsx')).map(file => path.join(targetDir, file));

const replacements = [
  // Backgrounds & Surfaces
  { regex: /bg-zinc-950\/60/g, replacement: 'sys-bg' },
  { regex: /bg-zinc-950\/90/g, replacement: 'sys-panel' },
  { regex: /bg-zinc-950/g, replacement: 'sys-bg' },
  { regex: /bg-zinc-900\/60/g, replacement: 'sys-card' },
  { regex: /bg-zinc-900\/80/g, replacement: 'sys-card' },
  { regex: /bg-zinc-900/g, replacement: 'sys-card' },
  { regex: /bg-black\/40/g, replacement: 'sys-panel' },
  { regex: /bg-white\/\[0\.02\]/g, replacement: 'sys-table-row' },
  { regex: /bg-white\/5/g, replacement: 'hover:bg-[#1c1c1e]/80' },
  { regex: /backdrop-blur-xl/g, replacement: '' },
  { regex: /backdrop-blur-3xl/g, replacement: '' },
  { regex: /backdrop-blur-md/g, replacement: '' },
  { regex: /backdrop-blur-sm/g, replacement: '' },
  { regex: /backdrop-blur/g, replacement: '' },
  
  // Borders
  { regex: /border-white\/5/g, replacement: 'border-transparent' },
  { regex: /border-white\/10/g, replacement: 'border-transparent' },
  { regex: /border-zinc-800\/50/g, replacement: 'border-transparent' },
  { regex: /border-zinc-800/g, replacement: 'border-transparent' },
  { regex: /border-zinc-700/g, replacement: 'border-transparent' },
  
  // Text & Typography
  { regex: /text-zinc-500/g, replacement: 'sys-text-body' },
  { regex: /text-zinc-400/g, replacement: 'sys-text-body' },
  { regex: /text-zinc-300/g, replacement: 'sys-text-primary' },
  { regex: /text-zinc-200/g, replacement: 'sys-text-primary' },
  { regex: /text-zinc-100/g, replacement: 'text-white' },
  
  // Gradients (Remove them completely)
  { regex: /bg-gradient-to-[a-z]+\s+from-[\w-\/\[\]#]+\s+to-[\w-\/\[\]#]+/g, replacement: 'sys-bg' },
  { regex: /bg-gradient-[a-z-]+\s+from-[\w-\/\[\]#]+\s+via-[\w-\/\[\]#]+\s+to-[\w-\/\[\]#]+/g, replacement: 'sys-bg' },
  { regex: /bg-gradient-to-br from-indigo-500\/10 via-purple-500\/5 to-transparent/g, replacement: 'sys-card' },
  { regex: /bg-gradient-to-r from-blue-500 to-teal-400/g, replacement: 'bg-[#5B8CFF]' },
  { regex: /bg-gradient-to-r from-indigo-500 to-cyan-400/g, replacement: 'bg-[#5B8CFF]' },
  { regex: /from-teal-500\/20/g, replacement: 'from-[#14B8A6]/20' },
  { regex: /to-emerald-500\/20/g, replacement: 'to-transparent' },
  
  // Inputs and Buttons
  { regex: /focus:border-indigo-500\/50 focus:ring-indigo-500\/20/g, replacement: 'focus-within:border-[#5B8CFF] focus-within:ring-1 focus-within:ring-[#5B8CFF]' },
  { regex: /ring-indigo-500\/50/g, replacement: 'ring-[#5B8CFF]' },

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

files.forEach(filepath => {
  if (fs.existsSync(filepath)) {
    let content = fs.readFileSync(filepath, 'utf-8');
    
    replacements.forEach(({ regex, replacement }) => {
      content = content.replace(regex, replacement);
    });
    
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`Updated ${path.basename(filepath)}`);
  }
});
