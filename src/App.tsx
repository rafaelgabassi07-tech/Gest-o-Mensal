import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
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
} from "recharts";

import {
  TipoTransacao,
  Transacao,
  Categoria,
  SemanaAgrupada,
  ConfiguracaoAI,
  NivelDetalheAI,
  TomVozAI,
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

const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
};

const formatarDataBR = (dataStr: string): string => {
  const [ano, mes, dia] = dataStr.split("-");
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
});

// --- Config ---
const CATEGORIAS_LEGADO: Record<string, any> = {
  uber: Car,
  "99": Car,
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
  { id: "salario", nome: "Salário", icone: Briefcase },
  { id: "freelance", nome: "Freelance", icone: Smartphone },
  { id: "rendimentos", nome: "Rendimentos", icone: TrendingUp },
  { id: "vendas", nome: "Vendas", icone: ShoppingBag },
  { id: "presente", nome: "Presente", icone: Gift },
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
  if (colorStr.includes('Green') || colorStr.includes('pie2') || colorStr.includes('Atingido') && !colorStr.includes('NaoAtingido')) return '#10B981';
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
export default function App() {
  const [tabAtual, setTabAtual] = useState<
    "resumo" | "adicionar" | "historico"
  >("resumo");
  const [direcao, setDirecao] = useState(0);
  const [transacoes, setTransacoes] = useState<Transacao[]>(() =>
    getInitialData(),
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
      tomVoz: "amigavel",
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
      className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-full text-xs font-medium  tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all shrink-0"
    >
      {texto}
    </button>
  );

  useEffect(() => {
    if (isAIOpen) {
      const novosInsights = gerarInsightsNativos(
        transacoes,
        metaDiaria,
        CATEGORIAS_RECEITA,
        CATEGORIAS_DESPESA,
        configAI,
      );
      setInsights(novosInsights);
      if (novosInsights.some((i) => i.tipo === "alerta")) vibrar([50, 50, 50]);
    }
  }, [isAIOpen, transacoes, metaDiaria, configAI]);

  const toastRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("@MeuCaixa:theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
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
      mostrarToast("Registo atualizado");
    } else {
      setTransacoes((prev) => [higienizarTransacao(nova), ...prev]);
      mostrarToast("Registo salvo");
    }
    setTransacaoEmEdicao(null);
    setTabAtual("resumo");
  };

  const exportarCSV = () => {
    try {
      const cabecalho = [
        "Data",
        "Tipo",
        "Categoria",
        "Descricao",
        "Valor",
      ].join(";");
      const linhas = transacoes.map((t) =>
        [
          t.data,
          t.tipo === "receita" ? "Entrada" : "Saida",
          (t.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).find(
            (c) => c.id === t.categoria,
          )?.nome || t.categoria,
          t.descricao.replace(/;/g, ","),
          t.valor.toFixed(2).replace(".", ","),
        ].join(";"),
      );

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
        if (t.tipo === "receita") diaGrafico.receitas += valor;
        else diaGrafico.despesas += valor;
      }
    });

    const topCat = Object.entries(catGastos)
      .map(([id, valor]) => ({
        id,
        valor,
        nome: CATEGORIAS_DESPESA.find((c) => c.id === id)?.nome || "Outros",
        pct: (valor / (rMes.despesas || 1)) * 100,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 3);

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
    return {
      saldoTotal: total,
      resumoMes: rMes,
      resumoMesPassado: rMesPassado,
      ganhoHoje: gHoje,
      topCategorias: topCat,
      receitaPorFonte: rFonte,
      mediaDiaria: media,
      projecaoMensal: projecao,
      metaFulfillment,
      lucroMes: rMes.receitas - rMes.despesas,
      transacoesMes: tMes,
      dadosGrafico: { dias, maxValor: Math.ceil(maxV / 50) * 50 },
    };
  }, [transacoes, metaDiaria]);

  const historicoAgrupado = useMemo(() => {
    const grupos: Record<string, SemanaAgrupada> = {};

    // Filtrar transações
    let transacoesProcessar = transacoes.filter((t) => {
      const matchTipo = filtroTipo === "todos" || t.tipo === filtroTipo;
      const matchDesc =
        t.descricao.toLowerCase().includes(buscaDescricao.toLowerCase()) ||
        (t.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA)
          .find((c) => c.id === t.categoria)
          ?.nome.toLowerCase()
          .includes(buscaDescricao.toLowerCase());
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

  return (
    <div className={isDarkMode ? "dark" : ""}>
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
                    Meu<span className="text-blue-500">Caixa</span>
                  </h1>
                  <span className="text-[9px] font-medium text-gray-500 tracking-widest shrink-0">
                    PRO
                  </span>
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
                  <BrainCircuit size={16} className="text-blue-500" />
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
              <div className="flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 py-1.5 px-1 sm:px-2.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg text-center overflow-hidden">
                <span className="text-[9px] sm:text-[10px] font-semibold text-blue-600/70 uppercase tracking-wider mb-0.5 sm:mb-0">Mês</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 truncate w-full max-w-full">
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
                <BrainCircuit size={16} className="text-blue-500" />
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
                    className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity whitespace-nowrap">
                      <TrendingUp
                        size={80}
                        strokeWidth={1}
                        className="transform translate-x-8 -translate-y-8"
                      />
                    </div>
                    <div className="relative z-10 w-full">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold  tracking-wider">
                          Balanço Mensal
                        </span>
                        <div
                          className={`px-3 py-1 rounded-full text-[11px] font-medium  tracking-widest ${lucroMes >= 0 ? "bg-green-50 text-green-600 dark:bg-green-900/20" : "bg-red-50 text-red-600 dark:bg-red-900/20"}`}
                        >
                          {lucroMes >= 0 ? "Lucro" : "Prejuízo"}
                        </div>
                      </div>
                      <div className="mb-4">
                        <span
                          className={`text-xl font-light tracking-tighter display-font block ${lucroMes < 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}
                        >
                          {formatarMoeda(lucroMes)}
                        </span>
                        <p className="text-xs font-medium text-gray-400 mt-2">
                          Referente a{" "}
                          {new Date().toLocaleString("pt-BR", {
                            month: "long",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-6 border-t border-gray-100 dark:border-gray-800/60">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1 text-green-600 dark:text-green-500/80">
                            <ArrowUpRight size={16} strokeWidth={3} />
                            <span className="text-[11px] font-semibold  tracking-widest">
                              Entradas
                            </span>
                          </div>
                          <span className="text-2xl font-semibold tracking-tight display-font">
                            {formatarMoeda(resumoMes.receitas)}
                          </span>
                        </div>
                        <div className="w-px h-12 bg-gray-100 dark:bg-gray-800" />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1 text-red-500 dark:text-red-500/80">
                            <ArrowDownRight size={16} strokeWidth={3} />
                            <span className="text-[11px] font-semibold  tracking-widest">
                              Saídas
                            </span>
                          </div>
                          <span className="text-2xl font-semibold tracking-tight display-font">
                            {formatarMoeda(resumoMes.despesas)}
                          </span>
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
                            className="p-2 -mr-2 text-gray-300 hover:text-blue-500 transition-colors"
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
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/10 text-blue-500 rounded-xl flex items-center justify-center mb-4">
                          <LineChart size={20} />
                        </div>
                        <span className="text-gray-400 text-[11px] font-semibold  tracking-wider block mb-1">
                          Ritmo Médio
                        </span>
                      </div>
                      <span className="text-xl font-light text-blue-600 dark:text-blue-400 display-font block mt-auto pt-4">
                        {formatarMoeda(mediaDiaria).replace("R$", "")}
                      </span>
                    </motion.div>
                  </div>

                  {/* Top Gastos - Inteligência de Categoria */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-semibold text-gray-500  tracking-wider">
                        Onde está gastando (Mês)
                      </h3>
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
                                    className={`w-2 h-2 rounded-full ${["bg-blue-500", "bg-red-500", "bg-green-500", "bg-orange-500"][index % 4]}`}
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
                                  className={`h-full rounded-full ${["bg-blue-500", "bg-red-500", "bg-green-500", "bg-orange-500"][index % 4]}`}
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
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
                        onClick={() => setIsEditingMeta(false)}
                      >
                        <motion.div
                          initial={{ scale: 0.9, y: 20 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.9, y: 20 }}
                          className="bg-white dark:bg-gray-900 p-3 rounded-xl w-full max-w-xs border dark:border-gray-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <h3 className="text-[11px] font-medium  text-gray-400 mb-4 tracking-widest">
                            Ajustar Meta Diária
                          </h3>
                          <input
                            type="number"
                            value={tempMeta}
                            onChange={(e) => setTempMeta(e.target.value)}
                            className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-4 font-medium outline-none border dark:border-gray-700"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setIsEditingMeta(false)}
                              className="py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-medium text-xs  tracking-widest"
                            >
                              Sair
                            </button>
                            <button
                              onClick={() => {
                                setMetaDiaria(Number(tempMeta));
                                setIsEditingMeta(false);
                                mostrarToast("Meta atualizada");
                              }}
                              className="py-3 bg-blue-600 text-white rounded-xl font-medium text-xs  tracking-widest border-none"
                            >
                              Salvar
                            </button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Balanços Rápidos */}
                  <div className="grid grid-cols-2 gap-2">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between"
                    >
                      <span className="text-[11px] font-semibold text-gray-400  tracking-wider block mb-4">
                        Mês Atual
                      </span>
                      <div>
                        <div className="text-xl font-light text-blue-600 dark:text-blue-400 display-font">
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
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
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
                            </defs>
                            <CartesianGrid
                              strokeDasharray="6 6"
                              vertical={false}
                              stroke={isDarkMode ? "#1F2937" : "#F3F4F6"}
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
                              type="monotone"
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
                              type="monotone"
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
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.22 }}
                      className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-semibold text-gray-500  tracking-wider">
                          Por Fonte
                        </h3>
                        <ListIcon size={16} className="text-gray-400" />
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
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
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

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="grid grid-cols-1 gap-2"
                  >
                    <div className="bg-blue-600 rounded-xl p-3 text-white shadow-md shadow-blue-600/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp
                          size={60}
                          className="transform translate-x-4 -translate-y-4"
                        />
                      </div>
                      <div className="relative z-10 w-full">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-blue-200 text-xs font-semibold  tracking-wider block">
                            Projeção Mensal
                          </span>
                          <div className="px-3 py-1 bg-white/20 rounded-full text-[11px] font-medium  tracking-widest whitespace-nowrap">
                            Estimado
                          </div>
                        </div>
                        <span className="text-xl font-light tracking-tighter display-font block mb-4">
                          {formatarMoeda(projecaoMensal)}
                        </span>
                        <p className="text-xs text-blue-100 font-medium leading-relaxed max-w-[280px]">
                          Com base no seu ritmo atual, este é o faturamento
                          esperado para o final do mês corrente.
                        </p>
                      </div>
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
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-sm outline-none focus:ring-2 ring-blue-500/10 transition-all font-medium text-gray-800 dark:text-gray-200"
                      />
                      <ListIcon
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        size={16}
                      />
                    </div>
                    <button
                      onClick={exportarCSV}
                      className="bg-white dark:bg-gray-900 px-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-center text-blue-600 shadow-sm hover:bg-gray-50 transition-colors"
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
                                  <p className="text-[13px] font-semibold truncate text-gray-900 dark:text-gray-100">
                                    {t.descricao || "Geral"}
                                  </p>
                                  <p className="text-xs text-gray-500  tracking-widest mt-0.5">
                                    {getNomeCategoria(t)}
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
                                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
              className="absolute -top-8 w-10 h-10 bg-blue-600 rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center text-white border-4 border-white dark:border-gray-950 transition-all"
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
                <h2 className="font-medium mb-4 text-lg">Dados e Backup</h2>
                <div className="space-y-3">
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
                    <Download size={18} className="text-blue-500" /> Salvar
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
                <div className="p-3 bg-gradient-to-br from-blue-700 via-indigo-800 to-blue-900 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-5 animate-pulse scale-150 rotate-12">
                    <BrainCircuit size={150} />
                  </div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                          <Sparkles size={16} className="text-blue-200" />
                        </div>
                        <span className="text-[11px] font-medium  tracking-normal text-blue-100">
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
                          MeuCaixa PRO
                        </h2>
                        <p className="text-[11px] font-medium text-blue-200  tracking-widest">
                          Sua inteligência financeira offline
                        </p>
                      </div>

                      <div className="flex bg-white/10 backdrop-blur-xl p-1 rounded-xl border border-white/10">
                        <button
                          onClick={() => setActiveAIView("insights")}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-medium  tracking-widest transition-all ${activeAIView === "insights" ? "bg-white text-blue-600" : "text-blue-100"}`}
                        >
                          Insights
                        </button>
                        <button
                          onClick={() => setActiveAIView("chat")}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-medium  tracking-widest transition-all ${activeAIView === "chat" ? "bg-white text-blue-600" : "text-blue-100"}`}
                        >
                          Chat
                        </button>
                        <button
                          onClick={() => setActiveAIView("settings")}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-medium  tracking-widest transition-all ${activeAIView === "settings" ? "bg-white text-blue-600" : "text-blue-100"}`}
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
                      <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-blue-50 dark:border-blue-900/20 shadow-md shadow-blue-500/5 mb-2 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Zap
                              size={24}
                              strokeWidth={3}
                              className="animate-pulse"
                            />
                          </div>
                          <div>
                            <p className="text-[11px] font-medium  tracking-widest text-blue-600/60 dark:text-blue-400/60 mb-0.5">
                              Diagnóstico
                            </p>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white  tracking-tight">
                              Visão Estratégica
                            </h3>
                          </div>
                        </div>
                        <p className="text-[13px] font-medium text-gray-600 dark:text-gray-300 leading-relaxed italic border-l-4 border-blue-500 pl-4 py-1">
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
                                      : "bg-blue-50/30 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-900/20"
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
                                          : "bg-blue-600 text-white shadow-blue-600/20"
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
                                            : "text-blue-700 dark:text-blue-400"
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
                        onClick={() => {
                          const novos = gerarInsightsNativos(
                            transacoes,
                            metaDiaria,
                            CATEGORIAS_RECEITA,
                            CATEGORIAS_DESPESA,
                            configAI,
                          );
                          setInsights(novos);
                          mostrarToast("Recalculando padrões diagnósticos...");
                        }}
                        className="w-full py-3 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center gap-2 text-xs font-medium  tracking-normal text-blue-600 dark:text-blue-400 border-2 border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all shadow-lg shadow-blue-500/5 group"
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
                            className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/40 mb-4"
                          >
                            <BrainCircuit size={48} strokeWidth={1.5} />
                          </motion.div>
                          <h3 className="text-lg font-medium dark:text-white mb-3  tracking-tight">
                            Assistente Financeiro
                          </h3>
                          <p className="text-xs font-medium text-gray-400 leading-relaxed  tracking-normal max-w-[280px]">
                            Pronto para análise situacional. Use voz ou texto
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
                                ? "bg-blue-600 text-white rounded-tr-none shadow-blue-600/10"
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
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
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
                              className={`py-3 rounded-xl text-xs font-medium  tracking-widest border transition-all ${configAI.nivelDetalhe === nivel ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800"}`}
                            >
                              {nivel}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-[11px] font-medium  tracking-normal text-gray-400 px-2">
                          Tom de Voz
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          {(["formal", "amigavel", "direto"] as TomVozAI[]).map(
                            (tom) => (
                              <button
                                key={tom}
                                onClick={() =>
                                  setConfigAI({ ...configAI, tomVoz: tom })
                                }
                                className={`py-3 rounded-xl text-xs font-medium  tracking-widest border transition-all ${configAI.tomVoz === tom ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800"}`}
                              >
                                {tom}
                              </button>
                            ),
                          )}
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
                            <ToggleRight className="text-blue-600" size={24} />
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
                            <ToggleRight className="text-blue-600" size={24} />
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
                                className="text-blue-600"
                                size={24}
                              />
                            ) : (
                              <ToggleLeft className="text-gray-300" size={24} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                        <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 leading-relaxed text-center">
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
                    <div className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-[1.8rem] border border-gray-100 dark:border-gray-800 focus-within:border-blue-500/50 transition-colors">
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
                        className="w-10 h-10 bg-blue-600 text-white rounded-[1.2rem] flex items-center justify-center hover:scale-[1.05] active:scale-95 transition-all shadow-lg shadow-blue-600/20"
                      >
                        <Send size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-white dark:bg-gray-950 border-t dark:border-gray-900 flex justify-between items-center px-8">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                    <div className="w-1 h-1 rounded-full bg-blue-500 opacity-50"></div>
                    <div className="w-1 h-1 rounded-full bg-blue-500 opacity-20"></div>
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
  const [showCalendar, setShowCalendar] = useState(false);

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
          <span className="text-xl font-light mr-2 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-blue-500 display-font">
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
            <CalendarIcon size={16} className="text-blue-500" />{" "}
            {formatarDataBR(data)}
          </div>
        </motion.div>

        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:ring-2 ring-blue-500/20 transition-all border border-transparent dark:border-gray-800">
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

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        disabled={!valor || !cat}
        onClick={() => {
          vibrar(25);
          handleSalvar();
        }}
        className={`w-full py-3 text-white rounded-xl font-semibold tracking-wide text-sm transition-all flex items-center justify-center gap-2 mt-auto ${!valor || !cat ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed" : "bg-blue-600 shadow-lg shadow-blue-600/30 hover:bg-blue-700"}`}
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
                className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none font-medium text-sm mb-3 focus:ring-4 ring-blue-500/10 border border-gray-100 dark:border-gray-800 transition-all "
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
