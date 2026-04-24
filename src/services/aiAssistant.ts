import { GoogleGenAI, Type } from "@google/genai";
import { Transacao, Categoria, ConfiguracaoAI } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

export function analisarSentimento(texto: string): APSentiment {
  const palavrasPositivas = ["bom", "ótimo", "excelente", "feliz", "ganhei", "lucro", "meta", "sucesso", "fácil", "ajuda", "obrigado"];
  const palavrasNegativas = ["ruim", "difícil", "perda", "prejuízo", "triste", "erro", "problema", "caro", "gasto", "baixo", "alerta", "socorro"];
  const lower = texto.toLowerCase();
  let score = 0;
  palavrasPositivas.forEach((p) => { if (lower.includes(p)) score++; });
  palavrasNegativas.forEach((p) => { if (lower.includes(p)) score--; });
  if (score > 0) return "positivo";
  if (score < 0) return "negativo";
  return "neutro";
}

function truncateString(str: string, num: number) {
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + '...';
}

function buildTransactionContext(transacoes: Transacao[], limit: number = 30) {
  const recentes = transacoes.slice(0, limit);
  const totaisMes = transacoes.filter(t => t.data.startsWith(new Date().toISOString().slice(0, 7))).reduce(
    (acc, t) => {
      if (t.tipo === 'receita') acc.receitas += t.valor;
      else acc.despesas += t.valor;
      return acc;
    },
    { receitas: 0, despesas: 0 }
  );
  
  return `
Resumo do mês atual:
Receitas: R$ ${totaisMes.receitas.toFixed(2)}
Despesas: R$ ${totaisMes.despesas.toFixed(2)}

Últimas transações (até ${limit}):
${recentes.map(t => `- ${t.data}: [${t.tipo.toUpperCase()}] ${t.categoria} - R$ ${t.valor.toFixed(2)} (${truncateString(t.descricao, 20)})`).join('\n')}
`;
}

export async function responderChat(
  mensagem: string,
  transacoes: Transacao[],
  metaDiaria: number,
  config: ConfiguracaoAI,
  historico: AIChatMessage[] = [],
): Promise<AIChatMessage> {
  const userContext = buildTransactionContext(transacoes);

  let systemInstruction = `Você é um assistente financeiro de IA para um motorista de aplicativo.
Sua personalidade é ${config.tomVoz}. 
O nível de detalhe da sua resposta deve ser ${config.nivelDetalhe}.
Foque em ${config.focarEmGanhos ? 'maximizar ganhos' : ''} ${config.focarEmGastos ? 'e reduzir custos' : ''}.

A meta diária do motorista é: R$ ${metaDiaria.toFixed(2)}.
Aqui está o contexto das finanças dele:
${userContext}

Responda diretamente à pergunta do usuário orientando sobre as finanças dele, sem marcadores longos e apenas com o texto da resposta.`;

  try {
    const chat = ai.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    let messageToSend = mensagem;

    // Enviar as mensagens do histórico na ordem em que ocorreram
    for (const histMsg of historico) {
      await chat.sendMessage({ message: histMsg.content });
    }
    
    const response = await chat.sendMessage({ message: messageToSend });
    
    return {
      role: "assistant",
      content: response.text || "Não entendi.",
      sentiment: analisarSentimento(response.text || ""),
    };
  } catch (error) {
    console.error("Erro na API Gemini:", error);
    return {
      role: "assistant",
      content: "Desculpe, meu servidor de IA encontrou um problema técnico. Tente novamente mais tarde.",
      sentiment: "neutro",
    };
  }
}

export async function gerarInsightsNativos(
  transacoes: Transacao[],
  metaDiaria: number,
  categoriasReceita: Categoria[],
  categoriasDespesa: Categoria[],
  config: ConfiguracaoAI,
): Promise<AIInsight[]> {
  const userContext = buildTransactionContext(transacoes, 50);

  const prompt = `Analise os seguintes dados financeiros de um motorista de aplicativo e extraia insights super relevantes e poderosos (no máximo 5).
Os insights devem ser diretos ao ponto, observando o comportamento financeiro atual e o mês do motorista.
Nível de detalhe: ${config.nivelDetalhe}.
Foco: ${config.focarEmGanhos ? 'Ganhos' : ''} ${config.focarEmGastos ? 'Gastos' : ''}.

Retorne ESTRITAMENTE em formato JSON que obedeça a este schema de array:
[
  {
    "tipo": "alerta",
    "titulo": "Título",
    "mensagem": "Mensagem detalhada.",
    "prioridade": 1
  }
]
Os tipos permitidos são: alerta, sucesso, info, dica, financeiro.
A prioridade é um número de 1 a 5, onde 1 é a maior prioridade.

Dados Financeiros Atuais:
Meta Diária Almejada: R$ ${metaDiaria.toFixed(2)}
${userContext}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              tipo: { type: Type.STRING, description: "alerta, sucesso, info, dica, ou financeiro" },
              titulo: { type: Type.STRING },
              mensagem: { type: Type.STRING },
              prioridade: { type: Type.INTEGER },
            },
            required: ["tipo", "titulo", "mensagem", "prioridade"],
          },
        },
      },
    });

    const jsonStr = response.text?.trim() || "[]";
    let parsed: AIInsight[] = JSON.parse(jsonStr);
    
    parsed = parsed.map(p => ({
      ...p,
      tipo: (["alerta", "sucesso", "info", "dica", "financeiro"].includes(p.tipo) ? p.tipo : "info") as AIInsight["tipo"]
    }));

    return parsed.sort((a,b) => a.prioridade - b.prioridade).slice(0, 5);

  } catch (error) {
    console.error("Erro ao gerar insights Gemini API:", error);
    return fallbackInsightsNativos(transacoes, metaDiaria, categoriasReceita, categoriasDespesa, config);
  }
}

function fallbackInsightsNativos(transacoes: Transacao[], metaDiaria: number, categoriasReceita: Categoria[], categoriasDespesa: Categoria[], config: ConfiguracaoAI): AIInsight[] {
  let insights: AIInsight[] = [];
  const hoje = new Date().toISOString().split("T")[0];
  const transacoesMes = transacoes.filter((t) => t.data.startsWith(hoje.slice(0, 7)));
  const ganhosMes = transacoesMes.filter((t) => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
  const gastosMes = transacoesMes.filter((t) => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
  const lucroMes = ganhosMes - gastosMes;
  const margemBruta = (lucroMes / (ganhosMes || 1)) * 100;

  if (margemBruta > 40) {
    insights.push({ tipo: "sucesso", titulo: "Alto Poder de Poupança", mensagem: `Você manteve ${margemBruta.toFixed(1)}% das suas receitas este mês.`, prioridade: 1 });
  } else if (margemBruta < 10 && ganhosMes > 1000) {
    insights.push({ tipo: "alerta", titulo: "Orçamento Estrangulado", mensagem: `Sua margem de sobra caiu para ${margemBruta.toFixed(1)}%.`, prioridade: 1 });
  }
  return insights.length ? insights : [{ tipo: "info", titulo: "IA Padrão Carregada", mensagem: "A IA está carregando.", prioridade: 5 }];
}
