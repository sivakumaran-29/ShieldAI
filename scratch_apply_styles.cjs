const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join('C:', 'ShieldAI', 'ShieldAI', 'src'));
const blueColor = '#3f6ad5';
const blueHover = '#3254a8';
const glowHover = 'hover:shadow-[0_0_15px_rgba(63,106,213,0.6)]';
const glowActive = 'active:shadow-[0_0_8px_rgba(63,106,213,0.4)]';

let modifiedFilesCount = 0;

for (const file of files) {
    if (file.includes('Login.tsx')) continue;

    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    const replacements = [
        { from: /bg-\[#5B8CFF\] hover:bg-\[#3b71f3\]/g, to: `bg-[${blueColor}] hover:bg-[${blueHover}] ${glowHover} ${glowActive}` },
        { from: /bg-\[#14B8A6\] hover:bg-\[#0d9488\]/g, to: `bg-[${blueColor}] hover:bg-[${blueHover}] ${glowHover} ${glowActive}` },
        { from: /bg-\[#EF4444\] hover:bg-\[#DC2626\]/g, to: `bg-[${blueColor}] hover:bg-[${blueHover}] ${glowHover} ${glowActive}` },
        { from: /bg-emerald-600\/20 text-emerald-500 border border-emerald-500\/30 hover:bg-emerald-600 hover:text-white/g, to: `bg-[${blueColor}] hover:bg-[${blueHover}] text-white border-none ${glowHover} ${glowActive}` },
        { from: /bg-\[#3f6ad5\] hover:bg-\[#3254a8\] text-white/g, to: `bg-[${blueColor}] hover:bg-[${blueHover}] text-white ${glowHover} ${glowActive}` }
    ];

    for (const rep of replacements) {
        content = content.replace(rep.from, rep.to);
    }
    
    content = content.replace(new RegExp(`${glowHover} ${glowHover}`, 'g'), glowHover);
    content = content.replace(new RegExp(`${glowActive} ${glowActive}`, 'g'), glowActive);

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedFilesCount++;
        console.log("Modified:", file);
    }
}

console.log("Files modified by script:", modifiedFilesCount);
