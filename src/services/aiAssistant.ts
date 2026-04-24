import { Transacao, Categoria, ConfiguracaoAI } from "../types";

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
  
  return { totaisMes, recentes };
}

export async function responderChat(
  mensagem: string,
  transacoes: Transacao[],
  metaDiaria: number,
  config: ConfiguracaoAI,
  historico: AIChatMessage[] = [],
): Promise<AIChatMessage> {
  const ctx = buildTransactionContext(transacoes);
  
  const lowerMsg = mensagem.toLowerCase();

  let resposta = "Entendi. Como posso ajudar com suas finanças agora?";
  let sentimento: APSentiment = "neutro";

  if (lowerMsg.includes("combustível") || lowerMsg.includes("gasolina") || lowerMsg.includes("gasto")) {
    const gastosCombustivel = transacoes
      .filter(t => t.tipo === "despesa" && (t.categoria === "combustivel" || t.descricao.toLowerCase().includes("combustivel")))
      .reduce((acc, t) => acc + t.valor, 0);
    resposta = `Você gastou R$ ${gastosCombustivel.toFixed(2)} com combustível recentemente. Fique de olho na eficiência do seu veículo!`;
    sentimento = "info";
  } else if (lowerMsg.includes("lucro") || lowerMsg.includes("ganhei") || lowerMsg.includes("mensal")) {
    const lucro = ctx.totaisMes.receitas - ctx.totaisMes.despesas;
    resposta = `Seu lucro este mês está em R$ ${lucro.toFixed(2)}. (Receitas: R$ ${ctx.totaisMes.receitas.toFixed(2)}, Despesas: R$ ${ctx.totaisMes.despesas.toFixed(2)})`;
    sentimento = lucro > 0 ? "positivo" : "negativo";
  } else if (lowerMsg.includes("meta") || lowerMsg.includes("diária") || lowerMsg.includes("hoje")) {
    const ganhosHoje = transacoes
      .filter(t => t.tipo === "receita" && t.data === new Date().toISOString().split("T")[0])
      .reduce((acc, t) => acc + t.valor, 0);
    const falta = metaDiaria - ganhosHoje;
    if (falta > 0) {
      resposta = `Você já ganhou R$ ${ganhosHoje.toFixed(2)} hoje. Faltam R$ ${falta.toFixed(2)} para bater sua meta de R$ ${metaDiaria.toFixed(2)}!`;
      sentimento = "neutro";
    } else {
      resposta = `Parabéns! Você já ganhou R$ ${ganhosHoje.toFixed(2)} e ultrapassou sua meta diária de R$ ${metaDiaria.toFixed(2)}! 🎉`;
      sentimento = "positivo";
    }
  } else if (lowerMsg.includes("dica") || lowerMsg.includes("economizar")) {
    resposta = `Tente evitar rodar sem passageiros em horários de pouco movimento. Além disso, usar aplicativos de desconto para abastecer sempre ajuda!`;
    sentimento = "positivo";
  }

  // Simulated latency
  await new Promise(r => setTimeout(r, 600));

  return {
    role: "assistant",
    content: resposta,
    sentiment: sentimento,
  };
}

export async function gerarInsightsNativos(
  transacoes: Transacao[],
  metaDiaria: number,
  categoriasReceita: Categoria[],
  categoriasDespesa: Categoria[],
  config: ConfiguracaoAI,
): Promise<AIInsight[]> {
  let insights: AIInsight[] = [];
  const hojeStr = new Date().toISOString().split("T")[0];
  const transacoesMes = transacoes.filter((t) => t.data.startsWith(hojeStr.slice(0, 7)));
  const ganhosMes = transacoesMes.filter((t) => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
  const gastosMes = transacoesMes.filter((t) => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
  const lucroMes = ganhosMes - gastosMes;
  const margemBruta = ganhosMes > 0 ? (lucroMes / ganhosMes) * 100 : 0;

  if (margemBruta > 40) {
    insights.push({ tipo: "sucesso", titulo: "Alto Poder de Poupança", mensagem: `Você manteve ${margemBruta.toFixed(1)}% das suas receitas este mês. Ótimo trabalho de gestão!`, prioridade: 1 });
  } else if (margemBruta < 15 && ganhosMes > 1000) {
    insights.push({ tipo: "alerta", titulo: "Orçamento Estrangulado", mensagem: `Sua margem de sobra caiu para ${margemBruta.toFixed(1)}%. Verifique seus gastos imediatamente.`, prioridade: 1 });
  }

  const gastosCombustivel = transacoesMes
    .filter(t => t.tipo === "despesa" && (t.categoria === "combustivel" || t.categoria === "abastecimento" || t.descricao.toLowerCase().includes("combust")))
    .reduce((occ, t) => occ + t.valor, 0);
  
  if (ganhosMes > 0) {
      const margemCombustivel = (gastosCombustivel / ganhosMes) * 100;
      if (margemCombustivel > 35) {
          insights.push({ tipo: "alerta", titulo: "Alerta de Consumo de Combustível", mensagem: `Seus gastos com combustível estão consumindo ${margemCombustivel.toFixed(1)}% das suas receitas. Considere rever o tipo de trajeto que tem feito.`, prioridade: 2 });
      } else if (margemCombustivel > 0 && margemCombustivel <= 20) {
          insights.push({ tipo: "sucesso", titulo: "Eficiência Veicular", mensagem: `Você está na faixa ideal de custo com combustível (${margemCombustivel.toFixed(1)}% da receita mensalp). Continue com as mesmas rotas eficientes!`, prioridade: 2 });
      }
  }

  const ultimaDespesaAlta = transacoes.find(t => t.tipo === "despesa" && t.valor > 500);
  if (ultimaDespesaAlta && transacoes.indexOf(ultimaDespesaAlta) < 10) {
      insights.push({ tipo: "financeiro", titulo: "Gasto Pontual Alto", mensagem: `Você teve um gasto atípico recente de R$ ${ultimaDespesaAlta.valor.toFixed(2)} (${ultimaDespesaAlta.categoria || ultimaDespesaAlta.descricao}). Tente focar em lucrar nos próximos dias para compensar.`, prioridade: 3 })
  }
  
  const diasTrabalhados = new Set(transacoesMes.map(t => t.data)).size;
  if (diasTrabalhados > 0) {
      const mediaGanho = ganhosMes / diasTrabalhados;
      if (mediaGanho > metaDiaria) {
          insights.push({ tipo: "sucesso", titulo: "Meta Diária Consistente", mensagem: `Sua média de ganhos diários neste mês (R$ ${mediaGanho.toFixed(2)}) está acima da sua meta de R$ ${metaDiaria.toFixed(2)}! Fantástico!`, prioridade: 4 })
      } else {
        insights.push({ tipo: "info", titulo: "Média de Ganhos Abaixo da Meta", mensagem: `Nos dias trabalhados, sua média é R$ ${mediaGanho.toFixed(2)}. Falta um pouco para bater sua meta diária de R$ ${metaDiaria.toFixed(2)} consistentemente.`, prioridade: 4 })
      }
  }

  if (insights.length === 0) {
    insights.push({ tipo: "info", titulo: "Tudo nos Conformees", mensagem: "Seus dados estão sendo analisados. Continue registrando suas viagens para obtermos mais padrões de comportamento financeiro.", prioridade: 5 });
  }

  // Simulated latency
  await new Promise(r => setTimeout(r, 400));

  return insights.sort((a,b) => a.prioridade - b.prioridade).slice(0, 5);
}
