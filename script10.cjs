const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const getIconBlock = `
const CATEGORIAS_LEGADO: Record<string, any> = {
  uber: Car,
  '99': Car,
  indrive: Car,
  shopee: Package,
  particular: Smartphone,
  reembolso: ReceiptText,
  combustivel: Fuel,
  manutencao: Wrench,
  lavagem: Droplets,
  estacionamento: MapPin,
  aluguel: Key,
  seguro: ShieldCheck,
  multa: AlertTriangle,
  internet_app: Smartphone,
  alimentacao: Coffee
};

const getIconeCategoria = (t: Transacao) => {
  const cats = t.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const found = cats.find((c) => c.id === t.categoria);
  if (found && found.icone) return found.icone;
  if (CATEGORIAS_LEGADO[t.categoria]) return CATEGORIAS_LEGADO[t.categoria];
  
  const desc = t.descricao.toLowerCase();
  if (desc.includes('ifood') || desc.includes('restaurante') || desc.includes('lanche')) return Utensils;
  if (desc.includes('uber') || desc.includes('99') || desc.includes('posto')) return Car;
  if (desc.includes('mercado') || desc.includes('compra')) return ShoppingBag;
  if (desc.includes('pix')) return Activity;

  return t.tipo === 'receita' ? TrendingUp : ShoppingBag;
};

const getNomeCategoria = (t: Transacao) => {
  const cats = t.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const found = cats.find((c) => c.id === t.categoria);
  if (found) return found.nome;
  
  if (t.categoria && t.categoria !== 'outros') {
    return t.categoria.charAt(0).toUpperCase() + t.categoria.slice(1);
  }
  return "Outros";
};
`;

content = content.replace('// --- Config ---', getIconBlock + '\n// --- Config ---');
content = content.replace(/\{React\.createElement\(\s*\(t\.tipo === "receita"\s*\?\s*CATEGORIAS_RECEITA\s*:\s*CATEGORIAS_DESPESA\s*\)\.find\(\(c\) => c\.id === t\.categoria\)\s*\?\.icone \|\| MoreHorizontal,\s*\{ size: 18 \},\s*\)\}/, 
  '{React.createElement(getIconeCategoria(t), { size: 18 })}');
  
content = content.replace(/\{\(t\.tipo === "receita"\s*\?\s*CATEGORIAS_RECEITA\s*:\s*CATEGORIAS_DESPESA\s*\)\.find\(\(c\) => c\.id === t\.categoria\)\?\.nome \|\|\s*"Outros"\}/, 
  '{getNomeCategoria(t)}');

fs.writeFileSync('src/App.tsx', content);
