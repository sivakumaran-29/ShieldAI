const fs = require('fs');
const path = require('path');

function replaceColors(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceColors(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.css') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content
                .replace(/#06070B/gi, '#000000')
                .replace(/#0E121A/gi, '#0a0a0a')
                .replace(/#171D29/gi, '#1c1c1e')
                .replace(/#1F2735/gi, '#2c2c2e');
            
            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent);
                console.log('Updated: ' + fullPath);
            }
        }
    }
}
replaceColors(path.join(__dirname, 'src'));
