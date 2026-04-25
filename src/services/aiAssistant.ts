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
    const hojeStr = new Date().toISOString().split("T")[0];
    const transacoesHoje = transacoes.filter(t => t.data === hojeStr);
    const ganhosHoje = transacoesHoje.filter(t => t.tipo === "receita").reduce((a, b) => a + b.valor, 0);
    const gastosHoje = transacoesHoje.filter(t => t.tipo === "despesa").reduce((a, b) => a + b.valor, 0);
    const saldoTotal = transacoes.reduce((acc, t) => acc + (t.tipo === "receita" ? t.valor : -t.valor), 0);

    const rs = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historico, mensagem, profile, saldoTotal, ganhosHoje, gastosHoje, metaDiaria, config })
    });
    
    if (!rs.ok) {
        const txt = await rs.text();
        let errorMsg = txt;
        try {
          const json = JSON.parse(txt);
          if (json.error) {
             const nested = JSON.parse(json.error);
             if (nested.error && nested.error.message) errorMsg = nested.error.message;
          }
        } catch(e) {
          try {
             // For cases like {"error": "Chave API do Gemini não configurada..."}
             const json = JSON.parse(txt);
             if (json.error) errorMsg = json.error;
          } catch(e2) {}
        }
        throw new Error(`Erro API: ${errorMsg}`);
    }

    const data = await rs.json();
    const content = data.content;

    return {
      role: "assistant",
      content: content,
      sentiment: analisarSentimento(content)
    };
  } catch (error: any) {
    console.error("Erro no chat:", error);
    const msgFallback = error?.message || String(error);
    if (msgFallback.includes("Chave API do Gemini")) {
      return {
        role: "assistant",
        content: `⚠️ Parei! A sua chave do Gemini configurada nos Secrets está inválida! Vá em "Settings", remova a "GEMINI_API_KEY" para usar a inteligência nativa, ou insira uma chave verdadeira e reinicie o app.`,
        sentiment: "neutro"
      };
    }
    if (msgFallback.includes("API key not valid")) {
      return {
        role: "assistant",
        content: `⚠️ Chave Inválida! A chave da API do Gemini que você colocou nos Secrets não funciona. Remova a chave GEMINI_API_KEY em Settings e use a inteligência padrão do sistema.`,
        sentiment: "neutro"
      };
    }

    return {
      role: "assistant",
      content: `Deu ruim na conexão aqui. Tenta mandar novamente em uns segundos. Detalhe: ${msgFallback}`,
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
