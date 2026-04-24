const fs = require('fs');

let content = fs.readFileSync('src/services/aiAssistant.ts', 'utf8');

content = content.replace(/Cortex AI Master/g, 'Assistente Financeiro');
content = content.replace(/Cortex AI/g, 'Assistente');
content = content.replace(/Cortex/g, 'AutoCaixa');

fs.writeFileSync('src/services/aiAssistant.ts', content);
