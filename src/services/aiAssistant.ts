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

// Analisador de Sentimento aprimorado com mais léxico
export function analisarSentimento(texto: string): APSentiment {
  const palavrasPositivas = ["bom", "ótimo", "excelente", "feliz", "ganhei", "lucro", "meta", "sucesso", "fácil", "ajuda", "obrigado", "top", "show", "consegui", "atingi", "parabéns", "valeu", "melhor", "cresceu", "subiu"];
  const palavrasNegativas = ["ruim", "difícil", "perda", "prejuízo", "triste", "erro", "problema", "caro", "gasto", "baixo", "alerta", "socorro", "mal", "péssimo", "chato", "difícil", "cansativo", "parado", "caiu", "descendo"];
  const lower = texto.toLowerCase();
  let score = 0;
  palavrasPositivas.forEach((p) => { if (lower.includes(p)) score += 1.5; });
  palavrasNegativas.forEach((p) => { if (lower.includes(p)) score -= 1.5; });
  
  if (score > 1) return "positivo";
  if (score < -1) return "negativo";
  return "neutro";
}

// Helpers internos para análise de inteligência nativa
const filterByDays = (transacoes: Transacao[], days: number) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return transacoes.filter(t => new Date(t.data) >= cutoff);
};

const sumByType = (transacoes: Transacao[], tipo: 'receita' | 'despesa') => 
  transacoes.filter(t => t.tipo === tipo).reduce((acc, t) => acc + t.valor, 0);

export async function responderChat(
  mensagem: string,
  transacoes: Transacao[],
  metaDiaria: number,
  config: ConfiguracaoAI,
  historico: AIChatMessage[] = [],
): Promise<AIChatMessage> {
  const lowerMsg = mensagem.toLowerCase();
  const has = (words: string[]) => words.some(w => lowerMsg.includes(w));

  // Dados para inteligência contextual
  const hojeStr = new Date().toISOString().split("T")[0];
  const hoje = transacoes.filter(t => t.data === hojeStr);
  const ganhosHoje = sumByType(hoje, 'receita');
  
  const ultimos7Dias = filterByDays(transacoes, 7);
  const ganhos7Dias = sumByType(ultimos7Dias, 'receita');
  
  const semanaPassada = transacoes.filter(t => {
    const d = new Date(t.data);
    const start = new Date();
    start.setDate(start.getDate() - 14);
    const end = new Date();
    end.setDate(end.getDate() - 7);
    return d >= start && d < end;
  });
  const ganhosSemanaPassada = sumByType(semanaPassada, 'receita');

  let resposta = "";
  let sentimento: APSentiment = analisarSentimento(mensagem);

  // Lógica de Saudação Inteligente
  if (has(["oi", "olá", "bom dia", "boa tarde", "boa noite", "e aí"])) {
    const period = new Date().getHours() < 12 ? "um bom dia" : new Date().getHours() < 18 ? "uma boa tarde" : "uma boa noite";
    resposta = `Olá! Te desejo ${period}. Sou seu parceiro de estrada digital. Como foi o movimento hoje? Se quiser, posso analisar seu lucro ou te dar umas dicas de economia!`;
  } 
  else if (has(["quem é você", "o que você faz", "como funciona"])) {
    resposta = "Eu sou o assistente nativo do MeuCaixa! Eu analiso seus registros de corridas e gastos em tempo real para calcular seu lucro líquido e te ajudar a bater suas metas sem depender de servidores externos. Sou rápido, privado e focado no seu bolso!";
  }
  else if (has(["cansado", "difícil", "ruim", "parado"])) {
    resposta = "Poxa, entendo perfeitamente. Tem dias que o asfalto não colabora. Às vezes é melhor dar uma pausa, esticar as pernas e esperar o próximo pico de demanda. Quer que eu veja se seu lucro acumulado da semana permite uma folga mais cedo?";
    sentimento = "negativo";
  }
  // Análise de Apps (Uber vs 99)
  else if (has(["uber", "99", "indrive", "app", "aplicativo"])) {
    const uber = transacoes.filter(t => t.categoria === "uber").reduce((a, b) => a + b.valor, 0);
    const novanove = transacoes.filter(t => t.categoria === "99").reduce((a, b) => a + b.valor, 0);
    
    if (uber === 0 && novanove === 0) {
      resposta = "Ainda não tenho registros de faturamento por app. Você costuma rodar mais em qual deles?";
    } else if (uber > novanove) {
      resposta = `Pelo que vi, a Uber é sua maior fonte hoje (R$ ${uber.toFixed(2)}). A 99 está com R$ ${novanove.toFixed(2)}. Vale a pena testar a 99 em horários de dinâmica baixa na Uber!`;
    } else {
      resposta = `A 99 está rendendo mais (R$ ${novanove.toFixed(2)}) comparado à Uber (R$ ${uber.toFixed(2)}). Já pensou em focar as metas de bônus nela esta semana?`;
    }
    sentimento = "neutro";
  }
  // Análise de Ganhos e Tendências
  else if (has(["ganhei", "faturamento", "receita", "dinheiro", "total"])) {
    if (ganhos7Dias > ganhosSemanaPassada && ganhosSemanaPassada > 0) {
      const cresc = ((ganhos7Dias / ganhosSemanaPassada - 1) * 100).toFixed(1);
      resposta = `Boas notícias! Seus ganhos subiram ${cresc}% em relação à semana passada (R$ ${ganhos7Dias.toFixed(2)} vs R$ ${ganhosSemanaPassada.toFixed(2)}). O que você mudou na sua rotina?`;
      sentimento = "positivo";
    } else {
      resposta = `Nesta última semana você faturou R$ ${ganhos7Dias.toFixed(2)}. Hoje o saldo está em R$ ${ganhosHoje.toFixed(2)}. Como está o movimento na sua região?`;
      sentimento = "neutro";
    }
  }
  // Análise de Despesas (Combustível/Mecânica)
  else if (has(["gasto", "despesa", "custo", "combustível", "gasolina", "oficina", "manutenção"])) {
    const topDespesa = transacoes
      .filter(t => t.tipo === "despesa")
      .reduce((prev, curr) => (prev.valor > curr.valor ? prev : curr), { categoria: "nenhuma", valor: 0 });
    
    if (topDespesa.valor > 0) {
      resposta = `Seu maior custo registrado recentemente foi em '${topDespesa.categoria}' (R$ ${topDespesa.valor.toFixed(2)}). Sabia que pequenas economias no combustível podem aumentar seu lucro em até 15% no fim do mês?`;
    } else {
      resposta = "Você ainda não lançou despesas. Lembrar de anotar até o café ajuda a ter um lucro real no fim do dia!";
    }
    sentimento = "neutro";
  }
  // Análise de Metas
  else if (has(["meta", "diária", "falta", "atingi", "objetivo"])) {
    const falta = metaDiaria - ganhosHoje;
    if (falta > 0) {
      const horasRestantes = 24 - new Date().getHours();
      resposta = `Faltam R$ ${falta.toFixed(2)} para sua meta de R$ ${metaDiaria.toFixed(2)}. Você ainda tem ${horasRestantes} horas no dia. Se fizer uma média de R$ 25/hora, você bate a meta rapidinho!`;
    } else {
      resposta = `Meta batida com sucesso! Parabéns pelos R$ ${ganhosHoje.toFixed(2)}. Vai continuar rodando para fazer um extra ou vai descansar?`;
      sentimento = "positivo";
    }
  }
  // Dicas de Estratégia
  else if (has(["dica", "conselho", "ajuda", "estratégia", "economizar"])) {
    const estrategias = [
      "Tente rodar em horários de saída de faculdade ou entrada de empresas, a demanda é mais constante.",
      "Mantenha os pneus calibrados, isso economiza até 5% de combustível.",
      "Abasteça sempre no mesmo posto de confiança e use programas de fidelidade/cashback.",
      "Não 'persiga' o dinâmico. Muitas vezes o gasto de combustível não compensa o deslocamento.",
      "Foque em avaliações 5 estrelas; passageiros satisfeitos podem gerar gorjetas que fazem a diferença!"
    ];
    resposta = estrategias[Math.floor(Math.random() * estrategias.length)];
    sentimento = "positivo";
  }
  // Inteligência de Fallback Dinâmico
  else {
    const randomFollowUp = [
      "Como está o movimento hoje? Uber ou 99 estão tocando mais?",
      "Teve algum gasto inesperado com o carro ultimamente?",
      "Qual sua meta para o fim de semana?",
      "Quer que eu analise seus ganhos da última semana?"
    ];
    resposta = `Ainda estou aprendendo sobre sua rotina, mas posso te ajudar com cálculos de lucro, metas e análise de apps. ${randomFollowUp[Math.floor(Math.random() * randomFollowUp.length)]}`;
  }

  const intro = "";
  const final = config.nivelDetalhe === "detalhado" ? " Espero que isso te ajude a tomar a melhor decisão!" : "";

  await new Promise(r => setTimeout(r, 700));

  return {
    role: "assistant",
    content: `${intro}${resposta}${final}`,
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
      mensagem: `Sua margem de lucro está em ${margem.toFixed(1)}%. Você está operando com custos muito baixos, parabéns!`, 
      prioridade: 1 
    });
  } else if (margem < 20 && ganhosMes > 500) {
    insights.push({ 
      tipo: "alerta", 
      titulo: "Alerta de Margem Baixa", 
      mensagem: `Você está ficando com apenas ${margem.toFixed(1)}% do que ganha. Revise os custos fixos ou o consumo do carro.`, 
      prioridade: 1 
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
