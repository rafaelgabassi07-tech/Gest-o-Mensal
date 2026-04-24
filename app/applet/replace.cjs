const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/AutoCaixa/gi, 'MeuCaixa');
fs.writeFileSync('src/App.tsx', content);
