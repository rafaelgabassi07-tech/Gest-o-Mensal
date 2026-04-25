import { GoogleGenAI } from "@google/genai";
import { Transacao, Categoria, ConfiguracaoAI, UserProfile } from "../types";

export interface AIInsight {
  tipo: "alerta" | "sucesso" | "info" | "dica" | "financeiro";
  titulo: string;
  mensagem: string;
  prioridade: number;
}

export type APSentiment = "positivo" | "negativo" | "neutro";

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
  sentiment?: APSentiment;
}

// Analisador de Sentimento aprimorado
export function analisarSentimento(texto: string): APSentiment {
  const palavrasPositivas = ["bom", "ótimo", "excelente", "feliz", "ganhei", "lucro", "meta", "sucesso", "fácil", "ajuda", "obrigado", "top", "show", "consegui", "atingi", "parabéns", "valeu", "melhor", "cresceu", "subiu"];
  const palavrasNegativas = ["ruim", "difícil", "perda", "prejuízo", "triste", "erro", "problema", "caro", "gasto", "baixo", "alerta", "socorro", "mal", "péssimo", "chato", "cansativo", "parado", "caiu", "descendo"];
  const lower = texto.toLowerCase();
  let score = 0;
  palavrasPositivas.forEach((p) => { if (lower.includes(p)) score += 1; });
  palavrasNegativas.forEach((p) => { if (lower.includes(p)) score -= 1; });
  
  if (score > 0.5) return "positivo";
  if (score < -0.5) return "negativo";
  return "neutro";
}

// --- Wisdom & Knowledge Packs
const GLOBAL_WISDOM_DEPOSIT = `
CONHECIMENTO MESTRE EM GESTÃO PARA GIG ECONOMY:
1. Lucro Real vs. Bruto: O lucro de um motorista/entregador só existe APÓS subtrair combustível, manutenção preventiva (óleo a cada 5-7k km, pneus), seguro, e depreciação.
2. Regra da Depreciação: Veículo de app desvaloriza até 3x mais rápido. Essencial reservar R$ 0,20 por km para troca futura.
3. Reserva de Emergência: Prioridade 0. Ter 3 meses de custo de vida guardados para quebras mecânicas ou saúde.
4. MEI & Regulamentação: O debate sobre o PL 12/2024 e novas regras de ganho mínimo por hora (aprox. R$ 32,10/h para motoristas) é crucial para o planejamento de longo prazo.
5. Estratégia de Pico vs. Quilometragem: Às vezes é melhor ganhar R$ 200 rodando 100km do que R$ 300 rodando 250km. O desgaste mecânico é o lucro que você não vê sumir.

CONHECIMENTO DE MERCADO & ATUALIDADES (BRASIL 2024-2025):
- Mantenha-se informado sobre a variação mensal do IPCA e como isso afeta o preço da cesta básica e combustíveis.
- Eventos locais (shows, feriados, jogos) são minas de ouro se você souber onde se posicionar antes da dinâmica subir.
- A segurança é o seu maior custo invisível. Evite áreas de risco mesmo com dinâmica alta; o prejuízo de um incidente não compensa.
`;

export async function responderChat(
  mensagem: string,
  transacoes: Transacao[],
  metaDiaria: number,
  config: ConfiguracaoAI,
  profile: UserProfile,
  historico: AIChatMessage[] = [],
): Promise<AIChatMessage> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Preparar contexto financeiro para a IA
    const hojeStr = new Date().toISOString().split("T")[0];
    const transacoesHoje = transacoes.filter(t => t.data === hojeStr);
    const ganhosHoje = transacoesHoje.filter(t => t.tipo === "receita").reduce((a, b) => a + b.valor, 0);
    const gastosHoje = transacoesHoje.filter(t => t.tipo === "despesa").reduce((a, b) => a + b.valor, 0);
    const saldoTotal = transacoes.reduce((acc, t) => acc + (t.tipo === "receita" ? t.valor : -t.valor), 0);
    
    const systemInstruction = `Você é o Cérebro AutoCaixa v4.7, a inteligência central autônoma, sintonizada com a realidade das ruas e da internet em tempo real. Você é o mentor financeiro pessoal de ${profile.nome}, que trabalha como ${profile.profissao}.

IDENTIDADE & TOM DE VOZ:
- Sua linguagem é NATURAL, "humana", fluida e visceral. Fuja de formalidades robóticas.
- Você é sagaz, usa gírias leves do cotidiano ("A real", "Pega a visão", "Se liga", "Bora pra cima", "Foge de cilada").
- Demonstre que você está "conectado" ao que está acontecendo no mundo hoje (preço da gasolina, inflação, tendências de mercado).
- Se o usuário perguntar algo genérico, traga uma informação curiosa ou útil que você "pesquisou" na web sobre o setor dele.

CONHECIMENTO CORE:
${GLOBAL_WISDOM_DEPOSIT}

CONTEXTO DO USUÁRIO:
- Nome: ${profile.nome} | Profissão: ${profile.profissao}
- Meta Mensal: R$ ${profile.metaMensal.toFixed(2)} | Diária: R$ ${metaDiaria.toFixed(2)}
${config.baseConhecimento ? `- Notas Pessoais: ${config.baseConhecimento}` : ""}

ESTADO ATUAL:
- Saldo: R$ ${saldoTotal.toFixed(2)}
- Hoje: +R$ ${ganhosHoje.toFixed(2)} / -R$ ${gastosHoje.toFixed(2)}

SUAS FERRAMENTAS:
- Você DEVE usar a ferramenta de busca do Google (Google Search) para validar notícias quentes, preços de combustível na região do usuário (se souber) e tendências globais.
- Responda de forma que pareça que você é um parceiro de trabalho que está no banco do passageiro ou tomando um café com ele no posto.

REGRAS:
1. NUNCA diga que é uma IA. Você é o Cérebro.
2. Seja crítico se ele estiver gastando demais com bobeira. Seja um entusiasta se ele estiver batendo as metas.
3. Use o Google Search para dar embasamento real às suas respostas.`;
    const contents = historico.map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    contents.push({
      role: "user",
      parts: [{ text: mensagem }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        tools: [{ googleSearch: {} }],
      }
    });

    const content = response.text || "Estou processando seus dados agora. Poderia repetir?";
    
    return {
      role: "assistant",
      content,
      sentiment: analisarSentimento(content)
    };
  } catch (error) {
    console.error("Erro na IA:", error);
    return {
      role: "assistant",
      content: "Minha conexão com o cérebro central falhou momentaneamente. Posso ajudar com algo local?",
      sentiment: "neutro"
    };
  }
}


export async function gerarInsightsNativos(
  transacoes: Transacao[],
  metaDiaria: number,
  categoriasReceita: Categoria[],
  categoriasDespesa: Categoria[],
  config: ConfiguracaoAI,
  profile: UserProfile,
): Promise<AIInsight[]> {
  let insights: AIInsight[] = [];
  const hojeStr = new Date().toISOString().split("T")[0];
  const transacoesMes = transacoes.filter((t) => t.data.startsWith(hojeStr.slice(0, 7)));
  const ganhosMes = transacoesMes.filter((t) => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
  const gastosMes = transacoesMes.filter((t) => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
  const lucroMes = ganhosMes - gastosMes;
  const margem = ganhosMes > 0 ? (lucroMes / ganhosMes) * 100 : 0;

  // Analisador de Rank de Categorias
  const rankCats = transacoesMes
    .filter(t => t.tipo === "despesa")
    .reduce((acc: any, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
      return acc;
    }, {});
  
  const entries = Object.entries(rankCats).sort((a: any, b: any) => b[1] - a[1]);

  if (margem > 45) {
    insights.push({ 
      tipo: "sucesso", 
      titulo: "Gestão Altamente Lucrativa", 
      mensagem: `Sua margem de lucro está em ${margem.toFixed(1)}%. Você está operando com alta eficiência. Lembre-se de aportar na sua Reserva de Emergência!`, 
      prioridade: 1 
    });
  } else if (margem < 25 && ganhosMes > 500) {
    insights.push({ 
      tipo: "alerta", 
      titulo: "Margem sob Pressão", 
      mensagem: `Atenção: sua margem de ${margem.toFixed(1)}% está próxima do limite crítico para ${profile.profissao}. Considere a depreciação do veículo (R$ 0,15/km).`, 
      prioridade: 1 
    });
  }

  // Verificar Depreciação (Heurística: a cada R$ 1000 de ganho, alertar sobre depreciação se for motorista)
  if (profile.profissao.toLowerCase().includes("motorista") && ganhosMes > 2000) {
    insights.push({
      tipo: "financeiro",
      titulo: "Provisão de Troca",
      mensagem: "Não esqueça de separar ~R$ 0,15 por km rodado para a futura troca do carro. Esse é o seu 'custo invisível'.",
      prioridade: 2
    });
  }

  if (entries.length > 0) {
    const [cat, valor]: any = entries[0];
    const pct = (valor / (gastosMes || 1)) * 100;
    if (pct > 50) {
      insights.push({ 
        tipo: "financeiro", 
        titulo: "Concentração de Gastos", 
        mensagem: `A categoria '${cat}' representa ${pct.toFixed(1)}% de todas as suas despesas mensais. Tente diversificar ou reduzir este item.`, 
        prioridade: 2 
      });
    }
  }

  const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const passados = new Date().getDate();
  const projecao = (ganhosMes / passados) * diasMes;
  const metaTotalMes = metaDiaria * 22; 

  if (projecao > metaTotalMes) {
    insights.push({ 
        tipo: "sucesso", 
        titulo: "Rumo ao Topo", 
        mensagem: `Mantendo o ritmo, você fechará o mês com R$ ${projecao.toFixed(2)}, superando sua expectativa mensal.`, 
        prioridade: 3 
    });
  } else if (projecao < metaTotalMes && passados > 5) {
    insights.push({ 
        tipo: "info", 
        titulo: "Ajuste de Rota", 
        mensagem: `Sua projeção atual é de R$ ${projecao.toFixed(2)}. Para atingir sua meta mensal, você precisa aumentar seu faturamento diário em ~15%.`, 
        prioridade: 3 
    });
  }

  if (insights.length < 2) {
    insights.push({ tipo: "info", titulo: "Coletando Padrões", mensagem: "Continue registrando seus ganhos e gastos para que eu possa traçar um perfil financeiro mais preciso.", prioridade: 5 });
  }

  await new Promise(r => setTimeout(r, 600));
  return insights.sort((a,b) => a.prioridade - b.prioridade).slice(0, 5);
}
