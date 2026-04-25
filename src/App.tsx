import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Home,
  Plus,
  List as ListIcon,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Trash2,
  Car,
  Package,
  Fuel,
  Wrench,
  Coffee,
  Smartphone,
  AlertCircle,
  MoreHorizontal,
  CheckCircle2,
  BarChart3,
  Sun,
  Moon,
  Download,
  Upload,
  Code,
  X,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Pencil,
  AlertTriangle,
  LayoutDashboard,
  ReceiptText,
  PieChart as PieChartIcon,
  ShieldCheck,
  Info,
  Key,
  MapPin,
  Droplets,
  Sparkles,
  RefreshCcw,
  BrainCircuit,
  Lightbulb,
  Zap,
  Target,
  LineChart,
  Send,
  Smile,
  Frown,
  Meh,
  Settings,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
  Activity,
  Briefcase,
  ShoppingBag,
  Gift,
  Utensils,
  Bus,
  HeartPulse,
  Gamepad2,
  GraduationCap,
  FileText,
  Droplet,
  Camera,
  Loader2,
  Lock,
  Box as BoxIcon,
  Table as TableIcon,
  PlusCircle as PlusCircleIcon,
  Cloud as CloudIcon,
  Menu,
  User,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  ReferenceLine,
  Legend,
} from "recharts";

import {
  TipoTransacao,
  Transacao,
  Categoria,
  SemanaAgrupada,
  UserProfile,
} from "./types";

// --- Utils ---
const getLocalISODate = (date?: Date | string | number): string => {
  try {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) throw new Error();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}-${String(fallback.getDate()).padStart(2, "0")}`;
  }
};

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatarMoeda = (valor: number): string => {
  return numberFormatter.format(valor || 0);
};

const formatarDataBR = (dataStr: string): string => {
  if (!dataStr || !dataStr.includes("-")) return dataStr;
  
  const hoje = getLocalISODate();
  if (dataStr === hoje) return "Hoje";
  
  const h = new Date(hoje + "T12:00:00");
  h.setDate(h.getDate() - 1);
  const ontem = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
  
  if (dataStr === ontem) return "Ontem";
  
  const [ano, mes, dia] = dataStr.split("-");
  if (h.getFullYear() === Number(ano)) {
    return `${dia}/${mes}`;
  }
  return `${dia}/${mes}/${ano}`;
};

const generateId = (): string => {
  return typeof crypto !== "undefined" && (crypto as any).randomUUID
    ? (crypto as any).randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const higienizarTransacao = (t: any): Transacao => ({
  id: String(t?.id || generateId()),
  tipo: t?.tipo === "despesa" ? "despesa" : "receita",
  categoria: String(t?.categoria || "outros"),
  valor: Math.abs(Number(t?.valor) || 0),
  data:
    typeof t?.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.data)
      ? t.data
      : getLocalISODate(),
  descricao: String(t?.descricao || "").substring(0, 100),
  custoFixo: Boolean(t?.custoFixo),
  tags: Array.isArray(t?.tags) ? t.tags.map(String) : [],
});

// --- Config ---
const CATEGORIAS_LEGADO: Record<string, any> = {
  uber: Car,
  "99": Car,
  indrive: Car,
  shopee: Package,
  particular: Smartphone,
  combustivel: Fuel,
  manutencao: Wrench,
  lavagem: Droplets,
  estacionamento: MapPin,
  aluguel: Key,
  seguro: ShieldCheck,
  multa: AlertTriangle,
  internet_app: Smartphone,
  alimentacao: Coffee,
};

// --- Logic ---

const PROFISSOES_CONFIG: Record<string, { titulo: string; icone: any; receitas: Categoria[]; despesas: Categoria[] }> = {
  "Motorista": {
    titulo: "Motorista de App",
    icone: Car,
    receitas: [
      { id: "uber", nome: "Uber", icone: Car },
      { id: "99", nome: "99App", icone: Car },
      { id: "indrive", nome: "InDrive", icone: Car },
      { id: "particular", nome: "Particular", icone: Smartphone },
      { id: "gorjeta", nome: "Gorjetas", icone: Smile },
      { id: "bonus_plataforma", nome: "Bônus Plataforma", icone: Sparkles },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ],
    despesas: [
      { id: "combustivel", nome: "Combustível", icone: Fuel },
      { id: "limpeza", nome: "Limpeza", icone: Droplets },
      { id: "manutencao", nome: "Manutenção", icone: Wrench },
      { id: "seguro", nome: "Seguro", icone: ShieldCheck },
      { id: "aluguel", nome: "Aluguel Veículo", icone: Key },
      { id: "multas", nome: "Multas/Taxas", icone: AlertTriangle },
      { id: "estacionamento", nome: "Estacionamento/Pedágio", icone: MapPin },
      { id: "alimentacao", nome: "Alimentação", icone: Coffee },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ]
  },
  "Hibrido": {
    titulo: "Entregas + Passageiro",
    icone: RefreshCcw,
    receitas: [
      { id: "uber", nome: "Uber", icone: Car },
      { id: "99", nome: "99", icone: Car },
      { id: "shopee", nome: "Shopee", icone: Package },
      { id: "loggi", nome: "Loggi", icone: Package },
      { id: "mercado_livre", nome: "Mercado Livre", icone: Package },
      { id: "particular", nome: "Particular", icone: Smartphone },
      { id: "gorjeta", nome: "Gorjetas", icone: Smile },
      { id: "bonus", nome: "Bônus", icone: Sparkles },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ],
    despesas: [
      { id: "combustivel", nome: "Combustível", icone: Fuel },
      { id: "manutencao", nome: "Manutenção", icone: Wrench },
      { id: "internet", nome: "Plano Internet", icone: Smartphone },
      { id: "aluguel", nome: "Aluguel Veículo", icone: Key },
      { id: "limpeza", nome: "Limpeza/Bag", icone: Droplets },
      { id: "estacionamento", nome: "Pedágio/Estacionamento", icone: MapPin },
      { id: "alimentacao", nome: "Alimentação", icone: Coffee },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ]
  },
  "Entregador": {
    titulo: "Entregador",
    icone: Package,
    receitas: [
      { id: "shopee", nome: "Shopee", icone: Package },
      { id: "loggi", nome: "Loggi", icone: Package },
      { id: "mercado_livre", nome: "Mercado Livre", icone: Package },
      { id: "ifood", nome: "iFood", icone: ShoppingBag },
      { id: "particular", nome: "Particular", icone: Smartphone },
      { id: "entrega_direta", nome: "Entrega Direta", icone: Package },
      { id: "gorjeta", nome: "Gorjetas", icone: Smile },
      { id: "bonus", nome: "Bônus/Promo", icone: Sparkles },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ],
    despesas: [
      { id: "combustivel", nome: "Combustível", icone: Fuel },
      { id: "manutencao", nome: "Manutenção", icone: Wrench },
      { id: "equipamento", nome: "Equipamento/Bag", icone: Package },
      { id: "smartphone", nome: "Smartphone/Plano", icone: Smartphone },
      { id: "alimentacao", nome: "Alimentação", icone: Coffee },
      { id: "estacionamento", nome: "Estacionamento", icone: MapPin },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ]
  },
  "Autonomo": {
    titulo: "Profissional Autônomo",
    icone: Briefcase,
    receitas: [
      { id: "servicos", nome: "Serviços", icone: Briefcase },
      { id: "vendas", nome: "Vendas", icone: ShoppingBag },
      { id: "freelance", nome: "Freelance", icone: Smartphone },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ],
    despesas: [
      { id: "materiais", nome: "Materiais", icone: BoxIcon },
      { id: "marketing", nome: "Marketing", icone: Target },
      { id: "ferramentas", nome: "Ferramentas", icone: Code },
      { id: "espaco", nome: "Espaço/Coworking", icone: Home },
      { id: "alimentacao", nome: "Alimentação", icone: Coffee },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ]
  },
  "CLT": {
    titulo: "Empregado CLT",
    icone: FileText,
    receitas: [
      { id: "salario", nome: "Salário Fixo", icone: Briefcase },
      { id: "adiantamento", nome: "Adiantamento", icone: Activity },
      { id: "ferias", nome: "Férias/13º", icone: Sparkles },
      { id: "vr_va", nome: "Vale Refeição", icone: Coffee },
      { id: "hora_extra", nome: "Hora Extra", icone: TrendingUp },
      { id: "plr", nome: "PLR/Bônus", icone: Target },
      { id: "extra", nome: "Renda Extra", icone: Smartphone },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ],
    despesas: [
      { id: "moradia", nome: "Moradia", icone: Home },
      { id: "contas", nome: "Contas Básicas", icone: FileText },
      { id: "mercado", nome: "Mercado/Feira", icone: ShoppingBag },
      { id: "transporte", nome: "Transporte/App", icone: Car },
      { id: "saude", nome: "Saúde/Farmácia", icone: HeartPulse },
      { id: "lazer", nome: "Lazer", icone: Smile },
      { id: "educacao", nome: "Educação", icone: Code },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ]
  },
  "Geral": {
    titulo: "Gestão Geral",
    icone: Wallet,
    receitas: [
      { id: "salario", nome: "Salário", icone: Briefcase },
      { id: "extra", nome: "Renda Extra", icone: Sparkles },
      { id: "reembolso", nome: "Reembolsos", icone: FileText },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ],
    despesas: [
      { id: "moradia", nome: "Moradia", icone: Home },
      { id: "alimentacao", nome: "Alimentação", icone: Utensils },
      { id: "contas", nome: "Contas", icone: FileText },
      { id: "saude", nome: "Saúde", icone: HeartPulse },
      { id: "transporte", nome: "Transporte", icone: Bus },
      { id: "outros", nome: "Outros", icone: MoreHorizontal },
    ]
  }
};

const CATEGORIAS_PADRAO_RECEITA: Categoria[] = PROFISSOES_CONFIG["Geral"].receitas;
const CATEGORIAS_PADRAO_DESPESA: Categoria[] = PROFISSOES_CONFIG["Geral"].despesas;

const getInitialData = (): Transacao[] => {
  try {
    const saved = localStorage.getItem("@MeuCaixa:transacoes");
    return saved ? JSON.parse(saved).map(higienizarTransacao) : [];
  } catch {
    return [];
  }
};

// --- Components Auxiliares ---
const getSolidColor = (colorStr: string) => {
  if (!colorStr || typeof colorStr !== 'string') return '#3B82F6';
  if (colorStr.includes('Blue') || colorStr.includes('pie1') || colorStr.includes('colorRec')) return '#3B82F6';
  if (colorStr.includes('Green') || colorStr.includes('pie2') || colorStr.includes('Atingido') && !colorStr.includes('NaoAtingido') || colorStr.includes('colorLucro')) return '#10B981';
  if (colorStr.includes('Yellow') || colorStr.includes('pie3') || colorStr.includes('NaoAtingido')) return '#F59E0B';
  if (colorStr.includes('Purple') || colorStr.includes('pie4')) return '#8B5CF6';
  if (colorStr.includes('Red') || colorStr.includes('colorDesp')) return '#EF4444';
  if (colorStr.startsWith('url')) return '#3B82F6';
  return colorStr;
};

const CustomTooltip = ({ active, payload, label, isDarkMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className={`p-3.5 ${isDarkMode ? "bg-gray-950/80 border-gray-800/60 text-gray-100" : "bg-white/90 border-gray-200/50 text-gray-800"} border shadow-xl backdrop-blur-md rounded-2xl`}
      >
        {label && (
          <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-2.5">
            {label}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {payload.map((entry: any, index: number) => {
            const solidColor = getSolidColor(entry.color);
            return (
              <div
                key={`tooltip-${entry.dataKey || entry.name || 'item'}-${index}`}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shadow-sm"
                    style={{ backgroundColor: solidColor }}
                  />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {entry.name || entry.dataKey}
                  </span>
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: solidColor }}
                >
                  {formatarMoeda(entry.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

// --- App Component ---
const ModalPage = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  icon: Icon,
  primaryColor = "text-primary-500",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: any;
  primaryColor?: string;
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed inset-0 z-[150] flex flex-col bg-white dark:bg-gray-950"
      >
        <div className="flex items-center justify-between p-4 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md z-10 border-b border-gray-100 dark:border-gray-900">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500 rounded-xl transition-all active:scale-90"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {Icon && <Icon size={20} className={primaryColor} />}
                {title}
              </h3>
              {subtitle && (
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar pb-12">
          <div className="max-w-xl mx-auto w-full">
            {children}
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Onboarding = ({ onComplete, vibrar }: { onComplete: (profile: UserProfile) => void, vibrar: (ms?: number | number[]) => void }) => {
  const [step, setStep] = useState(0); // Step 0 is intro
  const [nome, setNome] = useState("");
  const [profissao, setProfissao] = useState("Motorista");
  const [meta, setMeta] = useState("4000");

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto overflow-x-hidden selection:bg-primary-500/30">
      <div className="w-full max-w-md mx-auto py-8">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center space-y-8 sm:space-y-12"
            >
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary-500 blur-3xl opacity-30 rounded-full animate-pulse" />
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-2xl flex items-center justify-center mx-auto ring-4 ring-white/10 dark:ring-gray-900/50">
                  <Sparkles size={48} className="drop-shadow-md" />
                </div>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-white leading-[1.1]">
                  Bem-vindo ao <br/>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-indigo-600">AutoCaixa Pro</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-medium max-w-[280px] sm:max-w-md mx-auto leading-relaxed">
                  O controle financeiro projetado para quem faz o seu próprio salário e para quem quer multiplicar seus ganhos.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-left">
                {[
                  { icon: Target, title: "Foco a Laser", desc: "Suas metas viram realidade diaria." },
                  { icon: ShieldCheck, title: "100% Privado", desc: "Seus dados nunca saem do seu celular." },
                  { icon: TrendingUp, title: "Lucro Real", desc: "Acompanhe o que sobra de verdade no bolso." }
                ].map((feature, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + (i * 0.1) }}
                    key={i} 
                    className="flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-primary-500/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center shrink-0">
                      <feature.icon size={20} className="text-primary-500" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white">{feature.title}</h3>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed font-medium hidden sm:block">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button 
                onClick={() => { vibrar(15); setStep(1); }}
                className="w-full h-16 bg-gray-900 dark:bg-white text-white dark:text-gray-950 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-gray-900/20 dark:shadow-white/10 active:scale-[0.98] transition-all hover:bg-gray-800 dark:hover:bg-gray-100"
              >
                Configurar Meu Caixa
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20, filter: "blur(5px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-10 text-center"
            >
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">Identidade</span>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Como devo te chamar?</h2>
              </div>
              
              <div className="relative group py-6 max-w-sm mx-auto">
                <input 
                  type="text" 
                  value={nome}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nome.trim().length >= 1) {
                      vibrar(10);
                      setStep(2);
                    }
                  }}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu primeiro nome"
                  className="w-full bg-transparent text-center text-4xl sm:text-5xl font-black text-gray-900 dark:text-white outline-none placeholder:text-gray-200 dark:placeholder:text-gray-800 transition-all placeholder:font-bold"
                />
                <motion.div 
                  className="h-1.5 mx-auto bg-primary-500 rounded-full mt-4" 
                  animate={{ width: nome.length > 0 ? "100%" : "3rem", opacity: nome.length > 0 ? 1 : 0.3 }}
                />
              </div>

              <button 
                disabled={!nome.trim() || nome.trim().length < 1}
                onClick={() => { vibrar(10); setStep(2); }}
                className="w-full h-16 bg-gray-900 dark:bg-white text-white dark:text-gray-950 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl disabled:opacity-20 disabled:scale-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Avançar
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20, filter: "blur(5px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-8 text-center"
            >
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">Perfil de Ganhos</span>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Qual sua área de atuação?</h2>
                <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto">Isso nos ajudará a personalizar as categorias de receitas e despesas.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(PROFISSOES_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => { vibrar(15); setProfissao(key); }}
                    className={`group relative p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3 text-center overflow-hidden h-28 ${
                      profissao === key 
                        ? "bg-primary-500 border-primary-500 text-white shadow-xl shadow-primary-500/20 scale-100" 
                        : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:scale-[1.02]"
                    }`}
                  >
                    <div className={`p-2 rounded-2xl transition-colors ${profissao === key ? 'bg-white/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                      <cfg.icone size={24} className={profissao === key ? "text-white" : "text-gray-500 group-hover:text-primary-500"} />
                    </div>
                    <span className="text-[10px] font-black leading-tight uppercase tracking-wide">{cfg.titulo}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => { vibrar(10); setStep(3); }}
                className="w-full h-16 bg-gray-900 dark:bg-white text-white dark:text-gray-950 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Confirmar
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-10 text-center"
            >
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">O Grande Objetivo</span>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Qual sua Meta de Lucro?</h2>
                <p className="text-gray-500 text-xs font-medium max-w-xs mx-auto">Quanto você quer que sobre <b>limpo</b> no seu bolso este mês?</p>
              </div>

              <div className="relative max-w-[240px] mx-auto py-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300 dark:text-gray-700">R$</span>
                <input 
                  type="number" 
                  value={meta}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && Number(meta) > 0) {
                      onComplete({ nome, profissao, metaMensal: Number(meta), primeiroAcesso: false });
                    }
                  }}
                  onChange={(e) => setMeta(e.target.value)}
                  className="w-full pl-12 pr-4 bg-transparent text-left text-5xl font-black text-gray-900 dark:text-white outline-none"
                />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full opacity-50" />
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50 flex flex-col items-center gap-2"
              >
                <Target size={24} className="text-indigo-500 mb-1" />
                <p className="text-xs text-indigo-900/70 dark:text-indigo-300/70 font-bold uppercase tracking-widest">
                  Para bater essa meta, mire em:
                </p>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  R$ {Math.round(Number(meta) / 22).toLocaleString('pt-BR')} <span className="text-xs font-bold text-indigo-900/50 dark:text-indigo-300/50 tracking-wider">/dia</span>
                </div>
                <p className="text-[10px] text-indigo-900/50 dark:text-indigo-300/50 font-semibold italic mt-1">Considerando 22 dias trabalhados</p>
              </motion.div>

              <button 
                disabled={Number(meta) <= 0}
                onClick={() => onComplete({ nome, profissao, metaMensal: Number(meta), primeiroAcesso: false })}
                className="w-full h-16 bg-primary-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary-500/20 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Finalizar Setup e Entrar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {step > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {[1, 2, 3].map(s => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  s === step ? "w-8 bg-primary-500" : s < step ? "w-3 bg-primary-200 dark:bg-primary-900" : "w-1.5 bg-gray-200 dark:bg-gray-800"
                }`} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem("@MeuCaixa:profile");
      return saved ? JSON.parse(saved) : {
        nome: "",
        profissao: "Geral",
        metaMensal: 3000,
        primeiroAcesso: true
      };
    } catch {
      return {
        nome: "",
        profissao: "Geral",
        metaMensal: 3000,
        primeiroAcesso: true
      };
    }
  });

  const CATEGORIAS_RECEITA = useMemo(() => {
    return PROFISSOES_CONFIG[userProfile.profissao]?.receitas || CATEGORIAS_PADRAO_RECEITA;
  }, [userProfile.profissao]);

  const CATEGORIAS_DESPESA = useMemo(() => {
    return PROFISSOES_CONFIG[userProfile.profissao]?.despesas || CATEGORIAS_PADRAO_DESPESA;
  }, [userProfile.profissao]);

  useEffect(() => {
    localStorage.setItem("@MeuCaixa:profile", JSON.stringify(userProfile));
  }, [userProfile]);

  const getNomeCategoria = (t: Transacao) => {
    const cats = t.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
    const found = cats.find((c) => c.id === t.categoria);
    if (found) return found.nome;

    if (t.categoria && t.categoria !== "outros") {
      return t.categoria.charAt(0).toUpperCase() + t.categoria.slice(1);
    }
    return "Outros";
  };

  const getIconeCategoria = (t: Transacao) => {
    const cats = t.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
    const found = cats.find((c) => c.id === t.categoria);
    if (found && found.icone) return found.icone;
    if (CATEGORIAS_LEGADO[t.categoria]) return CATEGORIAS_LEGADO[t.categoria];

    const desc = t.descricao.toLowerCase();
    if (desc.includes("ifood") || desc.includes("restaurante") || desc.includes("lanche"))
      return Utensils;
    if (desc.includes("uber") || desc.includes("99") || desc.includes("posto"))
      return Car;
    if (desc.includes("mercado") || desc.includes("compra")) return ShoppingBag;
    if (desc.includes("pix")) return Activity;

    return t.tipo === "receita" ? TrendingUp : ShoppingBag;
  };

  const [direcaoRestaurada, setDirecaoRestaurada] = useState(0); // Dummy to separate logic
  const [tabAtual, setTabAtual] = useState<
    "resumo" | "adicionar" | "historico"
  >("resumo");
  const [direcao, setDirecao] = useState(0);
  const [transacoes, setTransacoes] = useState<Transacao[]>(() =>
    getInitialData(),
  );
  const [corTema, setCorTema] = useState<keyof typeof THEMES>(
    () => (localStorage.getItem("@MeuCaixa:corTema") as any) || "blue"
  );
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(() => {
    try {
      return (localStorage.getItem("@MeuCaixa:themeMode") as any) || "system";
    } catch {
      return "system";
    }
  });

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const handleThemeChange = () => {
      if (themeMode === "system") {
        setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
      } else {
        setIsDarkMode(themeMode === "dark");
      }
    };

    handleThemeChange();

    if (themeMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", handleThemeChange);
      return () => mediaQuery.removeEventListener("change", handleThemeChange);
    }
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem("@MeuCaixa:themeMode", themeMode);
  }, [themeMode]);
  const [transacaoEmEdicao, setTransacaoEmEdicao] = useState<Transacao | null>(
    null,
  );
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState<
    string | null
  >(null);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "receita" | "despesa">(
    "todos",
  );
  const [buscaDescricao, setBuscaDescricao] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    tipo: "sucesso" | "erro";
  } | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBalancoModalOpen, setIsBalancoModalOpen] = useState(false);
  const [isDespesasModalOpen, setIsDespesasModalOpen] = useState(false);
  const [isReceitasModalOpen, setIsReceitasModalOpen] = useState(false);
  const [metaDiaria, setMetaDiaria] = useState(() => {
    try {
      const saved = localStorage.getItem("@MeuCaixa:meta");
      return saved ? Number(saved) : 250;
    } catch {
      return 250;
    }
  });
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [tempMeta, setTempMeta] = useState(String(metaDiaria));

  useEffect(() => {
    localStorage.setItem("@MeuCaixa:meta", String(metaDiaria));
  }, [metaDiaria]);

  const [custosFixosBase, setCustosFixosBase] = useState<{ id: string, descricao: string, valor: number, categoria: string, diaVencimento: number }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("@MeuCaixa:custosFixos") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("@MeuCaixa:custosFixos", JSON.stringify(custosFixosBase));
  }, [custosFixosBase]);

  const [abaConfig, setAbaConfig] = useState<"Custos" | "Interface" | "Dados" | "Perfil">("Custos");
  const [isAddingCF, setIsAddingCF] = useState(false);
  const [novoCF, setNovoCF] = useState({ descricao: "", valor: "", diaVencimento: "5", categoria: "moradia" });

  // --- Funções de Feedback ---
  const vibrar = (ms: number | number[] = 10) => {
    if (
      typeof navigator !== "undefined" &&
      navigator.vibrate
    ) {
      navigator.vibrate(ms);
    }
  };

  const toastRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [tabAtual]);

  // --- Constantes de Cores e Temas ---
  const THEMES = {
    blue: {
      name: "Clássico",
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      950: "#172554",
    },
    purple: {
      name: "Ametista",
      50: "#faf5ff",
      100: "#f3e8ff",
      200: "#e9d5ff",
      300: "#d8b4fe",
      400: "#c084fc",
      500: "#a855f7",
      600: "#9333ea",
      700: "#7e22ce",
      800: "#6b21a8",
      900: "#581c87",
      950: "#3b0764",
    },
    green: {
      name: "Esmeralda",
      50: "#f0fdf4",
      100: "#dcfce7",
      200: "#bbf7d0",
      300: "#86efac",
      400: "#4ade80",
      500: "#22c55e",
      600: "#16a34a",
      700: "#15803d",
      800: "#166534",
      900: "#14532d",
      950: "#052e16",
    },
    orange: {
      name: "Cenoura",
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316",
      600: "#ea580c",
      700: "#c2410c",
      800: "#9a3412",
      900: "#7c2d12",
      950: "#431407",
    },
    rose: {
      name: "Sakura",
      50: "#fff1f2",
      100: "#ffe4e6",
      200: "#fecdd3",
      300: "#fda4af",
      400: "#fb7185",
      500: "#f43f5e",
      600: "#e11d48",
      700: "#be123c",
      800: "#9f1239",
      900: "#881337",
      950: "#4c0519",
    },
    indigo: {
      name: "Índigo",
      50: "#eef2ff",
      100: "#e0e7ff",
      200: "#c7d2fe",
      300: "#a5b4fc",
      400: "#818cf8",
      500: "#6366f1",
      600: "#4f46e5",
      700: "#4338ca",
      800: "#3730a3",
      900: "#312e81",
      950: "#1e1b4b",
    },
    teal: {
      name: "Oceano",
      50: "#f0f9ff",
      100: "#e0f2fe",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9",
      600: "#0284c7",
      700: "#0369a1",
      800: "#075985",
      900: "#0c4a6e",
      950: "#082f49",
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const themeData = THEMES[corTema];

    // Aplicar variáveis CSS primárias
    Object.entries(themeData).forEach(([key, value]) => {
      root.style.setProperty(`--primary-${key}`, value as string);
    });

    // Sincronizar localStorage
    localStorage.setItem("@MeuCaixa:corTema", corTema);
  }, [corTema]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.setProperty("color-scheme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.setProperty("color-scheme", "light");
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem("@MeuCaixa:transacoes", JSON.stringify(transacoes));
  }, [transacoes]);

  const mostrarToast = (msg: string, tipo: "sucesso" | "erro" = "sucesso") => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, tipo });
    toastRef.current = setTimeout(() => setToast(null), 2500);
  };

  const salvarTransacao = (nova: Omit<Transacao, "id">) => {
    if (transacaoEmEdicao) {
      setTransacoes((prev) =>
        prev.map((t) =>
          t.id === transacaoEmEdicao.id
            ? ({ ...nova, id: t.id } as Transacao)
            : t,
        ),
      );
      mostrarToast("Lançamento atualizado com sucesso!");
      setTransacaoEmEdicao(null);
      setTabAtual("resumo");
    } else {
      setTransacoes((prev) => [higienizarTransacao(nova), ...prev]);
      mostrarToast("Lançamento salvo com sucesso!");
      // Não muda de aba para permitir múltiplos lançamentos
      // O formulário irá lidar com o feedback visual de sucesso
    }
  };

  const gerarRelatorioPDF = () => {
    try {
      const doc = new jsPDF();
      const hoje = new Date();
      const dataStr = hoje.toLocaleDateString('pt-BR');
      
      doc.setFontSize(22);
      doc.setTextColor(59, 130, 246); // Blue-500
      doc.text("AutoCaixa", 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Relatório Financeiro Gerencial - ${dataStr}`, 14, 30);
      
      const receitasTotal = transacoes.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
      const despesasTotal = transacoes.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
      const saldo = receitasTotal - despesasTotal;

      doc.setFontSize(14);
      doc.setTextColor(20);
      doc.text("Resumo do Período", 14, 45);
      
      doc.setFontSize(10);
      doc.text(`Total Entradas: R$ ${receitasTotal.toFixed(2)}`, 14, 55);
      doc.text(`Total Saídas: R$ ${despesasTotal.toFixed(2)}`, 14, 62);
      doc.text(`Lucro Líquido: R$ ${saldo.toFixed(2)}`, 14, 69);

      // Table of expenses
      const expenses = transacoes.filter(t => t.tipo === "despesa");
      const catsMap = expenses.reduce((acc, current) => {
        const catName = CATEGORIAS_DESPESA.find(c => c.id === current.categoria)?.nome || current.categoria;
        acc[catName] = (acc[catName] || 0) + current.valor;
        return acc;
      }, {} as Record<string, number>);
      
      const tableData = Object.entries(catsMap)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, val]) => [cat, `R$ ${val.toFixed(2)}`]);

      if (tableData.length > 0) {
        doc.setFontSize(14);
        doc.text("Resumo de Gastos", 14, 85);
        autoTable(doc, {
          startY: 90,
          head: [['Categoria', 'Valor Total']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }
        });
      }

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 85;
      
      // Auto-IA Veredito (Simple based on margin)
      doc.setFontSize(14);
      doc.setTextColor(20);
      doc.text("Veredito IA", 14, finalY + 15);
      
      let margem = 0;
      if (receitasTotal > 0) {
        margem = (saldo / receitasTotal) * 100;
      }
      
      let veredito = "";
      if (margem > 40) {
        veredito = "Excelente gestão! Sua margem de lucro está alta e os seus custos fixos estão muito bem controlados. Continue com a estratégia atual.";
      } else if (margem > 15) {
        veredito = "Gestão equilibrada. Você está com lucro, mas vale a pena investigar detalhadamente os gastos e cortar pequenas despesas supérfluas.";
      } else {
        veredito = "Alerta: Seus gastos estão muito próximos (ou superando) a sua receita. Corte imediatamente assinaturas ou custos de manutenção desnecessários e tente focar em horários/corridas de maior rentabilidade.";
      }

      doc.setFontSize(10);
      doc.setTextColor(80);
      const maxLineWidth = 180;
      const textLines = doc.splitTextToSize(veredito, maxLineWidth);
      doc.text(textLines, 14, finalY + 25);

      doc.save(`Relatorio_AutoCaixa_${getLocalISODate()}.pdf`);
      mostrarToast("Relatório PDF Gerado!", "sucesso");
    } catch (e) {
      console.error(e);
      mostrarToast("Erro ao gerar PDF", "erro");
    }
  };

  const importarDados = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (file.name.endsWith(".json")) {
        try {
          const data = JSON.parse(content);
          setTransacoes(Array.isArray(data) ? data.map(higienizarTransacao) : []);
          mostrarToast("Backup JSON restaurado!");
        } catch { mostrarToast("Erro ao ler JSON", "erro"); }
      } else if (file.name.endsWith(".csv")) {
        try {
          const lines = content.split("\n");
          const newTransacoes: Transacao[] = [];
          
          // Pula o cabeçalho
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // Tenta detectar o separador (vírgula ou ponto e vírgula)
            const separator = lines[i].includes(";") ? ";" : ",";
            const cols = lines[i].split(separator);
            
            if (cols.length >= 4) {
              const dataStr = cols[0].trim();
              const [dia, mes, ano] = dataStr.split("/");
              const dataISO = `${ano}-${mes}-${dia}`;
              
              const tipo = cols[1].toLowerCase().includes("entrada") || cols[1].toLowerCase().includes("receita") ? "receita" : "despesa";
              
              // Busca o ID da categoria pelo nome
              const catNome = cols[2].trim().toLowerCase();
              const catArray = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
              const catObj = catArray.find(c => c.nome.toLowerCase() === catNome);
              const categoriaId = catObj ? catObj.id : (tipo === "receita" ? "outros_receita" : "outros_despesa");
              
              const valor = parseFloat(cols[3].replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
              const descricao = cols[4] ? cols[4].replace(/"/g, "").trim() : "";
              
              if (!isNaN(valor)) {
                newTransacoes.push({
                  id: Math.random().toString(36).substring(2, 9),
                  data: dataISO,
                  tipo,
                  categoria: categoriaId,
                  valor,
                  descricao,
                  versao: "4.0"
                });
              }
            }
          }
          
          if (newTransacoes.length > 0) {
            setTransacoes(prev => [...newTransacoes, ...prev]);
            mostrarToast(`${newTransacoes.length} registros importados!`);
          } else {
            mostrarToast("Nenhum dado válido no CSV", "erro");
          }
        } catch { mostrarToast("Erro ao processar CSV", "erro"); }
      }
    };
    reader.readAsText(file);
  };

  const exportarCSV = () => {
    try {
      const cabecalho = ["Data", "Tipo", "Categoria", "Valor", "Descricao"].join(";");
      const linhas = transacoes.map((t) => {
        const catArray = t.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
        const categoriaNome = catArray.find((c) => c.id === t.categoria)?.nome || t.categoria;
        
        // Trata a descrição escapando aspas se necessário (formato CSV)
        let descricaoLimpa = t.descricao.replace(/;/g, ",").replace(/\n/g, " ");
        if (descricaoLimpa.includes(",")) {
            descricaoLimpa = `"${descricaoLimpa}"`;
        }

        // Formata o valor sem o R$ para planilha
        const valorFormatado = t.valor.toFixed(2).replace(".", ",");
        
        return [
          formatarDataBR(t.data),
          t.tipo === "receita" ? "Entrada" : "Saida",
          categoriaNome,
          valorFormatado,
          descricaoLimpa,
        ].join(";");
      });

      const conteudo = [cabecalho, ...linhas].join("\n");
      const blob = new Blob(["\ufeff" + conteudo], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `AutoCaixa_extrato_${getLocalISODate()}.csv`;
      link.click();
      mostrarToast("Extrato exportado!");
    } catch {
      mostrarToast("Erro ao exportar", "erro");
    }
  };

  const confirmarExclusao = (id: string) => {
    setTransacoes((prev) => prev.filter((x) => x.id !== id));
    setTransacaoParaExcluir(null);
    mostrarToast("Registo excluído", "erro");
  };

  const {
    saldoTotal,
    resumoMes,
    resumoMesPassado,
    dadosGrafico,
    ganhoHoje,
    topCategorias,
    receitaPorFonte,
    mediaDiaria,
    projecaoMensal,
    metaFulfillment,
    lucroMes,
    transacoesMes,
    todasCategoriasGastos,
    totalCustosFixos,
    ticketMedio,
    indiceEficiencia,
    diasLucrativos,
    gastoEssencial,
    gastoLivre,
  } = useMemo(() => {
    const hojeStr = getLocalISODate();
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const diaAtualDoMes = hoje.getDate();

    let total = 0;
    let rMes = { receitas: 0, despesas: 0 };
    let rMesPassado = { receitas: 0, despesas: 0 };
    let gHoje = 0;
    let catGastos: Record<string, number> = {};
    let fonteReceitas: Record<string, number> = {};
    const dias = [];

    // Garantir que trabalhamos com a data local sem interferência de fuso no início do dia
    const getSafeDate = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(12, 0, 0, 0);
      return copy;
    };

    const mesPassado = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoMesPassado = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    for (let i = 6; i >= 0; i--) {
      const d = getSafeDate(new Date());
      d.setDate(d.getDate() - i);
      const dStr = getLocalISODate(d);
      dias.push({
        dataStr: dStr,
        diaSemana: d
          .toLocaleDateString("pt-BR", { weekday: "short" })
          .replace(".", ""),
        receitas: 0,
        despesas: 0,
        lucro: 0,
      });
    }

    // Ordenar transações por data desc antes de processar
    const transacoesOrdenadas = [...transacoes].sort((a, b) =>
      b.data.localeCompare(a.data),
    );

    transacoesOrdenadas.forEach((t) => {
      const valor = Number(t.valor) || 0;
      total += t.tipo === "receita" ? valor : -valor;

      const dt = new Date(t.data + "T12:00:00");
      const m = dt.getMonth();
      const y = dt.getFullYear();

      if (y === anoAtual && m === mesAtual) {
        if (t.tipo === "receita") {
          rMes.receitas += valor;
          fonteReceitas[t.categoria] =
            (fonteReceitas[t.categoria] || 0) + valor;
        } else {
          rMes.despesas += valor;
          catGastos[t.categoria] = (catGastos[t.categoria] || 0) + valor;
        }
      } else if (y === anoMesPassado && m === mesPassado) {
        if (t.tipo === "receita") rMesPassado.receitas += valor;
        else rMesPassado.despesas += valor;
      }

      if (t.data === hojeStr && t.tipo === "receita") {
        gHoje += valor;
      }

      const diaGrafico = dias.find((d) => d.dataStr === t.data);
      if (diaGrafico) {
        if (t.tipo === "receita") {
          diaGrafico.receitas += valor;
          diaGrafico.lucro += valor;
        } else {
          diaGrafico.despesas += valor;
          diaGrafico.lucro -= valor;
        }
      }
    });

    const todasCategoriasGastos = Object.entries(catGastos)
      .map(([id, valor]) => ({
        id,
        valor,
        nome: CATEGORIAS_DESPESA.find((c) => c.id === id)?.nome || "Outros",
        pct: (valor / (rMes.despesas || 1)) * 100,
      }))
      .sort((a, b) => b.valor - a.valor);

    const topCat = todasCategoriasGastos.slice(0, 5);

    const rFonte = Object.entries(fonteReceitas)
      .map(([id, valor]) => ({
        id,
        valor,
        nome: CATEGORIAS_RECEITA.find((c) => c.id === id)?.nome || "Outros",
        pct: (valor / (rMes.receitas || 1)) * 100,
      }))
      .sort((a, b) => b.valor - a.valor);

    const somaReceitas7Dias = dias.reduce((acc, d) => acc + d.receitas, 0);
    const media = somaReceitas7Dias / 7;
    const projecao = (rMes.receitas / (diaAtualDoMes || 1)) * diasNoMes;

    const metaFulfillment = dias.map((d) => ({
      dia: d.diaSemana,
      valor: d.receitas,
      atingiu: d.receitas >= metaDiaria,
    }));

    const tMes = transacoesOrdenadas.filter((t) => {
      const dt = new Date(t.data + "T12:00:00");
      return dt.getMonth() === mesAtual && dt.getFullYear() === anoAtual;
    });

    const maxV = Math.max(...dias.map((d) => d.receitas + d.despesas), 100);
    const totalCustosFixos = tMes.filter(t => t.tipo === "despesa" && t.custoFixo).reduce((a, b) => a + b.valor, 0);
    
    // Novas métricas adicionais
    const numReceitas = tMes.filter(t => t.tipo === "receita").length;
    const ticketMedio = rMes.receitas / (numReceitas || 1);
    const indiceEficiencia = (rMes.receitas / (rMes.despesas || 1));
    const diasLucrativos = dias.filter(d => d.lucro > 0).length;

    // Cálculo Regra de Ouro (Mês Atual)
    const categoriasEssenciais = [
      "moradia", "alimentacao", "transporte", "saude", "contas", 
      "manutencao", "combustivel", "aluguel", "seguro", "internet", 
      "equipamento", "materiais", "smartphone", "estacionamento", "ferramentas", "espaco"
    ];

    const gastoEssencial = tMes
      .filter(t => t.tipo === "despesa" && categoriasEssenciais.includes(t.categoria))
      .reduce((acc, t) => acc + t.valor, 0);
    
    const gastoLivre = tMes
      .filter(t => t.tipo === "despesa" && !categoriasEssenciais.includes(t.categoria))
      .reduce((acc, t) => acc + t.valor, 0);

    return {
      saldoTotal: total,
      resumoMes: rMes,
      resumoMesPassado: rMesPassado,
      ganhoHoje: gHoje,
      topCategorias: topCat,
      todasCategoriasGastos,
      receitaPorFonte: rFonte,
      mediaDiaria: media,
      projecaoMensal: projecao,
      metaFulfillment,
      lucroMes: rMes.receitas - rMes.despesas,
      transacoesMes: tMes,
      totalCustosFixos,
      ticketMedio,
      indiceEficiencia,
      diasLucrativos,
      gastoEssencial,
      gastoLivre,
      dadosGrafico: { dias, maxValor: Math.ceil(maxV / 50) * 50 },
    };
  }, [transacoes, metaDiaria]);

  const historicoAgrupado = useMemo(() => {
    const grupos: Record<string, SemanaAgrupada> = {};

    const buscaStr = buscaDescricao.toLowerCase();

    // Filtrar transações
    let transacoesProcessar = transacoes.filter((t) => {
      const matchTipo = filtroTipo === "todos" || t.tipo === filtroTipo;
      const matchDesc =
        t.descricao.toLowerCase().includes(buscaStr) ||
        ((t.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA)
          .find((c) => c.id === t.categoria)
          ?.nome?.toLowerCase()
          ?.includes(buscaStr) ?? false);
      return matchTipo && matchDesc;
    });

    // Ordenar transações por data
    transacoesProcessar = transacoesProcessar.sort((a, b) =>
      b.data.localeCompare(a.data),
    );

    transacoesProcessar.forEach((t) => {
      const d = new Date(t.data + "T12:00:00");
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay()); // Domingo da semana
      const chave = getLocalISODate(start);

      if (!grupos[chave]) {
        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Sábado da semana
        grupos[chave] = {
          id: chave,
          label: `${start.getDate()} a ${end.getDate()} de ${start.toLocaleString("pt-BR", { month: "long" })}`,
          transacoes: [],
          receitas: 0,
          despesas: 0,
          lucro: 0,
        };
      }

      grupos[chave].transacoes.push(t);
      if (t.tipo === "receita") grupos[chave].receitas += t.valor;
      else grupos[chave].despesas += t.valor;
      grupos[chave].lucro = grupos[chave].receitas - grupos[chave].despesas;
    });

    const totais = transacoesProcessar.reduce(
      (acc, t) => {
        if (t.tipo === "receita") acc.receitas += t.valor;
        else acc.despesas += t.valor;
        return acc;
      },
      { receitas: 0, despesas: 0 },
    );

    return {
      grupos: Object.values(grupos).sort((a, b) => b.id.localeCompare(a.id)),
      resumoFiltrado: { ...totais, lucro: totais.receitas - totais.despesas },
    };
  }, [transacoes, filtroTipo, buscaDescricao]);

  const THEME_COLORS = {
    blue: `
      --primary-50: #eff6ff; --primary-100: #dbeafe; --primary-200: #bfdbfe; --primary-300: #93c5fd;
      --primary-400: #60a5fa; --primary-500: #3b82f6; --primary-600: #2563eb; --primary-700: #1d4ed8;
      --primary-800: #1e40af; --primary-900: #1e3a8a; --primary-950: #172554;
    `,
    purple: `
      --primary-50: #faf5ff; --primary-100: #f3e8ff; --primary-200: #e9d5ff; --primary-300: #d8b4fe;
      --primary-400: #c084fc; --primary-500: #a855f7; --primary-600: #9333ea; --primary-700: #7e22ce;
      --primary-800: #6b21a8; --primary-900: #581c87; --primary-950: #3b0764;
    `,
    green: `
      --primary-50: #f0fdf4; --primary-100: #dcfce7; --primary-200: #bbf7d0; --primary-300: #86efac;
      --primary-400: #4ade80; --primary-500: #22c55e; --primary-600: #16a34a; --primary-700: #15803d;
      --primary-800: #166534; --primary-900: #14532d; --primary-950: #052e16;
    `,
    orange: `
      --primary-50: #fff7ed; --primary-100: #ffedd5; --primary-200: #fed7aa; --primary-300: #fdba74;
      --primary-400: #fb923c; --primary-500: #f97316; --primary-600: #ea580c; --primary-700: #c2410c;
      --primary-800: #9a3412; --primary-900: #7c2d12; --primary-950: #431407;
    `
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <style>{`
        :root {
          ${THEME_COLORS[corTema]}
        }
      `}</style>

      {userProfile.primeiroAcesso ? (
        <Onboarding 
          onComplete={(profile) => {
            setUserProfile(profile);
            setMetaDiaria(Math.round(profile.metaMensal / 22));
            vibrar(30);
          }} 
          vibrar={vibrar}
        />
      ) : (
        <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-300">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
            >
              <div
                className={`flex items-center space-x-2 px-5 py-3 rounded-full shadow-lg ${toast.tipo === "sucesso" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
              >
                <span className="text-xs font-medium">{toast.msg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {transacaoParaExcluir && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
              onClick={() => setTransacaoParaExcluir(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-900 w-full max-w-xs rounded-xl p-3 shadow-lg border dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    Confirmar Exclusão
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                    Deseja apagar este registo?
                  </p>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setTransacaoParaExcluir(null)}
                      className="py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm"
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => confirmarExclusao(transacaoParaExcluir)}
                      className="py-3 bg-red-600 text-white rounded-xl font-medium text-sm"
                    >
                      Excluir
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md px-4 py-3 z-40 border-b border-gray-100 dark:border-gray-900 shadow-sm transition-all duration-300">
          <div className="flex justify-between items-center w-full">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-3 min-w-0 cursor-pointer"
              onClick={() => {
                vibrar(10);
                setTabAtual("resumo");
              }}
            >
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm shadow-primary-500/30 flex items-center justify-center text-white shrink-0 overflow-hidden">
                <div className="absolute inset-0 bg-white/20 transform -translate-x-full hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                <Wallet size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex items-baseline gap-0.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tighter leading-none text-gray-900 dark:text-white display-font shrink-0">
                  Auto<span className="bg-clip-text text-transparent bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-400 dark:to-primary-600">Caixa</span>
                </h1>
              </div>
            </motion.div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => {
                  vibrar(10);
                  const modes: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
                  const next = modes[(modes.indexOf(themeMode) + 1) % modes.length];
                  setThemeMode(next);
                  mostrarToast(`Tema: ${next === 'system' ? 'Automático' : next === 'dark' ? 'Escuro' : 'Claro'}`);
                }}
                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 bg-gray-50 hover:bg-primary-50 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-xl transition-all border border-gray-100 dark:border-gray-800"
              >
                <motion.div
                  key={themeMode}
                  initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {themeMode === "system" ? <Activity size={18} /> : isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-500" />}
                </motion.div>
              </button>
              <button
                onClick={() => {
                  vibrar(10);
                  setIsMenuOpen(true);
                }}
                className="w-10 h-10 flex items-center justify-center text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 bg-gray-100 hover:bg-primary-50 dark:bg-gray-800 dark:hover:bg-primary-900/30 rounded-xl transition-all border border-gray-200 dark:border-gray-700"
              >
                <Menu size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 relative overflow-hidden bg-gray-50 dark:bg-gray-950">
          <motion.div 
            className="h-full flex" 
            animate={{ x: `-${["resumo", "adicionar", "historico"].indexOf(tabAtual) * 33.333333}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.5 }}
            style={{ width: '300%' }}
          >
              <div className="w-1/3 h-full overflow-y-auto pb-40 overflow-x-hidden scroll-smooth p-4 space-y-4">
                  {/* Card Principal: Balanço de Lucro Real */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    whileHover={{ scale: 0.99, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      vibrar(10);
                      setIsBalancoModalOpen(true);
                    }}
                    className="bg-gradient-to-br from-primary-600 via-indigo-600 to-indigo-800 dark:from-primary-700 dark:via-indigo-800 dark:to-indigo-950 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl shadow-primary-500/30 border border-white/10 text-white transition-all hover:shadow-primary-500/40 relative overflow-hidden group cursor-pointer min-h-[240px] sm:min-h-[300px] flex items-center"
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')] opacity-[0.05] mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 whitespace-nowrap">
                      <TrendingUp
                        size={150}
                        strokeWidth={0.5}
                        className="transform translate-x-10 -translate-y-10 text-white"
                      />
                    </div>
                    <div className="relative z-10 w-full">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="text-white/60 text-[11px] font-black uppercase tracking-[0.3em] block mb-2">
                            Balanço Geral
                          </span>
                          <span className={`text-4xl sm:text-7xl font-black tracking-tighter display-font leading-none ${lucroMes < 0 ? "text-red-300" : "text-white"}`}>
                            {formatarMoeda(lucroMes)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${lucroMes >= 0 ? "bg-white/20 text-white backdrop-blur-md" : "bg-red-500/40 text-white backdrop-blur-md"}`}
                          >
                            {lucroMes >= 0 ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
                            {lucroMes >= 0 ? "Superávit" : "Déficit"}
                          </div>
                          <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider pr-1">
                            {new Date().toLocaleString("pt-BR", { month: "long" })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-300 opacity-90">
                            <ArrowUpRight size={14} strokeWidth={3} /> Faturamento
                          </div>
                          <div className="text-lg sm:text-xl font-bold tracking-tight display-font text-white">
                            {formatarMoeda(resumoMes.receitas)}
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-right sm:text-left">
                          <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-red-300 opacity-90">
                            <ArrowDownRight size={14} strokeWidth={3} /> Despesas
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="text-xl font-bold tracking-tight display-font text-white leading-none">
                              {formatarMoeda(resumoMes.despesas)}
                            </div>
                            {totalCustosFixos > 0 && <span className="text-[9px] text-white/40 mt-1 uppercase tracking-tighter font-bold">Fixos: {formatarMoeda(totalCustosFixos)}</span>}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
                            <TrendingUp size={12} strokeWidth={2.5} /> Previsto
                          </div>
                          <div className="text-lg sm:text-xl font-bold tracking-tight display-font text-white opacity-90">
                            {formatarMoeda(projecaoMensal)}
                          </div>
                        </div>

                        <div className="space-y-1 text-right sm:text-left">
                          <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
                            Ritmo Diário 
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTempMeta(String(metaDiaria));
                                setIsEditingMeta(true);
                              }}
                              className="ml-1 text-white/30 hover:text-white transition-colors"
                            >
                              <Pencil size={11} />
                            </button>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xl font-bold tracking-tight display-font text-white opacity-90">
                              {formatarMoeda(mediaDiaria).replace("R$", "")}
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-white/10 text-white backdrop-blur-md border border-white/5">
                              {Math.min(Math.round((ganhoHoje / metaDiaria) * 100), 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.12 }}
                    className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-neutral-200/60 dark:border-white/10 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center shadow-sm">
                            <PieChartIcon size={20} />
                         </div>
                         <div className="group relative">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight leading-none cursor-help border-b border-dashed border-gray-400 dark:border-gray-600 inline-block">Regra de Ouro</h3>
                            <div className="absolute hidden group-hover:block top-full left-0 mt-2 p-3 bg-gray-900 dark:bg-gray-800 text-white text-[10px] rounded-xl shadow-xl z-30 w-[240px] font-medium leading-relaxed pointer-events-none">
                              <strong>A Regra 50/30/20</strong> é uma diretriz clássica:<br/><br/>
                              • <strong>50%</strong> (Necessidades): Custos fixos e operacionais.<br/>
                              • <strong>30%</strong> (Livre): Desejos e estilo de vida.<br/>
                              • <strong>20%</strong> (Reserva): Poupança e quitação de dívidas.<br/><br/>
                              Mantenha o equilíbrio para ter saúde financeira!
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap mt-1">Distribuição 50 | 30 | 20</p>
                         </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-full text-[9px] font-bold text-gray-500 flex items-center gap-1">
                        <Info size={10} /> Sugestão
                      </div>
                    </div>
                    
                    <div className="space-y-5">
                       {/* Essencial */}
                       <div className="group relative">
                          <div className="flex justify-between items-end mb-1.5 cursor-help">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border-b border-dashed border-indigo-200 dark:border-indigo-800 inline-block w-max">Essencial</span>
                                <span className="text-[9px] text-gray-400 font-medium italic">Necessidades básicas</span>
                             </div>
                             <div className="text-right shrink-0">
                                <div className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-white uppercase leading-none mb-0.5">
                                  {formatarMoeda(gastoEssencial)} / <span className="text-gray-400">{formatarMoeda(resumoMes.receitas * 0.5)}</span>
                                </div>
                                <div className={`text-[10px] font-black ${(gastoEssencial > resumoMes.receitas * 0.5) ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {resumoMes.receitas > 0 ? ((gastoEssencial / resumoMes.receitas) * 100).toFixed(0) : 0}% atual
                                </div>
                             </div>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner flex p-0.5">
                             <div 
                               className={`h-full rounded-full transition-all duration-1000 ${gastoEssencial > resumoMes.receitas * 0.5 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                               style={{ width: `${resumoMes.receitas > 0 ? Math.min((gastoEssencial / resumoMes.receitas) * 100, 100) : 0}%` }}
                             ></div>
                          </div>
                          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-900 dark:bg-gray-800 text-white text-[10px] rounded-lg shadow-xl z-20 w-48 font-medium leading-relaxed pointer-events-none text-center">
                            Gastos indispensáveis (moradia, alimentação, contas) e custos operacionais do seu negócio.
                          </div>
                       </div>
                       
                       {/* Livre */}
                       <div className="group relative">
                          <div className="flex justify-between items-end mb-1.5 cursor-help">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider border-b border-dashed border-purple-200 dark:border-purple-800 inline-block w-max">Livre</span>
                                <span className="text-[9px] text-gray-400 font-medium italic">Estilo de vida & desejos</span>
                             </div>
                             <div className="text-right shrink-0">
                                <div className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-white uppercase leading-none mb-0.5">
                                  {formatarMoeda(gastoLivre)} / <span className="text-gray-400">{formatarMoeda(resumoMes.receitas * 0.3)}</span>
                                </div>
                                <div className={`text-[10px] font-black ${(gastoLivre > resumoMes.receitas * 0.3) ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {resumoMes.receitas > 0 ? ((gastoLivre / resumoMes.receitas) * 100).toFixed(0) : 0}% atual
                                </div>
                             </div>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner flex p-0.5">
                             <div 
                               className={`h-full rounded-full transition-all duration-1000 ${gastoLivre > resumoMes.receitas * 0.3 ? 'bg-red-500' : 'bg-purple-500'}`} 
                               style={{ width: `${resumoMes.receitas > 0 ? Math.min((gastoLivre / resumoMes.receitas) * 100, 100) : 0}%` }}
                             ></div>
                          </div>
                          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-900 dark:bg-gray-800 text-white text-[10px] rounded-lg shadow-xl z-20 w-48 font-medium leading-relaxed pointer-events-none text-center">
                            Gastos supérfluos, lazer, compras, academia, assinaturas. Lembre-se, controle é tudo!
                          </div>
                       </div>

                       {/* Reserva */}
                       <div className="group relative">
                          <div className="flex justify-between items-end mb-1.5 cursor-help">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-b border-dashed border-emerald-200 dark:border-emerald-800 inline-block w-max">Reserva</span>
                                <span className="text-[9px] text-gray-400 font-medium italic">Futuro & segurança</span>
                             </div>
                             <div className="text-right shrink-0">
                                <div className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-white uppercase leading-none mb-0.5">
                                  {formatarMoeda(Math.max(0, resumoMes.receitas - resumoMes.despesas))} / <span className="text-gray-400">{formatarMoeda(resumoMes.receitas * 0.2)}</span>
                                </div>
                                <div className={`text-[10px] font-black ${(resumoMes.receitas - resumoMes.despesas >= resumoMes.receitas * 0.2) ? 'text-emerald-500' : 'text-amber-500'}`}>
                                   Meta: {formatarMoeda(resumoMes.receitas * 0.2)}
                                </div>
                             </div>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner flex p-0.5">
                             <div 
                               className="h-full rounded-full transition-all duration-1000 bg-emerald-500" 
                               style={{ width: `${resumoMes.receitas > 0 ? Math.min((Math.max(0, resumoMes.receitas - resumoMes.despesas) / resumoMes.receitas) * 100, 100) : 0}%` }}
                             ></div>
                          </div>
                          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-900 dark:bg-gray-800 text-white text-[10px] rounded-lg shadow-xl z-20 w-48 font-medium leading-relaxed pointer-events-none text-center">
                            Seu lucro real! Use para montar uma reserva de emergência ou quitar dívidas.
                          </div>
                       </div>
                    </div>
                  </motion.div>

                  {/* Top Gastos - Inteligência de Categoria */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
                    onClick={() => {
                      vibrar(10);
                      setIsDespesasModalOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                          <PieChartIcon size={16} className="text-primary-500" />
                        </div>
                        <h3 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest leading-none">
                          Gastos por Categoria
                        </h3>
                      </div>
                      <div className="px-2 py-1 bg-gray-50 dark:bg-white/5 rounded-md">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Este Mês</span>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {topCategorias.length === 0 ? (
                        <div className="py-10 text-center bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                          <p className="text-[10px] font-bold text-gray-400/60 uppercase tracking-widest whitespace-nowrap">
                            Sem registros encontrados
                          </p>
                        </div>
                      ) : (
                    <div className="space-y-4" onPointerDown={(e) => e.stopPropagation()}>
                          {topCategorias.map((cat, index) => (
                            <div key={`resumo-cat-${cat.id}-${index}`} className="group">
                              <div className="flex justify-between items-end mb-1.5">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full ring-4 ring-offset-0 ${
                                      [
                                        "bg-blue-500 ring-blue-500/10",
                                        "bg-rose-500 ring-rose-500/10",
                                        "bg-emerald-500 ring-emerald-500/10",
                                        "bg-amber-500 ring-amber-500/10",
                                        "bg-violet-500 ring-violet-500/10"
                                      ][index % 5]
                                    }`}
                                  />
                                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 group-hover:text-primary-500 transition-colors">
                                    {cat.nome}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] font-black text-gray-900 dark:text-white display-font mb-0.5">
                                    {formatarMoeda(cat.valor)}
                                  </div>
                                  <div className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                                    {cat.pct.toFixed(0)}% do total
                                  </div>
                                </div>
                              </div>
                              <div className="relative w-full h-1.5 bg-gray-100 dark:bg-white/[0.03] rounded-full overflow-hidden shadow-inner flex p-0.5">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${cat.pct}%` }}
                                  transition={{ duration: 1.2, ease: "circOut" }}
                                  className={`h-full rounded-full ${
                                    [
                                      "bg-gradient-to-r from-blue-600 to-blue-400",
                                      "bg-gradient-to-r from-rose-600 to-rose-400",
                                      "bg-gradient-to-r from-emerald-600 to-emerald-400",
                                      "bg-gradient-to-r from-amber-600 to-amber-400",
                                      "bg-gradient-to-r from-violet-600 to-violet-400"
                                    ][index % 5]
                                  }`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {isEditingMeta && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => setIsEditingMeta(false)}
                      >
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-[320px] shadow-2xl border border-gray-100 dark:border-gray-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 text-primary-500 rounded-2xl flex items-center justify-center mb-4">
                              <Target size={24} />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                              Meta Diária
                            </h3>
                            <p className="text-[10px] font-medium text-gray-400 tracking-widest uppercase mb-6">
                              Ajuste seu objetivo
                            </p>
                            
                            <div className="relative w-full mb-6">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">R$</span>
                              <input
                                type="number"
                                value={tempMeta}
                                onChange={(e) => setTempMeta(e.target.value)}
                                className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl font-bold text-xl outline-none focus:ring-2 ring-primary-500/20 transition-all border border-gray-100 dark:border-gray-700/50"
                                autoFocus
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full">
                              <button
                                onClick={() => setIsEditingMeta(false)}
                                className="py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold text-[10px] tracking-widest uppercase active:scale-95 transition-transform"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => {
                                  setMetaDiaria(Number(tempMeta));
                                  setIsEditingMeta(false);
                                  mostrarToast("Meta atualizada");
                                  vibrar([10, 20]);
                                }}
                                className="py-3.5 bg-primary-600 text-white rounded-xl font-bold text-[10px] tracking-widest uppercase shadow-lg shadow-primary-600/20 active:scale-95 transition-transform"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Balanço Mês Atual e Anterior */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-neutral-200/60 dark:border-white/10 shadow-sm"
                  >
                    <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800 pr-2">
                      <div className="pr-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                          Mês Atual
                        </span>
                        <div className="text-lg sm:text-xl font-semibold text-primary-600 dark:text-primary-400 display-font leading-none mb-1">
                          {formatarMoeda(resumoMes.receitas - resumoMes.despesas)}
                        </div>
                        <div className="text-[10px] font-medium text-gray-400 tracking-wide">
                          Bruto: {formatarMoeda(resumoMes.receitas)}
                        </div>
                      </div>
                      <div className="pl-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                          Mês Anterior
                        </span>
                        <div className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 display-font leading-none mb-1">
                          {formatarMoeda(resumoMesPassado.receitas - resumoMesPassado.despesas)}
                        </div>
                        <div className="text-[10px] font-medium text-gray-400 tracking-wide">
                          Bruto: {formatarMoeda(resumoMesPassado.receitas)}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Fluxo de Caixa (7 Dias) e Receita por Fonte */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] leading-none mb-1">
                            Dinâmica Semanal
                          </h3>
                          <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight leading-none">
                            Fluxo (7 Dias)
                          </h4>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 py-1.5 px-3 rounded-full">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 bg-primary-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ">
                                Ganhos
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ">
                                Gastos
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-full border border-emerald-100 dark:border-emerald-900/20">
                             <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                             <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Em Alta</span>
                          </div>
                        </div>
                      </div>
                      <div 
                        className="h-[300px] w-full outline-none focus:outline-none mt-2"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          className="outline-none"
                        >
                          <BarChart
                            data={dadosGrafico.dias}
                            margin={{
                              top: 10,
                              right: 0,
                              left: 0,
                              bottom: 0,
                            }}
                          >
                            <YAxis hide domain={[0, 'auto']} />
                            <CartesianGrid
                              strokeDasharray="4 4"
                              vertical={false}
                              strokeOpacity={isDarkMode ? 0.05 : 0.08}
                              stroke={isDarkMode ? "#ffffff" : "#000000"}
                            />
                            <XAxis
                              dataKey="diaSemana"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fontSize: 9,
                                fontWeight: 900,
                                fill: "#9CA3AF",
                              }}
                              dy={15}
                              interval={0}
                              tickFormatter={(val) =>
                                val.charAt(0).toUpperCase() + val.slice(1)
                              }
                            />
                            <ReTooltip
                              content={<CustomTooltip isDarkMode={isDarkMode} />}
                              cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                            />
                            <Bar 
                              dataKey="despesas" 
                              name="Gastos" 
                              fill="#F43F5E" 
                              stackId="a"
                              radius={[0, 0, 4, 4]} 
                              barSize={16} 
                            />
                            <Bar 
                              dataKey="receitas" 
                              name="Ganhos" 
                              fill="#3B82F6" 
                              stackId="a"
                              radius={[4, 4, 0, 0]} 
                              barSize={16} 
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.22 }}
                      className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
                      onClick={() => {
                        vibrar(10);
                        setIsReceitasModalOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                            <Briefcase size={16} className="text-emerald-500" />
                          </div>
                          <div>
                            <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] leading-none mb-1">
                              Origem
                            </h3>
                            <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight leading-none group-hover:text-emerald-500 transition-colors">
                              Por Fonte
                            </h4>
                          </div>
                        </div>
                        <ListIcon size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <div 
                        className="h-[300px] w-full outline-none focus:outline-none mt-2 relative"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4 z-10">
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 shadow-sm">Receita Total</span>
                           <span className="text-xl font-black text-gray-900 dark:text-white display-font leading-none drop-shadow-sm">{formatarMoeda(resumoMes.receitas)}</span>
                        </div>
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          className="outline-none"
                        >
                          <PieChart>
                            <defs>
                              <linearGradient id="pie1" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#3B82F6" />
                                <stop offset="100%" stopColor="#60A5FA" />
                              </linearGradient>
                              <linearGradient id="pie2" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="100%" stopColor="#34D399" />
                              </linearGradient>
                              <linearGradient id="pie3" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#F59E0B" />
                                <stop offset="100%" stopColor="#FBBF24" />
                              </linearGradient>
                              <linearGradient id="pie4" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#8B5CF6" />
                                <stop offset="100%" stopColor="#A78BFA" />
                              </linearGradient>
                            </defs>
                            <Pie
                              data={receitaPorFonte}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={95}
                              paddingAngle={8}
                              dataKey="valor"
                              isAnimationActive={true}
                              animationDuration={1500}
                              stroke="none"
                              cornerRadius={12}
                            >
                              {receitaPorFonte.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    [
                                      "url(#pie1)",
                                      "url(#pie2)",
                                      "url(#pie3)",
                                      "url(#pie4)",
                                    ][index % 4]
                                  }
                                />
                              ))}
                            </Pie>
                            <ReTooltip
                              content={
                                <CustomTooltip isDarkMode={isDarkMode} />
                              }
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4 px-2">
                        {receitaPorFonte.slice(0, 4).map((f, i) => (
                          <div key={`fonte-legenda-${i}`} className="bg-gray-50 dark:bg-white/[0.02] p-2 rounded-lg border border-gray-100 dark:border-white/[0.05] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500'][i % 4]}`} />
                              <span className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase truncate max-w-[60px]">{f.nome}</span>
                            </div>
                            <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase">{formatarMoeda(f.valor).replace('R$', '')}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Metas Cumpridas - Gráfico de Barras */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.22 }}
                    className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                          <Target size={20} className="text-orange-500" />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-0.5">Performance</h3>
                          <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Atingimento de Meta</h4>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 text-primary-500">
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse shadow-[0_0_8px_currentColor]" />
                          <span className="text-[10px] font-black uppercase tracking-widest leading-none">Meta Ativa</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                          {formatarMoeda(metaDiaria)} / dia
                        </span>
                      </div>
                    </div>
                    <div 
                      className="h-[240px] w-full outline-none focus:outline-none mt-2"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                        className="outline-none"
                      >
                        <BarChart data={metaFulfillment}>
                          <defs>
                            <linearGradient id="barAtingido" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10B981" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                            <linearGradient id="barNaoAtingido" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F59E0B" />
                              <stop offset="100%" stopColor="#D97706" />
                            </linearGradient>
                          </defs>
                          <ReferenceLine 
                            y={metaDiaria} 
                            stroke="#6B7280" 
                            strokeDasharray="4 4" 
                            strokeOpacity={0.4} 
                            label={{ 
                              position: 'top', 
                              value: 'VALOR META', 
                              fill: '#9CA3AF', 
                              fontSize: 8, 
                              fontWeight: 900,
                              offset: 10
                            }} 
                          />
                          <XAxis
                            dataKey="dia"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 9,
                              fontWeight: 900,
                              fill: "#9CA3AF",
                            }}
                            dy={15}
                          />
                          <YAxis hide domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, metaDiaria * 1.1)]} />
                          <ReTooltip
                            content={<CustomTooltip isDarkMode={isDarkMode} />}
                            cursor={{
                              fill: isDarkMode ? "#1F2937" : "#F9FAFB",
                              radius: 12,
                            }}
                          />
                          <Bar
                            dataKey="valor"
                            radius={[8, 8, 0, 0]}
                            barSize={32}
                            isAnimationActive={true}
                            animationBegin={100}
                            label={{ 
                              position: 'top', 
                              fill: isDarkMode ? '#9CA3AF' : '#6B7280', 
                              fontSize: 9, 
                              fontWeight: 900,
                              formatter: (val: number) => val > 0 ? `R$${val.toFixed(0)}` : ''
                            }}
                          >
                            {metaFulfillment.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.atingiu ? "url(#barAtingido)" : "url(#barNaoAtingido)"}
                                fillOpacity={entry.atingiu ? 1 : 0.8}
                                stroke={
                                  entry.atingiu ? "rgba(16, 185, 129, 0.5)" : "rgba(245, 158, 11, 0.5)"
                                }
                                strokeWidth={2}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>

              <div className="w-1/3 h-full overflow-y-auto pb-40 overflow-x-hidden scroll-smooth p-3">
                  <FormularioLancamento
                    aoSalvar={salvarTransacao}
                    isDarkMode={isDarkMode}
                    edicao={transacaoEmEdicao}
                    vibrar={vibrar}
                    categoriasReceita={CATEGORIAS_RECEITA}
                    categoriasDespesa={CATEGORIAS_DESPESA}
                  />
                </div>

              <div className="w-1/3 h-full overflow-y-auto pb-40 overflow-x-hidden scroll-smooth p-4 space-y-4">
                  {/* Simplified Filter */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={buscaDescricao}
                        onChange={(e) => setBuscaDescricao(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 rounded-2xl border border-neutral-200/60 dark:border-white/10 text-sm outline-none focus:ring-2 ring-primary-500/20 transition-all font-medium text-gray-800 dark:text-gray-200 shadow-sm"
                      />
                      <ListIcon
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        size={16}
                      />
                    </div>
                    <button
                      onClick={exportarCSV}
                      className="bg-white dark:bg-gray-900 px-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-center text-primary-600 shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      <Download size={18} />
                    </button>
                  </div>

                  {historicoAgrupado.grupos.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center text-gray-300 mb-4">
                        <ReceiptText size={24} />
                      </div>
                      <p className="text-gray-500 text-sm font-medium">
                        Nenhum lançamento encontrado
                      </p>
                    </div>
                  ) : (
                    historicoAgrupado.grupos.map((grupo, gIdx) => (
                      <div key={`grupo-${grupo.id}-${gIdx}`} className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[11px] font-semibold text-gray-500  tracking-wider">
                            {grupo.label}
                          </span>
                          <span
                            className={`text-xs font-medium tracking-tight display-font ${grupo.lucro >= 0 ? "text-green-600" : "text-red-500"}`}
                          >
                            {formatarMoeda(grupo.lucro)}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/50 shadow-sm">
                          {grupo.transacoes.map((t, tIdx) => (
                            <div
                              key={`${grupo.id}-${t.id}-${tIdx}`}
                              className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-10 h-10 flex items-center justify-center rounded-xl ${t.tipo === "receita" ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"}`}
                                >
                                  {React.createElement(getIconeCategoria(t), {
                                    size: 18,
                                  })}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-[13px] font-semibold truncate text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                      {t.descricao || "Geral"}
                                      <span className="text-[10px] text-gray-400 font-medium tracking-normal bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">{formatarDataBR(t.data).substring(0, 5)}</span>
                                    </p>
                                    {t.custoFixo && (
                                      <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                        Fixo
                                      </span>
                                    )}
                                    {t.tags && t.tags.length > 0 && t.tags.map((tag, tagIdx) => (
                                      <span key={`${t.id}-tag-${tag}-${tagIdx}`} className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-500 tracking-widest mt-0.5 flex gap-1.5 items-center">
                                    <span>{getNomeCategoria(t)}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-sm font-medium tracking-tight display-font ${t.tipo === "receita" ? "text-green-600" : "text-gray-900 dark:text-white"}`}
                                >
                                  {formatarMoeda(t.valor).replace("R$", "")}
                                </span>
                                <div className="flex border-l border-gray-100 dark:border-gray-800 ml-2 pl-2 gap-1">
                                  <button
                                    onClick={() => {
                                      setTransacaoEmEdicao(t);
                                      setTabAtual("adicionar");
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setTransacaoParaExcluir(t.id)
                                    }
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
          </motion.div>
        </main>

        <nav className="fixed bottom-0 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-900 flex justify-around items-center z-40 pb-safe px-4 pt-1">
          <button
            onClick={() => {
              vibrar(10);
              setTabAtual("resumo");
            }}
            className="relative flex flex-col items-center justify-center py-3 w-1/4 transition-all group overflow-hidden"
          >
            <LayoutDashboard
              size={22}
              strokeWidth={tabAtual === "resumo" ? 2.5 : 2}
              className={
                tabAtual === "resumo"
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
              }
            />
            <span
              className={`text-[11px] mt-1.5 font-medium  tracking-wider ${tabAtual === "resumo" ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}
            >
              Início
            </span>
            {tabAtual === "resumo" && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute bottom-1 w-1 h-1 bg-gray-900 dark:bg-white rounded-full"
              />
            )}
          </button>

          <div className="relative w-1/4 flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                vibrar(20);
                setTransacaoEmEdicao(null);
                setTabAtual("adicionar");
              }}
              className="absolute -top-8 w-10 h-10 bg-primary-600 rounded-full shadow-lg shadow-primary-600/30 flex items-center justify-center text-white border-4 border-white dark:border-gray-950 transition-all"
            >
              <Plus
                size={22}
                strokeWidth={2.5}
                className={
                  tabAtual === "adicionar" && !transacaoEmEdicao
                    ? "rotate-45"
                    : ""
                }
              />
            </motion.button>
          </div>

          <button
            onClick={() => {
              vibrar(10);
              setTabAtual("historico");
            }}
            className="relative flex flex-col items-center justify-center py-3 w-1/4 transition-all group overflow-hidden"
          >
            <ReceiptText
              size={22}
              strokeWidth={tabAtual === "historico" ? 2.5 : 2}
              className={
                tabAtual === "historico"
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
              }
            />
            <span
              className={`text-[11px] mt-1.5 font-medium  tracking-wider ${tabAtual === "historico" ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}
            >
              Extrato
            </span>
            {tabAtual === "historico" && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute bottom-1 w-1 h-1 bg-gray-900 dark:bg-white rounded-full"
              />
            )}
          </button>
        </nav>

        <AnimatePresence>
          <ModalPage
            key="modal-despesas"
            isOpen={isDespesasModalOpen}
            onClose={() => setIsDespesasModalOpen(false)}
            title="Todas as Despesas"
            subtitle="Neste mês"
            icon={BarChart3}
          >
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {todasCategoriasGastos.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm font-medium">
                  Nenhuma despesa registrada.
                </div>
              ) : (
                todasCategoriasGastos.map((cat, index) => (
                  <div key={`modal-cat-${cat.id}-${index}`} className="py-4 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors px-2">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"][index % 8]}}>
                         {cat.nome.substring(0,2).toUpperCase()}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{cat.nome}</p>
                         <p className="text-xs text-gray-400 font-medium">{cat.pct.toFixed(1)}% do total</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-bold text-red-500">{formatarMoeda(cat.valor)}</p>
                     </div>
                  </div>
                ))
              )}
            </div>
          </ModalPage>

          <ModalPage
            key="modal-balanco"
            isOpen={isBalancoModalOpen}
            onClose={() => setIsBalancoModalOpen(false)}
            title="Detalhamento do Balanço"
            subtitle="Visão analítica completa do período atual"
            icon={Wallet}
          >
            <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-800/50">
              {/* Resumo de Destaque Central */}
              <div className="py-6 flex flex-col items-center text-center">
                <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.25em] mb-2">Saldo Disponível no Mês</span>
                <span className={`text-4xl font-black tracking-tighter display-font mb-6 transition-colors ${lucroMes < 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
                  {formatarMoeda(lucroMes)}
                </span>
                
                <div className="w-full grid grid-cols-2 gap-6 px-6">
                   <div className="text-center group">
                     <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em] block mb-1 group-hover:text-emerald-500 transition-colors">Entradas Totais</span>
                     <div className="flex flex-col items-center">
                       <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-500 display-font">{formatarMoeda(resumoMes.receitas)}</span>
                       {resumoMesPassado.receitas > 0 && (
                         <div className={`mt-1 flex items-center gap-1 text-[9px] font-bold ${(resumoMes.receitas / resumoMesPassado.receitas) >= 1 ? 'text-emerald-500' : 'text-red-400'}`}>
                           {(resumoMes.receitas / resumoMesPassado.receitas) >= 1 ? <ArrowUpRight size={9} strokeWidth={3} /> : <ArrowDownRight size={9} strokeWidth={3} />}
                           {Math.abs((resumoMes.receitas / resumoMesPassado.receitas - 1) * 100).toFixed(0)}% vs ant.
                         </div>
                       )}
                     </div>
                   </div>
                   <div className="text-center group">
                     <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em] block mb-1 group-hover:text-red-500 transition-colors">Saídas Totais</span>
                     <div className="flex flex-col items-center">
                       <span className="text-base sm:text-lg font-bold text-red-500 dark:text-red-400 display-font">{formatarMoeda(resumoMes.despesas)}</span>
                       {resumoMesPassado.despesas > 0 && (
                         <div className={`mt-1 flex items-center gap-1 text-[9px] font-bold ${(resumoMes.despesas / resumoMesPassado.despesas) <= 1 ? 'text-emerald-500' : 'text-red-400'}`}>
                           {(resumoMes.despesas / resumoMesPassado.despesas) <= 1 ? <ArrowDownRight size={9} strokeWidth={3} /> : <ArrowUpRight size={9} strokeWidth={3} />}
                           {Math.abs((resumoMes.despesas / resumoMesPassado.despesas - 1) * 100).toFixed(0)}% vs ant.
                         </div>
                       )}
                     </div>
                   </div>
                </div>
              </div>

              {/* Lista de Métricas Estruturadas */}
              <div className="divide-y divide-gray-50 dark:divide-gray-800/20">
                {/* Projeção */}
                <div className="py-4 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all group-hover:scale-110 shadow-sm">
                      <TrendingUp size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block tracking-tight">Projeção Mensal</span>
                      <span className="text-[10px] text-gray-400 font-medium tracking-wide">Estimativa baseada no ritmo hoje</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary-600 dark:text-primary-400 display-font block leading-none">{formatarMoeda(projecaoMensal)}</span>
                  </div>
                </div>

                {/* Ritmo Diário */}
                <div className="py-4 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center transition-all group-hover:scale-110 shadow-sm">
                      <Target size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block tracking-tight">Ritmo Diário</span>
                      <span className="text-[10px] text-gray-400 font-medium tracking-wide">Faturamento médio / dia</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400 display-font block leading-none">{formatarMoeda(mediaDiaria)}</span>
                  </div>
                </div>

                {/* Ticket Médio */}
                <div className="py-4 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all group-hover:scale-110 shadow-sm">
                      <Zap size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block tracking-tight">Ticket Médio</span>
                      <span className="text-[10px] text-gray-400 font-medium tracking-wide">Valor médio por entrada</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 display-font block leading-none">{formatarMoeda(ticketMedio)}</span>
                  </div>
                </div>

                {/* Eficiência */}
                <div className="py-4 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-all group-hover:scale-110 shadow-sm">
                      <Activity size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block tracking-tight">Eficiência ROC</span>
                      <span className="text-[10px] text-gray-400 font-medium tracking-wide">Retorno vs Despesa</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 display-font block leading-none">{(indiceEficiencia || 0).toFixed(2)}x</span>
                  </div>
                </div>

                {/* Custos Fixos */}
                <div className="py-4 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center transition-all group-hover:scale-110 shadow-sm">
                      <Lock size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block tracking-tight">Custos Fixos</span>
                      <span className="text-[10px] text-gray-400 font-medium tracking-wide">Comprometimento recorrente</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-red-600 dark:text-red-400 display-font block leading-none">{formatarMoeda(totalCustosFixos)}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{(totalCustosFixos / (resumoMes.despesas || 1) * 100).toFixed(0)}% do operacional</span>
                  </div>
                </div>

                {/* Consistência */}
                <div className="py-4 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 flex items-center justify-center transition-all group-hover:scale-110 shadow-sm">
                      <CalendarIcon size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block tracking-tight">Consistência Semanal</span>
                      <span className="text-[10px] text-gray-400 font-medium tracking-wide">Score de fôlego (7 dias)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-pink-600 dark:text-pink-400 display-font block leading-none">{diasLucrativos} / 7</span>
                    <div className="flex gap-1 mt-1.5 justify-end">
                       {[...Array(7)].map((_, i) => (
                         <div key={`dot-${i}`} className={`w-1.5 h-1.5 rounded-full ${i < diasLucrativos ? 'bg-pink-500' : 'bg-gray-200 dark:bg-gray-800'}`} />
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ModalPage>

          <ModalPage
            key="modal-receitas"
            isOpen={isReceitasModalOpen}
            onClose={() => setIsReceitasModalOpen(false)}
            title="Fontes de Receita"
            subtitle="Neste mês"
            icon={TrendingUp}
            primaryColor="text-green-500"
          >
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {receitaPorFonte.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm font-medium">
                  Nenhuma receita registrada.
                </div>
              ) : (
                receitaPorFonte.map((fonte, index) => (
                  <div key={`modal-fonte-${fonte.id}-${index}`} className="py-4 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors px-2">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"][index % 5]}}>
                         {fonte.nome.substring(0,2).toUpperCase()}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{fonte.nome}</p>
                         <p className="text-xs text-gray-400 font-medium">{fonte.pct.toFixed(1)}% do total</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-bold text-green-600">{formatarMoeda(fonte.valor)}</p>
                     </div>
                  </div>
                ))
              )}
            </div>
          </ModalPage>

          <ModalPage
            key="modal-configuracoes"
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            title="Menu Principal"
            subtitle="Central de controle do AutoCaixa"
            icon={Menu}
          >
            <div className="py-4">
              {/* Navegação por Cards Interna */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                {[
                  { id: "Custos", icon: Lock, desc: "Recorrentes" },
                  { id: "Interface", icon: LayoutDashboard, desc: "Aparência" },
                  { id: "Dados", icon: BoxIcon, desc: "Backup" },
                  { id: "Perfil", icon: User, desc: "Sua Conta" },
                ].map((aba) => {
                  const Icon = aba.icon;
                  return (
                    <button
                      key={aba.id}
                      onClick={() => setAbaConfig(aba.id as any)}
                      className={`flex flex-col items-start justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all group ${
                        abaConfig === aba.id 
                          ? "bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-600 dark:text-primary-400 shadow-sm" 
                          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 hover:border-primary-200 dark:hover:border-primary-900/50"
                      }`}
                    >
                      <div className={`mb-2 p-2 rounded-xl transition-colors ${abaConfig === aba.id ? "bg-primary-100 dark:bg-primary-900/50" : "bg-gray-50 dark:bg-gray-800 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30"}`}>
                        <Icon size={18} strokeWidth={abaConfig === aba.id ? 2.5 : 2} className={abaConfig === aba.id ? "text-primary-600 dark:text-primary-400" : "text-gray-500"} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white leading-tight">{aba.id}</span>
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">{aba.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-6 px-1">
                {abaConfig === "Custos" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-2xl border border-primary-100 dark:border-primary-900/30">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center shrink-0">
                          <Info size={16} className="text-primary-600 dark:text-primary-300" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Meus Custos Fixos</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            Adicione suas despesas recorrentes (aluguel, internet, seguros). Ao mudar de mês, você pode lançar todos eles de uma só vez apertando o botão abaixo.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                       {custosFixosBase.length === 0 ? (
                         <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 text-xs font-medium">
                           Nenhum custo fixo cadastrado.
                         </div>
                       ) : (
                         custosFixosBase.map((cf) => (
                           <div key={cf.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                              <div>
                                <span className="block text-sm font-bold text-gray-900 dark:text-white">{cf.descricao}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-gray-500 font-medium">Todo dia {cf.diaVencimento}</span>
                                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                  <span className="text-[10px] text-gray-500 font-medium capitalize">{cf.categoria}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-red-500">{formatarMoeda(cf.valor)}</span>
                                <button 
                                  onClick={() => {
                                      setCustosFixosBase(prev => prev.filter(x => x.id !== cf.id));
                                      mostrarToast("Custo removido", "erro");
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                           </div>
                         ))
                       )}
                    </div>

                    {isAddingCF ? (
                      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-xl space-y-3 mt-4">
                         <input 
                            placeholder="Nome do Custo (ex: Aluguel)"
                            className="w-full bg-white dark:bg-gray-950 px-3 py-2 rounded-lg text-sm border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
                            value={novoCF.descricao}
                            onChange={e => setNovoCF({...novoCF, descricao: e.target.value})}
                         />
                         <div className="flex gap-2">
                           <input 
                              placeholder="Valor Mensal"
                              type="number"
                              className="w-full bg-white dark:bg-gray-950 px-3 py-2 rounded-lg text-sm border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
                              value={novoCF.valor}
                              onChange={e => setNovoCF({...novoCF, valor: e.target.value})}
                           />
                           <input 
                              placeholder="Dia (1-31)"
                              type="number"
                              className="w-24 shrink-0 bg-white dark:bg-gray-950 px-3 py-2 rounded-lg text-sm border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white text-center"
                              value={novoCF.diaVencimento}
                              min={1} max={31}
                              onChange={e => setNovoCF({...novoCF, diaVencimento: e.target.value})}
                           />
                         </div>
                         <div className="flex gap-2 pt-1">
                            <button 
                              onClick={() => setIsAddingCF(false)}
                              className="flex-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-[11px] py-2.5 rounded-lg uppercase tracking-wider transition-colors hover:bg-gray-300 dark:hover:bg-gray-700"
                            >Cancelar</button>
                            <button 
                              onClick={() => {
                                const valor = parseFloat(novoCF.valor.replace(',', '.'));
                                if(!novoCF.descricao || isNaN(valor)) return mostrarToast("Preencha corretamente", "erro");
                                const dia = parseInt(novoCF.diaVencimento) || 5;
                                setCustosFixosBase(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), descricao: novoCF.descricao, valor, categoria: "moradia", diaVencimento: dia }]);
                                setIsAddingCF(false);
                                setNovoCF({ descricao: "", valor: "", diaVencimento: "5", categoria: "moradia" });
                              }}
                              className="flex-1 bg-primary-500 text-white font-bold text-[11px] py-2.5 rounded-lg uppercase tracking-wider transition-colors hover:bg-primary-600 shadow-sm shadow-primary-500/20"
                            >Salvar Custo</button>
                         </div>
                      </div>
                    ) : (
                     <div className="grid grid-cols-2 gap-2 pt-2">
                       <button 
                         onClick={() => setIsAddingCF(true)}
                         className="flex items-center justify-center gap-1 p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-[11px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
                       
                       >
                         <Plus size={14} />
                         Novo Custo
                       </button>

                       <button 
                         onClick={() => {
                           if(custosFixosBase.length === 0) return mostrarToast("Nenhum custo cadastrado.", "erro");
                           const hoje = new Date();
                           const prefix = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-`;
                           const novos = custosFixosBase.map(cf => ({
                              id: "cf_" + cf.id + "_" + Date.now(),
                              tipo: "despesa" as const,
                              valor: cf.valor,
                              categoria: cf.categoria,
                              descricao: cf.descricao,
                              data: `${prefix}${String(Math.min(cf.diaVencimento, 28)).padStart(2, '0')}`,
                              custoFixo: true,
                              tags: []
                           }));
                           setTransacoes(prev => [...novos, ...prev]);
                           mostrarToast("Custos lançados!");
                         }}
                         className="flex items-center justify-center gap-1 p-3 bg-primary-500 text-white font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-primary-600 transition-all disabled:opacity-50"
                         disabled={custosFixosBase.length === 0}
                       >
                         <CheckCircle2 size={14} />
                         Lançar no Mês
                       </button>
                    </div>
                   )}
                  </motion.div>
                )}

                {abaConfig === "Interface" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Painel de Temas</h4>
                      <div className="grid grid-cols-3 gap-1.5">
                        {Object.entries(THEMES).map(([key, theme]) => (
                          <button
                            key={key}
                            onClick={() => {
                              vibrar(10);
                              setCorTema(key as any);
                            }}
                            className={`p-1.5 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                              corTema === key 
                                ? "bg-primary-50 dark:bg-primary-900/20 border-primary-500" 
                                : "bg-transparent border-gray-100 dark:border-gray-800"
                            }`}
                          >
                            <div className="w-6 h-6 rounded shadow-sm" style={{ backgroundColor: theme[500] }} />
                            <span className={`text-[8px] font-bold truncate w-full text-center ${corTema === key ? "text-primary-600" : "text-gray-500"}`}>{theme.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Modo</h4>
                      <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                        {[
                          { id: "light", label: "Claro", icon: Sun },
                          { id: "dark", label: "Escuro", icon: Moon },
                          { id: "system", label: "Auto", icon: Activity }
                        ].map((mode) => {
                          const Icon = mode.icon;
                          const active = themeMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              onClick={() => {
                                vibrar(10);
                                setThemeMode(mode.id as any);
                              }}
                              className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                                active ? "bg-white dark:bg-gray-800 shadow-sm text-primary-500 font-bold" : "text-gray-400"
                              }`}
                            >
                              <Icon size={14} />
                              <span className="text-[8px] font-black uppercase">{mode.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {abaConfig === "Dados" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "JSON", icon: BoxIcon, color: "blue", action: () => {
                          const blob = new Blob([JSON.stringify(transacoes)], { type: "application/json" });
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = `backup_AutoCaixa_${getLocalISODate()}.json`;
                          a.click();
                          mostrarToast("Backup exportado!");
                        }},
                        { label: "CSV", icon: TableIcon, color: "green", action: exportarCSV },
                        { label: "PDF", icon: FileText, color: "red", action: gerarRelatorioPDF },
                        { label: "Limpar", icon: Trash2, color: "gray", action: () => {
                           if (confirm("Resetar todos os dados?")) {
                             setTransacoes([]);
                             mostrarToast("Dados apagados");
                           }
                        }}
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={item.action}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 transition-all border-b-2"
                        >
                          <div className={`p-1.5 rounded-lg bg-${item.color}-50 dark:bg-${item.color}-900/20 text-${item.color}-600`}>
                            <item.icon size={16} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{item.label}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 p-3.5 bg-primary-500 rounded-xl text-white font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-primary-500/20"
                    >
                      <Upload size={14} />
                      Importar Backup
                    </button>
                  </motion.div>
                )}

                {abaConfig === "Perfil" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="space-y-4">
                       <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Dados de Apresentação</h4>
                       
                       <div className="space-y-4 bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-primary-500 uppercase tracking-[0.1em]">Nome do Usuário</label>
                             <input 
                                type="text"
                                value={userProfile.nome}
                                onChange={(e) => setUserProfile({...userProfile, nome: e.target.value})}
                                className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 py-1 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-primary-500 transition-colors"
                             />
                          </div>

                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-primary-500 uppercase tracking-[0.1em]">Área de Atuação</label>
                             <select 
                                value={userProfile.profissao}
                                onChange={(e) => setUserProfile({...userProfile, profissao: e.target.value})}
                                className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 py-1 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer"
                             >
                                {Object.entries(PROFISSOES_CONFIG).map(([key, cfg]) => (
                                   <option key={key} value={key}>{cfg.titulo}</option>
                                ))}
                             </select>
                          </div>

                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-primary-500 uppercase tracking-[0.1em]">Meta Mensal (Líquido)</label>
                             <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-400">R$</span>
                                <input 
                                   type="number"
                                   value={userProfile.metaMensal}
                                   onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setUserProfile({...userProfile, metaMensal: val});
                                      setMetaDiaria(Math.round(val / 22));
                                   }}
                                   className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 py-1 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-primary-500 transition-colors"
                                />
                             </div>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="mt-8 text-center pb-4 border-t border-gray-100 dark:border-gray-800 pt-6">
                 <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] font-black text-gray-900 dark:text-white tracking-widest uppercase">AutoCaixa v4.0</span>
                 </div>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importarDados(file);
              }}
            />
          </ModalPage>
        </AnimatePresence>
      </div>
      )}
    </div>
  );
}

function FormularioLancamento({
  aoSalvar,
  isDarkMode,
  edicao,
  vibrar,
  categoriasReceita,
  categoriasDespesa,
}: {
  aoSalvar: (n: any) => void;
  isDarkMode: boolean;
  edicao: Transacao | null;
  vibrar: (ms?: number | number[]) => void;
  categoriasReceita: Categoria[];
  categoriasDespesa: Categoria[];
}) {
  const [tipo, setTipo] = useState<TipoTransacao>(edicao?.tipo || "receita");
  const [valor, setValor] = useState(
    edicao?.valor
      ? edicao.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
      : "",
  );
  const [cat, setCat] = useState(edicao?.categoria || "");
  const [data, setData] = useState(edicao?.data || getLocalISODate());
  const [desc, setDesc] = useState(edicao?.descricao || "");
  const [custoFixo, setCustoFixo] = useState(edicao?.custoFixo || false);
  const [tags, setTags] = useState<string[]>(edicao?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [processandoRecibo, setProcessandoRecibo] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (edicao) {
      setTipo(edicao.tipo);
      setValor(edicao.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
      setCat(edicao.categoria || "");
      setData(edicao.data || getLocalISODate());
      setDesc(edicao.descricao || "");
      setCustoFixo(edicao.custoFixo || false);
      setTags(edicao.tags || []);
    } else {
      setValor("");
      setDesc("");
      setCat("");
      setTags([]);
      setCustoFixo(false);
      setData(getLocalISODate());
    }
  }, [edicao]);

  const lerRecibo = async (file: File) => {
    alert("A leitura de recibos via IA foi desativada.");
    return;
  };

  const formatCurrencyEntry = (v: string) => {
    const n = v.replace(/\D/g, "");
    return (Number(n) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    });
  };

  const handleQuickAdd = (add: number) => {
    const atual = Number(valor.replace(/\./g, "").replace(",", ".")) || 0;
    const novoValor = atual + add;
    setValor(novoValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    vibrar(20);
  };

  const handleSalvar = () => {
    const valorNumerico = Number(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(valorNumerico) || valorNumerico <= 0) return;
    if (!cat) return;

    // Fallback para descrição baseado na categoria se estiver vazia
    const descricaoFinal =
      desc.trim() ||
      (tipo === "receita"
        ? categoriasReceita.find((c) => c.id === cat)?.nome
        : categoriasDespesa.find((c) => c.id === cat)?.nome) ||
      "Lançamento";

    aoSalvar({
      tipo,
      valor: valorNumerico,
      categoria: cat,
      data,
      descricao: descricaoFinal,
      custoFixo: (tipo === "despesa") ? custoFixo : undefined,
      tags,
    });

    if (!edicao) {
      setSalvoComSucesso(true);
      setValor("");
      setDesc("");
      setCat("");
      setTags([]);
      vibrar([30, 20, 30]);
      setTimeout(() => setSalvoComSucesso(false), 3000);
    }
  };

  return (
    <div className="min-h-full flex flex-col pb-8 w-full max-w-lg mx-auto">
      <div className="flex p-1 rounded-xl mb-2 shrink-0 bg-transparent flex-row justify-center space-x-4">
        <button
          onClick={() => { setTipo("receita"); vibrar(10); }}
          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border-b-2 ${tipo === "receita" ? "border-green-500 text-green-600" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
        >
          Entrada
        </button>
        <button
          onClick={() => { setTipo("despesa"); vibrar(10); }}
          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border-b-2 ${tipo === "despesa" ? "border-red-500 text-red-500" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
        >
          Saída
        </button>
      </div>

      <div className="mb-4 mt-2 flex flex-col items-center">
        <div className="flex items-center justify-center w-full mb-2">
          <span className={`text-xl font-light mr-1.5 transition-colors display-font ${tipo === "receita" ? "text-green-500/50" : "text-red-500/50"}`}>
            R$
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(formatCurrencyEntry(e.target.value))}
            placeholder="0,00"
            className={`text-2xl font-black bg-transparent outline-none text-center transition-all tracking-tighter display-font placeholder:opacity-30 ${tipo === "receita" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"} max-w-[120px]`}
          />
        </div>

        <div className="flex justify-center flex-wrap gap-2">
          {[10, 50, 100, 200].map((v) => (
            <button
              key={v}
              onClick={() => { handleQuickAdd(v); vibrar(5); }}
              className={`px-3 py-1 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-[11px] font-bold transition-all border border-gray-200 dark:border-gray-700 ${tipo === 'receita' ? 'text-green-600/70' : 'text-red-500/70'}`}
            >
              + {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 block mb-3">Categoria</label>
        <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-2 px-1">
          {(tipo === "receita" ? categoriasReceita : categoriasDespesa).map(
            (c) => (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setCat(c.id); vibrar(10); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 border transition-all ${cat === c.id ? (tipo === "receita" ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-500/20" : "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20") : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"}`}
              >
                <c.icone size={14} strokeWidth={2.5} />
                <span className="text-[11px] font-bold tracking-wide">
                  {c.nome}
                </span>
              </motion.button>
            ),
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 px-1">
        <div 
          className="flex flex-col justify-center border-b border-gray-200 dark:border-gray-800 pb-2 cursor-pointer group"
          onClick={() => { vibrar(10); setShowCalendar(true); }}
        >
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">
            Data
          </span>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-200">
            <CalendarIcon size={14} className="text-gray-400 group-hover:text-primary-500 transition-colors" />
            {formatarDataBR(data)}
          </div>
        </div>

        <div className="flex flex-col justify-center border-b border-gray-200 dark:border-gray-800 pb-2 focus-within:border-primary-500 transition-colors">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">
            Descrição (Opcional)
          </span>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="No que você gastou?"
            className="bg-transparent outline-none text-sm font-bold w-full placeholder:text-gray-300 dark:placeholder:text-gray-700 text-gray-800 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-6 px-1">
        <div className="flex flex-col justify-center border-b border-gray-200 dark:border-gray-800 pb-2 focus-within:border-primary-500 transition-colors">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Tags / Projetos</span>
            <div className="flex flex-wrap gap-2 items-center">
                {tags.map((tag, i) => (
                   <motion.span 
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     key={`form-tag-${tag}-${i}`} 
                     className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 font-bold tracking-wide"
                   >
                      #{tag}
                      <button onClick={() => { vibrar(5); setTags(tags.filter((_, idx) => idx !== i)); }} className="hover:text-red-500 transition-colors">
                         <Plus size={10} className="rotate-45" strokeWidth={3} />
                      </button>
                   </motion.span>
                ))}
                <input
                   type="text"
                   value={tagInput}
                   onChange={(e) => setTagInput(e.target.value)}
                   onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                         e.preventDefault();
                         const val = tagInput.trim().replace(/^#/, '');
                         if (val && !tags.includes(val)) {
                            setTags([...tags, val]);
                            vibrar(10);
                         }
                         setTagInput("");
                      }
                   }}
                   placeholder={tags.length === 0 ? "Adicionar Tag" : ""}
                   className="flex-1 min-w-[100px] bg-transparent outline-none font-bold text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
                />
            </div>
        </div>

        {tipo === "despesa" && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center gap-2">
               <Lock size={14} className="text-gray-400" />
               <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Custo Fixo Mensal</span>
            </div>
            <button
              onClick={() => { vibrar(10); setCustoFixo(!custoFixo); }}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors relative shrink-0 ${custoFixo ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-700"}`}
            >
              <motion.div
                initial={false}
                animate={{ x: custoFixo ? 20 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </motion.div>
        )}

        <div className="flex items-center pb-2">
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => { 
              if(e.target.files && e.target.files[0]) {
                vibrar(20);
                lerRecibo(e.target.files[0]);
              }
            }} 
          />
          <button
            onClick={() => { vibrar(10); fileInputRef.current?.click(); }}
            disabled={processandoRecibo}
            className="flex items-center gap-2 text-sm font-bold text-primary-500 hover:text-primary-600 transition-colors px-1"
          >
            {processandoRecibo ? (
              <Loader2 size={16} className="animate-spin shrink-0" />
            ) : (
              <Camera size={16} className="shrink-0" />
            )}
            <span>{processandoRecibo ? "Analisando..." : "Escanear Nota com IA"}</span>
          </button>
        </div>
      </div>

      {salvoComSucesso && (
        <motion.div
           initial={{ opacity: 0, y: 10, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           className="mb-3 p-2 bg-green-500 text-white rounded-xl flex items-center justify-center gap-2 text-center shadow-md shadow-green-500/20"
        >
           <CheckCircle2 size={16} strokeWidth={2.5} />
           <p className="text-[10px] font-black tracking-wide">Lançamento salvo!</p>
        </motion.div>
      )}

      <motion.button
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        disabled={!valor || !cat}
        onClick={() => {
          vibrar(25);
          handleSalvar();
        }}
        className={`w-full py-3 text-white rounded-xl font-black uppercase tracking-[0.1em] text-[11px] transition-all flex items-center justify-center gap-2 shadow-sm ${!valor || !cat ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none" : tipo === "receita" ? "bg-green-600 shadow-green-600/20 hover:bg-green-700" : "bg-primary-600 shadow-primary-600/20 hover:bg-primary-700"}`}
      >
        {edicao ? (
          <Pencil size={14} strokeWidth={2.5} />
        ) : (
          <CheckCircle2 size={14} strokeWidth={2.5} />
        )}
        {edicao ? "Salvar Edição" : tipo === "receita" ? "Confirmar Entrada" : "Confirmar Saída"}
      </motion.button>

      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-3"
            onClick={() => setShowCalendar(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-900 p-3 rounded-xl w-full max-w-xs border dark:border-gray-800 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-center font-medium  tracking-widest text-xs mb-3">
                Selecionar Data
              </h3>
              <input
                type="date"
                value={data}
                onChange={(e) => {
                  setData(e.target.value);
                  setShowCalendar(false);
                }}
                className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-medium text-sm mb-3 focus:ring-4 ring-primary-500/10 border border-gray-100 dark:border-gray-800 transition-all "
                style={{ colorScheme: isDarkMode ? "dark" : "light" }}
              />
              <button
                onClick={() => setShowCalendar(false)}
                className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium text-[11px]  tracking-widest shadow-lg"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
