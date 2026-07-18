const fs = require('fs');

const filepath = 'c:/ShieldAI/ShieldAI/src/components/recruiter/DatabaseTab.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// 1. Outer Card styling
content = content.replace(
  /className="bg-\[rgba\(28,28,30,0\.72\)\] backdrop-blur-\[16px\] border-white\/5 rounded-2xl overflow-hidden shadow-sm"/g,
  'className="bg-[rgba(28,28,30,0.3)] backdrop-blur-[24px] border-white/5 rounded-[24px] overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] hover:border-white/10"'
);

// 2. Inner header
content = content.replace(
  /className="p-4 sys-bg hover:sys-bg\/80 cursor-pointer flex items-center justify-between transition group"/g,
  'className="p-5 bg-transparent hover:bg-white/[0.02] cursor-pointer flex items-center justify-between transition-colors duration-300 group"'
);

// 3. Folder icon and text
content = content.replace(
  /<div className="flex items-center gap-2">\s*<Folder className="w-4 h-4 text-\[\#5B8CFF\]" \/>\s*<h3 className="font-bold text-sm text-white font-heading tracking-tight">/g,
  '<div className="flex items-center gap-3"><div className="p-2 bg-[#5B8CFF]/10 rounded-xl group-hover:scale-110 transition-transform duration-300"><Folder className="w-4 h-4 text-[#5B8CFF]" /></div><h3 className="font-bold text-base text-white font-heading tracking-wide">'
);

// 4. Dept expanded container
content = content.replace(
  /className="border-t border-white\/5\/50 bg-\[rgba\(28,28,30,0\.72\)\] backdrop-blur-\[16px\] p-4 space-y-4"/g,
  'className="border-t border-white/5 bg-black/20 p-6 space-y-4"'
);

// 5. Batch boxes
content = content.replace(
  /className="border border-white\/5\/50 rounded-xl overflow-hidden sys-bg\/30"/g,
  'className="border border-white/5 rounded-2xl overflow-hidden bg-[rgba(28,28,30,0.4)] backdrop-blur-md shadow-sm transition-all duration-300 hover:border-white/10"'
);

// 6. Batch header
content = content.replace(
  /className="p-3 hover:sys-card\/40 cursor-pointer flex items-center justify-between transition group\/batch"/g,
  'className="p-4 hover:bg-white/[0.02] cursor-pointer flex items-center justify-between transition-colors duration-300 group/batch"'
);

content = content.replace(
  /<span className="font-bold text-xs sys-text-primary font-heading">/g,
  '<span className="font-bold text-sm text-white font-heading tracking-wide">'
);

// 7. Batch expanded container
content = content.replace(
  /<div className="border-t border-white\/5\/50">\s*<table className="w-full text-left text-xs">/g,
  '<div className="border-t border-white/5 pb-2"><div className="overflow-x-auto px-4 pt-4"><table className="w-full text-left text-xs border-collapse">'
);

// 8. Table headers
content = content.replace(
  /<tr className="sys-bg\/80 sys-text-body font-mono text-\[9px\] uppercase tracking-wider">\s*<th className="py-2\.5 px-6 font-medium">Roll Number<\/th>\s*<th className="py-2\.5 px-6 font-medium">Email Address<\/th>\s*<th className="py-2\.5 px-6 text-right font-medium">Actions<\/th>\s*<\/tr>/g,
  '<tr className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] sys-text-body font-sans font-semibold text-[10px] uppercase tracking-wider"><th className="py-3 px-5 rounded-l-2xl border-y border-l border-white/5">Roll Number</th><th className="py-3 px-5 border-y border-white/5">Email Address</th><th className="py-3 px-5 rounded-r-2xl border-y border-r border-white/5 text-right">Actions</th></tr>'
);

// 9. Table tbody
content = content.replace(
  /<tbody className="divide-y divide-border\/20">/g,
  '<tbody className="divide-y divide-white/[0.02]"><tr className="h-2"></tr>'
);

// 10. Table row
content = content.replace(
  /<tr key=\{user\.id\} className="hover:sys-card\/40 transition group\/row">/g,
  '<tr key={user.id} className="hover:bg-white/[0.02] transition-colors duration-200 group/row">'
);

content = content.replace(
  /<td className="py-2\.5 px-6 font-mono font-bold sys-text-primary">/g,
  '<td className="py-3 px-5 font-semibold font-heading text-white max-w-xs truncate">'
);

content = content.replace(
  /<td className="py-2\.5 px-6 sys-text-body">/g,
  '<td className="py-3 px-5 sys-text-body font-sans">'
);

content = content.replace(
  /<td className="py-2 px-6 text-right">/g,
  '<td className="py-2 px-5 text-right">'
);

// 11. Add missing </div> for overflow-x-auto
content = content.replace(
  /<\/tbody>\s*<\/table>\s*<\/div>/g,
  '</tbody></table></div></div>'
);

fs.writeFileSync(filepath, content, 'utf-8');
console.log('DatabaseTab.tsx updated successfully');
