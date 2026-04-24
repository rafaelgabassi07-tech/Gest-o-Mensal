const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/rounded-\[2\.5rem\]/g, 'rounded-2xl');
content = content.replace(/rounded-\[2rem\]/g, 'rounded-2xl');
content = content.replace(/rounded-\[1\.5rem\]/g, 'rounded-2xl');
content = content.replace(/rounded-3xl/g, 'rounded-2xl');
content = content.replace(/shadow-xl/g, 'shadow-md');
content = content.replace(/shadow-2xl/g, 'shadow-lg');
content = content.replace(/Cortex AI Master/g, 'AutoCaixa Assistant');
content = content.replace(/Cortex Pro/g, 'Pro');
content = content.replace(/Cortex Deep Chat/g, 'Assistente Financeiro');
content = content.replace(/Cortex Financial Engine v2\.0/g, 'Motor Financeiro Local v2.0');
content = content.replace(/Diagnóstico Cortex/g, 'Diagnóstico');

fs.writeFileSync('src/App.tsx', content);
