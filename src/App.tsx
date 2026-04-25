import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { GoogleGenAI, Type } from "@google/genai";
import {
  gerarInsightsNativos,
  AIInsight,
  responderChat,
  AIChatMessage,
  APSentiment,
} from "./services/aiAssistant";
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
} from "recharts";

import {
  TipoTransacao,
  Transacao,
  Categoria,
  SemanaAgrupada,
  ConfiguracaoAI,
  NivelDetalheAI,
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

const getIconeCategoria = (t: Transacao) => {
  const cats = t.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const found = cats.find((c) => c.id === t.categoria);
  if (found && found.icone) return found.icone;
  if (CATEGORIAS_LEGADO[t.categoria]) return CATEGORIAS_LEGADO[t.categoria];

  const desc = t.descricao.toLowerCase();
  if (
    desc.includes("ifood") ||
    desc.includes("restaurante") ||
    desc.includes("lanche")
  )
    return Utensils;
  if (desc.includes("uber") || desc.includes("99") || desc.includes("posto"))
    return Car;
  if (desc.includes("mercado") || desc.includes("compra")) return ShoppingBag;
  if (desc.includes("pix")) return Activity;

  return t.tipo === "receita" ? TrendingUp : ShoppingBag;
};

const getNomeCategoria = (t: Transacao) => {
  const cats = t.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const found = cats.find((c) => c.id === t.categoria);
  if (found) return found.nome;

  if (t.categoria && t.categoria !== "outros") {
    return t.categoria.charAt(0).toUpperCase() + t.categoria.slice(1);
  }
  return "Outros";
};

const CATEGORIAS_RECEITA: Categoria[] = [
  { id: "uber", nome: "Uber", icone: Car },
  { id: "99", nome: "99App", icone: Car },
  { id: "indrive", nome: "InDrive", icone: Car },
  { id: "particular", nome: "Particular", icone: Smartphone },
  { id: "entrega", nome: "Entrega", icone: Package },
  { id: "salario", nome: "Salário", icone: Briefcase },
  { id: "outros", nome: "Outros", icone: MoreHorizontal },
];

const CATEGORIAS_DESPESA: Categoria[] = [
  { id: "moradia", nome: "Moradia", icone: Home },
  { id: "alimentacao", nome: "Alimentação", icone: Utensils },
  { id: "transporte", nome: "Transporte", icone: Bus },
  { id: "saude", nome: "Saúde", icone: HeartPulse },
  { id: "lazer", nome: "Lazer", icone: Gamepad2 },
  { id: "educacao", nome: "Educação", icone: GraduationCap },
  { id: "compras", nome: "Compras", icone: ShoppingBag },
  { id: "contas", nome: "Contas", icone: FileText },
  { id: "outros", nome: "Outros", icone: MoreHorizontal },
];

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
                key={index}
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
const RainbowAIIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => {
  return (
  <div className={`relative inline-flex items-center justify-center group ${className}`} style={{ width: size, height: size }}>
    <span 
      className="font-black italic tracking-tighter bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 via-green-500 via-primary-500 via-indigo-500 via-purple-500 to-red-500 bg-clip-text text-transparent animate-rainbow-move pointer-events-none select-none z-10 relative drop-shadow-sm flex items-center justify-center"
      style={{ fontSize: `${size * 0.8}px`, lineHeight: 1 }}
    >
      IA
    </span>
    <div 
      className="absolute inset-0 blur-[8px] opacity-50 animate-rainbow-move group-hover:opacity-80 transition-opacity"
      style={{
        background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #6366f1, #a855f7, #ef4444)',
        borderRadius: '50%',
        backgroundSize: '200% 100%'
      }}
    />
  </div>
)};

export default function App() {
  const [tabAtual, setTabAtual] = useState<
    "resumo" | "adicionar" | "historico"
  >("resumo");
  const [direcao, setDirecao] = useState(0);
  const [transacoes, setTransacoes] = useState<Transacao[]>(() =>
    getInitialData(),
  );
  const [corTema, setCorTema] = useState<"blue" | "purple" | "green" | "orange">(
    () => (localStorage.getItem("@MeuCaixa:corTema") as any) || "blue"
  );
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("@MeuCaixa:theme");
      if (saved) return saved === "dark";
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return false;
    } catch {
      return false;
    }
  });
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

  const [isAIOpen, setIsAIOpen] = useState(false);
  const [configAI, setConfigAI] = useState<ConfiguracaoAI>(() => {
    const saved = localStorage.getItem("@MeuCaixa:configAI");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      nivelDetalhe: "padrao",
      focarEmGanhos: true,
      focarEmGastos: true,
      hapticosAtivos: true,
    };
  });

  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [activeAIView, setActiveAIView] = useState<
    "insights" | "chat" | "settings"
  >("insights");

  // --- Funções de Feedback ---
  const vibrar = (ms: number | number[] = 10) => {
    if (
      configAI.hapticosAtivos &&
      typeof navigator !== "undefined" &&
      navigator.vibrate
    ) {
      navigator.vibrate(ms);
    }
  };

  useEffect(() => {
    localStorage.setItem("@MeuCaixa:configAI", JSON.stringify(configAI));
  }, [configAI]);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeAIView === "chat") {
      scrollToBottom(chatContainerRef);
    }
  }, [chatMessages, activeAIView]);

  const [isAIThinking, setIsAIThinking] = useState(false);

  const handleSendToAI = async () => {
    if (!userInput.trim()) return;

    const userMessage: AIChatMessage = {
      role: "user",
      content: userInput,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setIsAIThinking(true);
    setUserInput("");

    try {
      const aiResponse = await responderChat(
        userInput,
        transacoes,
        metaDiaria,
        configAI,
        chatMessages,
      );
      setChatMessages((prev) => [...prev, aiResponse]);
      if (aiResponse.sentiment === "negativo") vibrar([40, 30, 40]);
      else vibrar(20);
    } catch (e) {
      console.error(e);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Desculpe, meu cérebro está offline no momento. Tente novamente mais tarde.",
          sentiment: "neutro",
        },
      ]);
    } finally {
      setIsAIThinking(false);
    }
  };

  const SugestaoPergunta = ({ texto }: { texto: string }) => (
    <button
      onClick={() => {
        vibrar(10);
        setUserInput(texto);
        // Pequeno delay para efeito visual
        setTimeout(() => handleSendToAI(), 100);
      }}
      className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/30 rounded-full text-xs font-medium  tracking-widest text-primary-600 dark:text-primary-400 hover:bg-primary-100 transition-all shrink-0"
    >
      {texto}
    </button>
  );

  useEffect(() => {
    if (isAIOpen) {
      const fetchInsights = async () => {
        try {
          const novosInsights = await gerarInsightsNativos(
            transacoes,
            metaDiaria,
            CATEGORIAS_RECEITA,
            CATEGORIAS_DESPESA,
            configAI,
          );
          setInsights(novosInsights);
          if (novosInsights.some((i) => i.tipo === "alerta")) vibrar([50, 50, 50]);
        } catch (error) {
          console.error("Erro ao gerar insights com IA:", error);
        }
      };
      fetchInsights();
    }
  }, [isAIOpen, transacoes, metaDiaria, configAI]);

  const toastRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("@MeuCaixa:theme", isDarkMode ? "dark" : "light");
    localStorage.setItem("@MeuCaixa:corTema", corTema);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode, corTema]);

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
      mostrarToast("Registo atualizado");
    } else {
      setTransacoes((prev) => [higienizarTransacao(nova), ...prev]);
      mostrarToast("Registo salvo");
    }
    setTransacaoEmEdicao(null);
    setTabAtual("resumo");
  };

  const gerarRelatorioPDF = () => {
    try {
      const doc = new jsPDF();
      const hoje = new Date();
      const dataStr = hoje.toLocaleDateString('pt-BR');
      
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246); // Blue-500
      doc.text("MeuCaixa", 14, 22);
      
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

      doc.save(`Relatorio_MeuCaixa_${getLocalISODate()}.pdf`);
      mostrarToast("Relatório PDF Gerado!", "sucesso");
    } catch (e) {
      console.error(e);
      mostrarToast("Erro ao gerar PDF", "erro");
    }
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
      link.download = `MeuCaixa_extrato_${getLocalISODate()}.csv`;
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

    const topCat = todasCategoriasGastos.slice(0, 3);

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
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-300">
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

        <header className="sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md px-3 py-2 z-40 border-b border-gray-100 dark:border-gray-900 shadow-sm transition-all duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-2 lg:gap-4">
            <div className="flex justify-between items-center w-full sm:w-auto gap-3">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center gap-2 min-w-0 cursor-pointer"
                onClick={() => {
                  vibrar(10);
                  setTabAtual("resumo");
                }}
              >
                <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black transition-all shrink-0">
                  <Wallet size={16} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex items-baseline gap-1.5">
                  <h1 className="text-lg font-semibold tracking-tight leading-none dark:text-white display-font shrink-0">
                    Meu<span className="text-primary-500">Caixa</span>
                  </h1>
                </div>
              </motion.div>

              <div className="flex items-center gap-1 sm:hidden shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    vibrar(15);
                    setIsAIOpen(true);
                  }}
                  className="p-1.5 flex items-center gap-1.5 transition-all bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-lg"
                >
                  <RainbowAIIcon size={18} />
                </motion.button>
                <button
                  onClick={() => {
                    vibrar(10);
                    setIsDarkMode(!isDarkMode);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-all"
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button
                  onClick={() => {
                    vibrar(10);
                    setIsMenuOpen(true);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-all"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto sm:flex sm:gap-2">
              <div className="flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 py-1.5 px-1 sm:px-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-center overflow-hidden">
                <span className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-0">Saldo</span>
                <span className={`text-[10px] sm:text-[11px] font-bold truncate w-full max-w-full ${saldoTotal < 0 ? "text-red-500" : "text-gray-900 dark:text-gray-100"}`}>
                  {formatarMoeda(saldoTotal)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 py-1.5 px-1 sm:px-2.5 bg-green-50/50 dark:bg-green-900/10 rounded-lg text-center overflow-hidden">
                <span className="text-[9px] sm:text-[10px] font-semibold text-green-600/70 uppercase tracking-wider mb-0.5 sm:mb-0">Hoje</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-green-600 truncate w-full max-w-full">
                  {formatarMoeda(ganhoHoje)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 py-1.5 px-1 sm:px-2.5 bg-primary-50/50 dark:bg-primary-900/10 rounded-lg text-center overflow-hidden">
                <span className="text-[9px] sm:text-[10px] font-semibold text-primary-600/70 uppercase tracking-wider mb-0.5 sm:mb-0">Mês</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-primary-600 truncate w-full max-w-full">
                  {formatarMoeda(projecaoMensal)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 py-1.5 px-1 sm:px-2.5 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg text-center overflow-hidden">
                <span className="text-[9px] sm:text-[10px] font-semibold text-orange-600/70 uppercase tracking-wider mb-0.5 sm:mb-0">Score</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-orange-500 truncate w-full max-w-full">
                  {Math.round((ganhoHoje / metaDiaria) * 100)}%
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  vibrar(15);
                  setIsAIOpen(true);
                }}
                className="px-3 py-1.5 flex items-center gap-1.5 transition-all bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-lg"
              >
                <RainbowAIIcon size={18} />
                <span className="text-[11px] font-semibold tracking-wider text-gray-700 dark:text-gray-300">
                  AI Assist
                </span>
              </motion.button>
              
              <div className="w-px h-3 bg-gray-200 dark:bg-gray-800 mx-1" />

              <button
                onClick={() => {
                  vibrar(10);
                  setIsDarkMode(!isDarkMode);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-all"
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              <button
                onClick={() => {
                  vibrar(10);
                  setIsMenuOpen(true);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-all"
              >
                <MoreHorizontal size={15} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-32 relative scroll-smooth overflow-x-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direcao}>
            <motion.div
              key={tabAtual}
              custom={direcao}
              variants={{
                enter: (direcao: number) => ({
                  x: direcao > 0 ? 300 : direcao < 0 ? -300 : 0,
                  opacity: 0,
                  filter: "blur(10px)",
                }),
                center: {
                  x: 0,
                  opacity: 1,
                  filter: "blur(0px)",
                },
                exit: (direcao: number) => ({
                  x: direcao > 0 ? -300 : direcao < 0 ? 300 : 0,
                  opacity: 0,
                  filter: "blur(10px)",
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 400, damping: 35 },
                opacity: { duration: 0.2 },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => {
                const threshold = 80;
                const tabs: ("resumo" | "adicionar" | "historico")[] = [
                  "resumo",
                  "adicionar",
                  "historico",
                ];
                const currentIndex = tabs.indexOf(tabAtual);

                if (
                  info.offset.x < -threshold &&
                  currentIndex < tabs.length - 1
                ) {
                  setDirecao(1);
                  setTabAtual(tabs[currentIndex + 1]);
                } else if (info.offset.x > threshold && currentIndex > 0) {
                  setDirecao(-1);
                  setTabAtual(tabs[currentIndex - 1]);
                }
              }}
              className="w-full min-h-full touch-pan-y"
            >
              {tabAtual === "resumo" && (
                <div className="p-3 space-y-5">
                  {/* Card Principal: Balanço de Lucro Real */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-neutral-200/60 dark:border-white/10 transition-all hover:shadow-md relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity whitespace-nowrap">
                      <TrendingUp
                        size={64}
                        strokeWidth={1}
                        className="transform translate-x-4 -translate-y-4"
                      />
                    </div>
                    <div className="relative z-10 w-full">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 text-[10px] font-semibold uppercase tracking-widest block mb-0.5">
                            Balanço Geral
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium capitalize">
                            Referente a {new Date().toLocaleString("pt-BR", { month: "long" })}
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${lucroMes >= 0 ? "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}
                        >
                          {lucroMes >= 0 ? <ArrowUpRight size={10} strokeWidth={3} /> : <ArrowDownRight size={10} strokeWidth={3} />}
                          {lucroMes >= 0 ? "Lucro" : "Prejuízo"}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center mb-4 mt-2">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">Saldo Líquido</span>
                        <span
                          className={`text-3xl sm:text-4xl font-light tracking-tighter display-font text-center ${lucroMes < 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}
                        >
                          {formatarMoeda(lucroMes)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center items-center">
                          <div className="flex items-center gap-1.5 mb-2 text-green-600 dark:text-green-500">
                            <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-md">
                              <ArrowUpRight size={14} strokeWidth={3} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              Entradas
                            </span>
                          </div>
                          <span className="text-lg sm:text-xl font-semibold tracking-tight display-font text-gray-800 dark:text-gray-100">
                            {formatarMoeda(resumoMes.receitas)}
                          </span>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center items-center relative">
                          <div className="flex items-center gap-1.5 mb-2 text-red-500 dark:text-red-400">
                            <div className="bg-red-100 dark:bg-red-900/30 p-1 rounded-md">
                              <ArrowDownRight size={14} strokeWidth={3} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              Saídas
                            </span>
                          </div>
                          <span className="text-lg sm:text-xl font-semibold tracking-tight display-font text-gray-800 dark:text-gray-100">
                            {formatarMoeda(resumoMes.despesas)}
                          </span>
                          {totalCustosFixos > 0 && (
                            <div className="absolute -bottom-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                              Fixos: {formatarMoeda(totalCustosFixos)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-primary-50/50 dark:bg-primary-900/10 p-3.5 rounded-2xl border border-primary-100/50 dark:border-primary-900/20 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp size={14} className="text-primary-500" strokeWidth={2.5} />
                            <span className="text-primary-600 dark:text-primary-400 text-[10px] font-bold uppercase tracking-widest">
                              Projeção Mensal
                            </span>
                          </div>
                          <span className="text-[10px] text-primary-500/70 font-medium tracking-wide">Estimativa baseada em {new Date().getDate()} dias</span>
                        </div>
                        <span className="text-xl font-semibold tracking-tight text-primary-700 dark:text-primary-300 display-font">
                          {formatarMoeda(projecaoMensal)}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.12 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-neutral-200/60 dark:border-white/10"
                  >
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center">
                          <PieChartIcon size={20} />
                       </div>
                       <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 tracking-tight">Regra de Ouro (50/30/20)</h3>
                    </div>
                    
                    <div className="space-y-4">
                       <div>
                         <div className="flex justify-between items-end mb-1">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Essencial (50%)</span>
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatarMoeda(resumoMes.receitas * 0.5)}</span>
                         </div>
                         <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner">
                            <div className="bg-primary-500 h-full rounded-full" style={{ width: '50%' }}></div>
                         </div>
                       </div>
                       
                       <div>
                         <div className="flex justify-between items-end mb-1">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Livre (30%)</span>
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatarMoeda(resumoMes.receitas * 0.3)}</span>
                         </div>
                         <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner">
                            <div className="bg-purple-500 h-full rounded-full" style={{ width: '30%' }}></div>
                         </div>
                       </div>

                       <div>
                         <div className="flex justify-between items-end mb-1">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Reserva (20%)</span>
                            <span className="text-sm font-bold text-green-600 dark:text-green-500">{formatarMoeda(resumoMes.receitas * 0.2)}</span>
                         </div>
                         <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner">
                            <div className="bg-green-500 h-full rounded-full" style={{ width: '20%' }}></div>
                         </div>
                       </div>
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-2">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/10 text-orange-500 rounded-xl flex items-center justify-center">
                            <Target size={20} />
                          </div>
                          <button
                            onClick={() => {
                              setTempMeta(String(metaDiaria));
                              setIsEditingMeta(true);
                            }}
                            className="p-2 -mr-2 text-gray-300 hover:text-primary-500 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                        <span className="text-gray-400 text-[11px] font-semibold  tracking-wider block mb-1">
                          Atingimento
                        </span>
                      </div>
                      <div>
                        <span className="text-xl font-light text-gray-900 dark:text-white display-font block mb-3">
                          {Math.min(
                            Math.round((ganhoHoje / metaDiaria) * 100),
                            100,
                          )}
                          %
                        </span>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min((ganhoHoje / metaDiaria) * 100, 100)}%`,
                            }}
                            className="h-full bg-orange-500 rounded-full"
                          />
                        </div>
                      </div>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/10 text-primary-500 rounded-xl flex items-center justify-center mb-4">
                          <LineChart size={20} />
                        </div>
                        <span className="text-gray-400 text-[11px] font-semibold  tracking-wider block mb-1">
                          Ritmo Médio
                        </span>
                      </div>
                      <span className="text-xl font-light text-primary-600 dark:text-primary-400 display-font block mt-auto pt-4">
                        {formatarMoeda(mediaDiaria).replace("R$", "")}
                      </span>
                    </motion.div>
                  </div>

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
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-gray-500  tracking-wider group-hover:text-primary-500 transition-colors">
                          Onde está gastando (Mês)
                        </h3>
                      </div>
                      <BarChart3 size={16} className="text-gray-400" />
                    </div>

                    <div className="flex flex-col gap-3">
                      {topCategorias.length > 0 && (
                        <div className="w-full h-28 outline-none focus:outline-none">
                          <ResponsiveContainer
                            width="100%"
                            height="100%"
                            className="outline-none"
                          >
                            <BarChart
                              data={topCategorias}
                              layout="vertical"
                              margin={{ left: -10, right: 30 }}
                            >
                              <defs>
                                <linearGradient id="barBlue" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#3B82F6" />
                                  <stop offset="100%" stopColor="#60A5FA" />
                                </linearGradient>
                                <linearGradient id="barRed" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#EF4444" />
                                  <stop offset="100%" stopColor="#F87171" />
                                </linearGradient>
                                <linearGradient id="barGreen" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#10B981" />
                                  <stop offset="100%" stopColor="#34D399" />
                                </linearGradient>
                                <linearGradient id="barYellow" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#F59E0B" />
                                  <stop offset="100%" stopColor="#FBBF24" />
                                </linearGradient>
                                <linearGradient id="barPurple" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#8B5CF6" />
                                  <stop offset="100%" stopColor="#A78BFA" />
                                </linearGradient>
                              </defs>
                              <XAxis type="number" hide />
                              <YAxis
                                dataKey="nome"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                  fontSize: 10,
                                  fontWeight: 500,
                                  fill: "#9CA3AF",
                                }}
                                width={80}
                              />
                              <ReTooltip
                                cursor={{ fill: "transparent" }}
                                content={
                                  <CustomTooltip isDarkMode={isDarkMode} />
                                }
                              />
                              <Bar
                                dataKey="valor"
                                radius={[0, 12, 12, 0]}
                                barSize={24}
                                isAnimationActive={true}
                                animationDuration={1500}
                                animationBegin={200}
                              >
                                {topCategorias.map((_, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      [
                                        "url(#barBlue)",
                                        "url(#barRed)",
                                        "url(#barGreen)",
                                        "url(#barYellow)",
                                        "url(#barPurple)",
                                      ][index % 5]
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2 mt-2">
                        {topCategorias.length === 0 ? (
                          <div className="py-3 text-center bg-gray-50 dark:bg-gray-800/30 rounded-xl">
                            <p className="text-xs font-semibold text-gray-400  tracking-widest">
                              Nenhuma despesa este mês
                            </p>
                          </div>
                        ) : (
                          topCategorias.map((cat, index) => (
                            <div
                              key={cat.id}
                              className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${["bg-primary-500", "bg-red-500", "bg-green-500", "bg-orange-500"][index % 4]}`}
                                  />
                                  <span className="text-xs font-semibold  tracking-wider text-gray-700 dark:text-gray-300">
                                    {cat.nome}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-red-500 display-font">
                                  {formatarMoeda(cat.valor)}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${cat.pct}%` }}
                                  className={`h-full rounded-full ${["bg-primary-500", "bg-red-500", "bg-green-500", "bg-orange-500"][index % 4]}`}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
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

                  {/* Ações Rápidas */}
                  <div>
                     <h3 className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase mb-3 px-1">Ações Rápidas</h3>
                     <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => {
                             vibrar(15);
                             setTransacaoEmEdicao(null);
                             setTabAtual("adicionar");
                             // Ideally we would prefill "Combustível", but without changing add screen state we just route to it for now
                          }}
                          className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-neutral-200/60 dark:border-white/10 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md hover:-translate-y-0.5"
                        >
                           <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center mb-2 shadow-inner">
                             <Droplet size={16} />
                           </div>
                           <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Gasolina</span>
                        </button>
                        <button
                          onClick={() => {
                             vibrar(15);
                             setTransacaoEmEdicao(null);
                             setTabAtual("adicionar");
                          }}
                          className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-neutral-200/60 dark:border-white/10 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md hover:-translate-y-0.5"
                        >
                           <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 flex items-center justify-center mb-2 shadow-inner">
                             <Coffee size={16} />
                           </div>
                           <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Refeição</span>
                        </button>
                        <button
                          onClick={() => {
                             vibrar(15);
                             setTransacaoEmEdicao(null);
                             setTabAtual("adicionar");
                          }}
                          className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-neutral-200/60 dark:border-white/10 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md hover:-translate-y-0.5"
                        >
                           <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center mb-2 shadow-inner">
                             <Wrench size={16} />
                           </div>
                           <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Manutenção</span>
                        </button>
                        <button
                          onClick={() => {
                             vibrar(15);
                             setTransacaoEmEdicao(null);
                             setTabAtual("adicionar");
                          }}
                          className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-neutral-200/60 dark:border-white/10 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md hover:-translate-y-0.5"
                        >
                           <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center mb-2 shadow-inner">
                             <Car size={16} />
                           </div>
                           <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Corridas</span>
                        </button>
                     </div>
                  </div>

                  {/* Balanços Rápidos */}
                  <div className="grid grid-cols-2 gap-2">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-neutral-200/60 dark:border-white/10 shadow-md flex flex-col justify-between"
                    >
                      <span className="text-[11px] font-semibold text-gray-400  tracking-wider block mb-4">
                        Mês Atual
                      </span>
                      <div>
                        <div className="text-xl font-light text-primary-600 dark:text-primary-400 display-font">
                          {formatarMoeda(
                            resumoMes.receitas - resumoMes.despesas,
                          )}
                        </div>
                        <div className="text-xs font-medium text-gray-400  tracking-widest mt-2 block">
                          Bruto: {formatarMoeda(resumoMes.receitas)}
                        </div>
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100/50 dark:border-gray-800/50 shadow-sm flex flex-col justify-between"
                    >
                      <span className="text-[11px] font-semibold text-gray-400  tracking-wider block mb-4">
                        Mês Anterior
                      </span>
                      <div>
                        <div className="text-xl font-light text-gray-500 dark:text-gray-400 display-font">
                          {formatarMoeda(
                            resumoMesPassado.receitas -
                              resumoMesPassado.despesas,
                          )}
                        </div>
                        <div className="text-xs font-medium text-gray-400  tracking-widest mt-2 block">
                          Bruto: {formatarMoeda(resumoMesPassado.receitas)}
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Fluxo de Caixa (7 Dias) e Receita por Fonte */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-semibold text-gray-500  tracking-wider">
                          Fluxo (7 Dias)
                        </h3>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary-500 rounded-full" />
                            <span className="text-[11px] font-medium text-gray-400 ">
                              Ganhos
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-400 rounded-full" />
                            <span className="text-[11px] font-medium text-gray-400 ">
                              Gastos
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="h-32 w-full outline-none focus:outline-none">
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          className="outline-none"
                        >
                          <AreaChart
                            data={dadosGrafico.dias}
                            margin={{
                              top: 10,
                              right: 10,
                              left: -20,
                              bottom: 0,
                            }}
                          >
                            <defs>
                              <linearGradient
                                id="colorRec"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#2563EB"
                                  stopOpacity={0.6}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#3B82F6"
                                  stopOpacity={0.05}
                                />
                              </linearGradient>
                              <linearGradient
                                id="colorDesp"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#DC2626"
                                  stopOpacity={0.6}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#EF4444"
                                  stopOpacity={0.05}
                                />
                              </linearGradient>
                              <linearGradient
                                id="colorLucro"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#10B981"
                                  stopOpacity={0.6}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#10B981"
                                  stopOpacity={0.05}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="4 4"
                              vertical={false}
                              strokeOpacity={isDarkMode ? 0.1 : 0.4}
                              stroke={isDarkMode ? "#ffffff" : "#cbd5e1"}
                            />
                            <XAxis
                              dataKey="diaSemana"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fontSize: 10,
                                fontWeight: 500,
                                fill: "#9CA3AF",
                              }}
                              dy={15}
                            />
                            <YAxis hide />
                            <ReTooltip
                              content={
                                <CustomTooltip isDarkMode={isDarkMode} />
                              }
                            />
                            <Area
                              type="natural"
                              dataKey="receitas"
                              stroke="#2563EB"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorRec)"
                              name="Receitas"
                              isAnimationActive={true}
                              animationDuration={1200}
                              activeDot={{ r: 6, strokeWidth: 0, fill: '#2563EB' }}
                            />
                            <Area
                              type="natural"
                              dataKey="despesas"
                              stroke="#DC2626"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorDesp)"
                              name="Despesas"
                              isAnimationActive={true}
                              animationDuration={1200}
                              activeDot={{ r: 6, strokeWidth: 0, fill: '#DC2626' }}
                            />
                            <Area
                              type="natural"
                              dataKey="lucro"
                              stroke="#10B981"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorLucro)"
                              name="Lucro Líquido"
                              isAnimationActive={true}
                              animationDuration={1200}
                              activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }}
                            />
                          </AreaChart>
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
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-gray-500  tracking-wider group-hover:text-green-500 transition-colors">
                            Por Fonte
                          </h3>
                        </div>
                        <ListIcon size={16} className="text-gray-400 group-hover:text-green-500 transition-colors" />
                      </div>
                      <div className="h-32 w-full outline-none focus:outline-none">
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          className="outline-none"
                        >
                          <PieChart>
                            <defs>
                              <linearGradient id="pie1" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#2563EB" />
                                <stop offset="100%" stopColor="#60A5FA" />
                              </linearGradient>
                              <linearGradient id="pie2" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#059669" />
                                <stop offset="100%" stopColor="#34D399" />
                              </linearGradient>
                              <linearGradient id="pie3" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#D97706" />
                                <stop offset="100%" stopColor="#FBBF24" />
                              </linearGradient>
                              <linearGradient id="pie4" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#7C3AED" />
                                <stop offset="100%" stopColor="#A78BFA" />
                              </linearGradient>
                            </defs>
                            <Pie
                              data={receitaPorFonte}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={50}
                              paddingAngle={6}
                              dataKey="valor"
                              isAnimationActive={true}
                              animationDuration={1500}
                              stroke="none"
                              cornerRadius={4}
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
                    </motion.div>
                  </div>

                  {/* Metas Cumpridas - Gráfico de Barras */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.22 }}
                    className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-semibold text-gray-500  tracking-wider">
                        Atingimento de Meta
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary-500 rounded-full" />
                        <span className="text-[11px] font-medium text-gray-400  tracking-widest">
                          Meta: {formatarMoeda(metaDiaria)}
                        </span>
                      </div>
                    </div>
                    <div className="h-32 w-full outline-none focus:outline-none">
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
                          <XAxis
                            dataKey="dia"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 10,
                              fontWeight: 500,
                              fill: "#9CA3AF",
                            }}
                            dy={15}
                          />
                          <YAxis hide />
                          <ReTooltip
                            content={<CustomTooltip isDarkMode={isDarkMode} />}
                            cursor={{
                              fill: isDarkMode ? "#1F2937" : "#F9FAFB",
                              radius: 12,
                            }}
                          />
                          <ReferenceLine
                            y={metaDiaria}
                            stroke={isDarkMode ? "#374151" : "#D1D5DB"}
                            strokeDasharray="3 3"
                            strokeWidth={2}
                          />
                          <Bar
                            dataKey="valor"
                            radius={[8, 8, 0, 0]}
                            barSize={24}
                            isAnimationActive={true}
                            animationBegin={100}
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
              )}

              {tabAtual === "adicionar" && (
                <div className="h-full p-3">
                  <FormularioLancamento
                    aoSalvar={salvarTransacao}
                    isDarkMode={isDarkMode}
                    edicao={transacaoEmEdicao}
                    vibrar={vibrar}
                  />
                </div>
              )}
              {tabAtual === "historico" && (
                <div className="p-3 space-y-6">
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
                      <div key={grupo.id} className="space-y-3">
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
                          {grupo.transacoes.map((t) => (
                            <div
                              key={t.id}
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
                                    <p className="text-[13px] font-semibold truncate text-gray-900 dark:text-gray-100">
                                      {t.descricao || "Geral"}
                                    </p>
                                    {t.custoFixo && (
                                      <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                        Fixo
                                      </span>
                                    )}
                                    {t.tags && t.tags.length > 0 && t.tags.map(tag => (
                                      <span key={tag} className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-500 tracking-widest mt-0.5 flex gap-1.5 items-center">
                                    <span>{getNomeCategoria(t)}</span>
                                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></span>
                                    <span>{formatarDataBR(t.data)}</span>
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
              )}
            </motion.div>
          </AnimatePresence>
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
          {isDespesasModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
              onClick={() => setIsDespesasModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl relative border border-gray-100 dark:border-gray-800 max-h-[85vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md pt-1 pb-3 z-10 border-b border-gray-100 dark:border-gray-800/60">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                       <BarChart3 size={20} className="text-primary-500" />
                       Todas as Despesas
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Neste mês</p>
                  </div>
                  <button
                    onClick={() => setIsDespesasModalOpen(false)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {todasCategoriasGastos.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm font-medium">
                      Nenhuma despesa registrada.
                    </div>
                  ) : (
                    todasCategoriasGastos.map((cat, index) => (
                      <div key={cat.id} className="bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors">
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
              </motion.div>
            </motion.div>
          )}

          {isReceitasModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
              onClick={() => setIsReceitasModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl relative border border-gray-100 dark:border-gray-800 max-h-[85vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md pt-1 pb-3 z-10 border-b border-gray-100 dark:border-gray-800/60">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                       <PieChartIcon size={20} className="text-green-500" />
                       Fontes de Receita
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Neste mês</p>
                  </div>
                  <button
                    onClick={() => setIsReceitasModalOpen(false)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {receitaPorFonte.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm font-medium">
                      Nenhuma receita registrada.
                    </div>
                  ) : (
                    receitaPorFonte.map((fonte, index) => (
                      <div key={fonte.id} className="bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors">
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
                           <p className="text-sm font-bold text-green-500">{formatarMoeda(fonte.valor)}</p>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3"
              onClick={() => setIsMenuOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-900 w-full max-w-xs rounded-xl p-3 shadow-lg relative border dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="absolute top-4 right-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-full border dark:border-gray-700"
                >
                  <X size={18} />
                </button>
                <h2 className="font-medium mb-4 text-lg">Configurações</h2>
                
                <div className="mb-6 space-y-3">
                   <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Cor do Tema</h3>
                   <div className="flex justify-between gap-2">
                     <button onClick={() => setCorTema("blue")} className={`w-full py-2 rounded-xl border flex items-center justify-center transition-colors ${corTema === "blue" ? "bg-primary-100 border-primary-500 dark:bg-primary-900/30" : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#3b82f6" }}></div>
                     </button>
                     <button onClick={() => setCorTema("purple")} className={`w-full py-2 rounded-xl border flex items-center justify-center transition-colors ${corTema === "purple" ? "bg-primary-100 border-primary-500 dark:bg-primary-900/30" : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#a855f7" }}></div>
                     </button>
                     <button onClick={() => setCorTema("green")} className={`w-full py-2 rounded-xl border flex items-center justify-center transition-colors ${corTema === "green" ? "bg-primary-100 border-primary-500 dark:bg-primary-900/30" : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#22c55e" }}></div>
                     </button>
                     <button onClick={() => setCorTema("orange")} className={`w-full py-2 rounded-xl border flex items-center justify-center transition-colors ${corTema === "orange" ? "bg-primary-100 border-primary-500 dark:bg-primary-900/30" : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#f97316" }}></div>
                     </button>
                   </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Dados e Backup</h3>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(transacoes)], {
                        type: "application/json",
                      });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `backup_${getLocalISODate()}.json`;
                      a.click();
                      setIsMenuOpen(false);
                      mostrarToast("Backup concluído");
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium border border-gray-100 dark:border-gray-700"
                  >
                    <Download size={18} className="text-primary-500" /> Salvar
                    Backup
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium border border-gray-100 dark:border-gray-700"
                  >
                    <Upload size={18} className="text-green-500" /> Restaurar
                    Backup
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        exportarCSV();
                        setIsMenuOpen(false);
                        mostrarToast("Planilha CSV exportada!");
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium border border-gray-100 dark:border-gray-700"
                  >
                    <FileText size={18} className="text-purple-500" /> Exportar para CSV
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        gerarRelatorioPDF();
                        setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium border border-gray-100 dark:border-gray-700"
                  >
                    <FileText size={18} className="text-primary-500" /> Relatório Profissional (PDF)
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        if (confirm("Você tem certeza que deseja deletar TODAS as transações? Isso não pode ser desfeito.")) {
                            setTransacoes([]);
                            setIsMenuOpen(false);
                            mostrarToast("Todos os dados foram apagados.", "sucesso");
                        }
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 mt-4"
                  >
                    <Trash2 size={18} /> Limpar Todos os Dados
                  </motion.button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const data = JSON.parse(ev.target?.result as string);
                          setTransacoes(
                            Array.isArray(data)
                              ? data.map(higienizarTransacao)
                              : [],
                          );
                          mostrarToast("Dados restaurados");
                        } catch {
                          mostrarToast("Erro no arquivo", "erro");
                        }
                        setIsMenuOpen(false);
                      };
                      reader.readAsText(file);
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAIOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[250] flex items-center justify-center p-3 bg-black/60 backdrop-blur-md"
              onClick={() => setIsAIOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                className="bg-white dark:bg-gray-950 w-full max-w-2xl rounded-xl overflow-hidden flex flex-col h-[90vh] shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] border dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 bg-gradient-to-br from-primary-700 via-indigo-800 to-primary-900 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10 animate-pulse scale-150 rotate-12">
                    <RainbowAIIcon size={120} />
                  </div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                          <RainbowAIIcon size={20} />
                        </div>
                        <span className="text-[11px] font-medium  tracking-normal text-primary-100">
                          Consultoria Nativa
                        </span>
                      </div>
                      <button
                        onClick={() => setIsAIOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tighter mb-1 leading-none italic">
                          MeuCaixa
                        </h2>
                        <p className="text-[11px] font-medium text-primary-200  tracking-widest">
                          Sua inteligência financeira offline
                        </p>
                      </div>

                      <div className="flex bg-white/10 backdrop-blur-xl p-1 rounded-xl border border-white/10">
                        <button
                          onClick={() => setActiveAIView("insights")}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-medium  tracking-widest transition-all ${activeAIView === "insights" ? "bg-white text-primary-600" : "text-primary-100"}`}
                        >
                          Insights
                        </button>
                        <button
                          onClick={() => setActiveAIView("chat")}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-medium  tracking-widest transition-all ${activeAIView === "chat" ? "bg-white text-primary-600" : "text-primary-100"}`}
                        >
                          Chat
                        </button>
                        <button
                          onClick={() => setActiveAIView("settings")}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-medium  tracking-widest transition-all ${activeAIView === "settings" ? "bg-white text-primary-600" : "text-primary-100"}`}
                        >
                          <Settings size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="flex-1 overflow-y-auto p-3 space-y-6 bg-gray-50/50 dark:bg-gray-950 no-scrollbar"
                  ref={chatContainerRef}
                >
                  {activeAIView === "insights" ? (
                    <>
                      <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-primary-50 dark:border-primary-900/20 shadow-md shadow-primary-500/5 mb-2 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl group-hover:bg-primary-500/10 transition-all" />
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                            <Zap
                              size={24}
                              strokeWidth={3}
                              className="animate-pulse"
                            />
                          </div>
                          <div>
                            <p className="text-[11px] font-medium  tracking-widest text-primary-600/60 dark:text-primary-400/60 mb-0.5">
                              Diagnóstico
                            </p>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white  tracking-tight">
                              Visão Estratégica
                            </h3>
                          </div>
                        </div>
                        <p className="text-[13px] font-medium text-gray-600 dark:text-gray-300 leading-relaxed italic border-l-4 border-primary-500 pl-4 py-1">
                          "Sistema operacional estável. Iniciei a varredura
                          profunda em {transacoesMes.length} transações.
                          Encontrei padrões de rentabilidade que exigem sua
                          atenção imediata."
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {insights.map((insight, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 + idx * 0.1 }}
                            className={`p-3 rounded-[2.2rem] border-2 relative overflow-hidden group shadow-sm ${
                              insight.tipo === "alerta"
                                ? "bg-red-50/30 dark:bg-red-900/10 border-red-100/50 dark:border-red-900/20"
                                : insight.tipo === "sucesso"
                                  ? "bg-green-50/30 dark:bg-green-900/10 border-green-100/50 dark:border-green-900/20"
                                  : insight.tipo === "dica"
                                    ? "bg-yellow-50/30 dark:bg-yellow-900/10 border-yellow-100/50 dark:border-yellow-900/20"
                                    : insight.tipo === "financeiro"
                                      ? "bg-purple-50/30 dark:bg-purple-900/10 border-purple-100/50 dark:border-purple-900/20"
                                      : "bg-primary-50/30 dark:bg-primary-900/10 border-primary-100/50 dark:border-primary-900/20"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                                  insight.tipo === "alerta"
                                    ? "bg-red-500 text-white shadow-red-500/20"
                                    : insight.tipo === "sucesso"
                                      ? "bg-green-600 text-white shadow-green-600/20"
                                      : insight.tipo === "dica"
                                        ? "bg-yellow-600 text-white shadow-yellow-600/20"
                                        : insight.tipo === "financeiro"
                                          ? "bg-purple-600 text-white shadow-purple-600/20"
                                          : "bg-primary-600 text-white shadow-primary-600/20"
                                }`}
                              >
                                {insight.tipo === "alerta" && (
                                  <AlertTriangle size={22} strokeWidth={2.5} />
                                )}
                                {insight.tipo === "sucesso" && (
                                  <CheckCircle2 size={22} strokeWidth={2.5} />
                                )}
                                {insight.tipo === "dica" && (
                                  <Lightbulb size={22} strokeWidth={2.5} />
                                )}
                                {insight.tipo === "financeiro" && (
                                  <Wallet size={22} strokeWidth={2.5} />
                                )}
                                {insight.tipo === "info" && (
                                  <Zap size={22} strokeWidth={2.5} />
                                )}
                              </div>

                              <div className="flex-1">
                                <h4
                                  className={`text-xs font-medium  tracking-normal mb-1.5 ${
                                    insight.tipo === "alerta"
                                      ? "text-red-700 dark:text-red-400"
                                      : insight.tipo === "sucesso"
                                        ? "text-green-700 dark:text-green-400"
                                        : insight.tipo === "dica"
                                          ? "text-yellow-700 dark:text-yellow-400"
                                          : insight.tipo === "financeiro"
                                            ? "text-purple-700 dark:text-purple-400"
                                            : "text-primary-700 dark:text-primary-400"
                                  }`}
                                >
                                  {insight.titulo}
                                </h4>
                                <p className="text-[12px] font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                                  {insight.mensagem}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <button
                        onClick={async () => {
                          mostrarToast("Recalculando padrões diagnósticos...", "info" as any);
                          try {
                            const novos = await gerarInsightsNativos(
                              transacoes,
                              metaDiaria,
                              CATEGORIAS_RECEITA,
                              CATEGORIAS_DESPESA,
                              configAI,
                            );
                            setInsights(novos);
                            mostrarToast("Padrões diagnósticos atualizados!");
                          } catch (error) {
                            console.error(error);
                            mostrarToast("Erro ao processar.", "erro");
                          }
                        }}
                        className="w-full py-3 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center gap-2 text-xs font-medium  tracking-normal text-primary-600 dark:text-primary-400 border-2 border-primary-100 dark:border-primary-900/30 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all shadow-lg shadow-primary-500/5 group"
                      >
                        <RefreshCcw
                          size={18}
                          className="group-active:rotate-180 transition-transform duration-700"
                        />{" "}
                        Sincronizar Novos Dados
                      </button>
                    </>
                  ) : activeAIView === "chat" ? (
                    <div className="flex flex-col gap-3 min-h-full">
                      {chatMessages.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                          <motion.div
                            animate={{
                              scale: [1, 1.1, 1],
                              rotate: [0, 5, -5, 0],
                            }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="w-24 h-24 bg-gradient-to-tr from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/40 mb-4"
                          >
                            <RainbowAIIcon size={50} />
                          </motion.div>
                          <h3 className="text-lg font-medium dark:text-white mb-3  tracking-tight">
                            Assistente Financeiro
                          </h3>
                          <p className="text-xs font-medium text-gray-400 leading-relaxed  tracking-normal max-w-[280px]">
                            Pronto para análise situacional. Faça perguntas em texto
                            para diagnósticos financeiros em tempo real.
                          </p>

                          <div className="mt-8 flex flex-wrap justify-center gap-2">
                            <SugestaoPergunta texto="Quanto gastei com combustível?" />
                            <SugestaoPergunta texto="Dicas para economizar" />
                            <SugestaoPergunta texto="Minha meta atual" />
                          </div>
                        </div>
                      )}

                      {chatMessages.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{
                            opacity: 0,
                            x: msg.role === "user" ? 20 : -20,
                            scale: 0.9,
                          }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[85%] p-3 rounded-xl text-[12px] font-medium leading-relaxed shadow-md ${
                              msg.role === "user"
                                ? "bg-primary-600 text-white rounded-tr-none shadow-primary-600/10"
                                : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-tl-none shadow-gray-200/5"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2 opacity-50">
                              {msg.role === "assistant" && (
                                <div className="flex gap-1.5 items-center">
                                  {msg.sentiment === "positivo" && (
                                    <Smile
                                      size={12}
                                      className="text-green-500"
                                    />
                                  )}
                                  {msg.sentiment === "negativo" && (
                                    <Frown size={12} className="text-red-500" />
                                  )}
                                  {msg.sentiment === "neutro" && (
                                    <Meh size={12} className="text-gray-400" />
                                  )}
                                  <span className="text-xs  font-medium tracking-widest">
                                    MeuCaixa Assistant
                                  </span>
                                </div>
                              )}
                              {msg.role === "user" && (
                                <span className="text-xs  font-medium tracking-widest">
                                  Operador
                                </span>
                              )}
                            </div>
                            <div className="markdown-body text-[12px]">
                              <Markdown>{msg.content}</Markdown>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {isAIThinking && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex gap-2 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-xl w-fit"
                        >
                          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <h3 className="text-[11px] font-medium  tracking-normal text-gray-400 px-2">
                          Nível de Detalhe
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              "resumido",
                              "padrao",
                              "detalhado",
                            ] as NivelDetalheAI[]
                          ).map((nivel) => (
                            <button
                              key={nivel}
                              onClick={() =>
                                setConfigAI({
                                  ...configAI,
                                  nivelDetalhe: nivel,
                                })
                              }
                              className={`py-3 rounded-xl text-xs font-medium  tracking-widest border transition-all ${configAI.nivelDetalhe === nivel ? "bg-primary-600 text-white border-primary-600" : "bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800"}`}
                            >
                              {nivel}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-[11px] font-medium  tracking-normal text-gray-400 px-2 mb-4">
                          Preferências de Foco
                        </h3>
                        <button
                          onClick={() =>
                            setConfigAI({
                              ...configAI,
                              focarEmGanhos: !configAI.focarEmGanhos,
                            })
                          }
                          className="w-full p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${configAI.focarEmGanhos ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}
                            >
                              <TrendingUp size={16} />
                            </div>
                            <span className="text-[11px] font-medium  tracking-widest text-gray-600 dark:text-gray-400">
                              Priorizar Ganhos
                            </span>
                          </div>
                          {configAI.focarEmGanhos ? (
                            <ToggleRight className="text-primary-600" size={24} />
                          ) : (
                            <ToggleLeft className="text-gray-300" size={24} />
                          )}
                        </button>

                        <button
                          onClick={() => {
                            vibrar(15);
                            setConfigAI({
                              ...configAI,
                              focarEmGastos: !configAI.focarEmGastos,
                            });
                          }}
                          className="w-full p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${configAI.focarEmGastos ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}
                            >
                              <AlertTriangle size={16} />
                            </div>
                            <span className="text-[11px] font-medium  tracking-widest text-gray-600 dark:text-gray-400">
                              Priorizar Despesas
                            </span>
                          </div>
                          {configAI.focarEmGastos ? (
                            <ToggleRight className="text-primary-600" size={24} />
                          ) : (
                            <ToggleLeft className="text-gray-300" size={24} />
                          )}
                        </button>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-2 space-y-2">
                          <h3 className="text-[11px] font-medium  tracking-normal text-gray-400 px-2 mb-2">
                            Interface Sensorial
                          </h3>

                          <button
                            onClick={() => {
                              vibrar(20);
                              setConfigAI({
                                ...configAI,
                                hapticosAtivos: !configAI.hapticosAtivos,
                              });
                            }}
                            className="w-full p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${configAI.hapticosAtivos ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}
                              >
                                <Activity size={16} />
                              </div>
                              <span className="text-[11px] font-medium  tracking-widest text-gray-600 dark:text-gray-400">
                                Feedback Tátil
                              </span>
                            </div>
                            {configAI.hapticosAtivos ? (
                              <ToggleRight
                                className="text-primary-600"
                                size={24}
                              />
                            ) : (
                              <ToggleLeft className="text-gray-300" size={24} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-900/20">
                        <p className="text-[11px] font-medium text-primary-600 dark:text-primary-400 leading-relaxed text-center">
                          Estas configurações são aplicadas instantaneamente e
                          alteram a profundidade e o tom das análises geradas
                          pelo Assistente.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {activeAIView === "chat" && (
                  <div className="p-3 bg-white dark:bg-gray-950 border-t dark:border-gray-900">
                    <div className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-[1.8rem] border border-gray-100 dark:border-gray-800 focus-within:border-primary-500/50 transition-colors">
                      <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendToAI()}
                        placeholder="Diga algo como 'Qual minha meta hoje?'"
                        className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-medium px-3 dark:text-white placeholder:text-gray-400"
                      />
                      <button
                        onClick={handleSendToAI}
                        className="w-10 h-10 bg-primary-600 text-white rounded-[1.2rem] flex items-center justify-center hover:scale-[1.05] active:scale-95 transition-all shadow-lg shadow-primary-600/20"
                      >
                        <Send size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-white dark:bg-gray-950 border-t dark:border-gray-900 flex justify-between items-center px-8">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-primary-500"></div>
                    <div className="w-1 h-1 rounded-full bg-primary-500 opacity-50"></div>
                    <div className="w-1 h-1 rounded-full bg-primary-500 opacity-20"></div>
                  </div>
                  <p className="text-[11px] font-medium text-gray-300 dark:text-gray-800  tracking-normal">
                    Motor Financeiro Local v2.0
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FormularioLancamento({
  aoSalvar,
  isDarkMode,
  edicao,
  vibrar,
}: {
  aoSalvar: (n: any) => void;
  isDarkMode: boolean;
  edicao: Transacao | null;
  vibrar: (ms?: number | number[]) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lerRecibo = async (file: File) => {
    try {
      setProcessandoRecibo(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
             alert("Chave do Gemini não configurada!");
             setProcessandoRecibo(false);
             return;
          }
          const ai = new GoogleGenAI({ apiKey });
          
          const prompt = `Analise este recibo ou nota fiscal e extraia os seguintes dados em JSON puro, sem formatação markdown:
{
  "valor": <number>, 
  "descricao": "<string>", 
  "data": "<YYYY-MM-DD>"
}`;

          const response = await ai.models.generateContent({
             model: "gemini-3-flash-preview",
             contents: {
               parts: [
                 { inlineData: { data: base64Data, mimeType: file.type } },
                 { text: prompt }
               ]
             },
             config: { responseMimeType: "application/json" }
          });
          
          if (response.text) {
             const json = JSON.parse(response.text);
             if (json.valor) setValor(json.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
             if (json.descricao) setDesc(json.descricao.substring(0, 50));
             if (json.data && /^\d{4}-\d{2}-\d{2}$/.test(json.data)) setData(json.data);
          }
        } catch (e) {
          console.error("Erro ao ler recibo:", e);
        } finally {
          setProcessandoRecibo(false);
        }
      };
      reader.readAsDataURL(file);
    } catch(e) {
      setProcessandoRecibo(false);
    }
  };

  const formatCurrencyEntry = (v: string) => {
    const n = v.replace(/\D/g, "");
    return (Number(n) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    });
  };

  const handleSalvar = () => {
    const valorNumerico = Number(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(valorNumerico) || valorNumerico <= 0) return;
    if (!cat) return;

    // Fallback para descrição baseado na categoria se estiver vazia
    const descricaoFinal =
      desc.trim() ||
      (tipo === "receita"
        ? CATEGORIAS_RECEITA.find((c) => c.id === cat)?.nome
        : CATEGORIAS_DESPESA.find((c) => c.id === cat)?.nome) ||
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
  };

  return (
    <div className="h-full flex flex-col pb-4 max-w-sm mx-auto">
      <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl mb-4 shadow-inner">
        <button
          onClick={() => setTipo("receita")}
          className={`flex-1 py-3 text-xs font-semibold tracking-wider rounded-xl transition-all duration-300 ${tipo === "receita" ? "bg-white dark:bg-gray-700 text-green-600 shadow-sm" : "text-gray-500"}`}
        >
          Entrada
        </button>
        <button
          onClick={() => setTipo("despesa")}
          className={`flex-1 py-3 text-xs font-semibold tracking-wider rounded-xl transition-all duration-300 ${tipo === "despesa" ? "bg-white dark:bg-gray-700 text-red-500 shadow-sm" : "text-gray-500"}`}
        >
          Saída
        </button>
      </div>

      <div className="text-center mb-4">
        <span className="text-xs font-medium text-gray-500  tracking-widest">
          Valor do Lançamento
        </span>
        <div className="flex items-center justify-center mt-2 group">
          <span className="text-xl font-light mr-2 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-primary-500 display-font">
            R$
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(formatCurrencyEntry(e.target.value))}
            placeholder="0,00"
            className={`text-xl font-light bg-transparent outline-none text-center w-full max-w-[280px] transition-all tracking-tighter display-font ${tipo === "receita" ? "text-green-600" : "text-red-500"}`}
          />
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {[10, 50, 100].map((v) => (
            <button
              key={v}
              onClick={() =>
                setValor(
                  v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
                )
              }
              className="px-5 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 transition-colors"
            >
              + {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {(tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map(
          (c) => (
            <motion.button
              key={c.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCat(c.id)}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-[1.25rem] transition-all duration-300 ${cat === c.id ? (tipo === "receita" ? "bg-green-600 text-white shadow-lg shadow-green-600/30" : "bg-red-500 text-white shadow-lg shadow-red-500/30") : "bg-gray-50 dark:bg-gray-900 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                <c.icone size={22} strokeWidth={2} />
              </div>
              <span
                className={`text-[11px] font-medium tracking-wide transition-colors text-center leading-none ${cat === c.id ? (tipo === "receita" ? "text-green-600" : "text-red-500") : "text-gray-500"}`}
              >
                {c.nome}
              </span>
            </motion.button>
          ),
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl relative cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-all border border-transparent dark:border-gray-800"
          onClick={() => setShowCalendar(true)}
        >
          <span className="text-[11px] font-medium text-gray-500  tracking-wider block mb-1">
            Data
          </span>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-800 dark:text-gray-200">
            <CalendarIcon size={16} className="text-primary-500" />{" "}
            {formatarDataBR(data)}
          </div>
        </motion.div>

        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:ring-2 ring-primary-500/20 transition-all border border-transparent dark:border-gray-800">
          <span className="text-[11px] font-medium text-gray-500  tracking-wider block mb-1">
            Descrição
          </span>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Opcional"
            className="bg-transparent outline-none text-sm font-semibold w-full placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-800 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-semibold text-gray-400  tracking-wider mb-2 block uppercase">Tags (Centros de Custo)</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag, i) => (
             <span key={i} className="bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1 font-medium">
                #{tag}
                <button onClick={() => setTags(tags.filter((_, idx) => idx !== i))} className="hover:text-primary-900 dark:hover:text-primary-100 ml-1">
                   <Plus size={12} className="rotate-45" />
                </button>
             </span>
          ))}
        </div>
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
                 }
                 setTagInput("");
              }
           }}
           placeholder="Ex: ferias, carro, nubank (pressione Enter)"
           className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-medium text-sm focus:ring-4 ring-primary-500/10 border border-gray-100 dark:border-gray-800 transition-all text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {tipo === "despesa" && (
        <div className="flex items-center justify-between mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-transparent dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Custo Fixo Recorrente</span>
          </div>
          <button
            onClick={() => setCustoFixo(!custoFixo)}
            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${custoFixo ? "bg-primary-500" : "bg-gray-300 dark:bg-gray-700"}`}
          >
            <motion.div
              animate={{ x: custoFixo ? 16 : 0 }}
              className="w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </button>
        </div>
      )}

      <div className="flex items-center justify-center mb-4">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={(e) => e.target.files && e.target.files[0] ? lerRecibo(e.target.files[0]) : null} 
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={processandoRecibo}
          className="flex items-center justify-center gap-2 p-3 w-full border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
        >
          {processandoRecibo ? (
            <Loader2 size={18} className="animate-spin text-primary-500" />
          ) : (
            <Camera size={18} className="text-primary-500" />
          )}
          {processandoRecibo ? "Analisando com IA..." : "Escanear Nota / Recibo"}
        </motion.button>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        disabled={!valor || !cat}
        onClick={() => {
          vibrar(25);
          handleSalvar();
        }}
        className={`w-full py-3 text-white rounded-xl font-semibold tracking-wide text-sm transition-all flex items-center justify-center gap-2 mt-auto ${!valor || !cat ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed" : "bg-primary-600 shadow-lg shadow-primary-600/30 hover:bg-primary-700"}`}
      >
        {edicao ? (
          <Pencil size={18} strokeWidth={2.5} />
        ) : (
          <CheckCircle2 size={18} strokeWidth={2.5} />
        )}
        {edicao ? "Atualizar" : "Confirmar Lançamento"}
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
