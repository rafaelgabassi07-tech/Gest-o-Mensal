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
  const palavrasPositivas = [
    "bom",
    "ótimo",
    "excelente",
    "feliz",
    "ganhei",
    "lucro",
    "meta",
    "sucesso",
    "fácil",
    "ajuda",
    "obrigado",
  ];
  const palavrasNegativas = [
    "ruim",
    "difícil",
    "perda",
    "prejuízo",
    "triste",
    "erro",
    "problema",
    "caro",
    "gasto",
    "baixo",
    "alerta",
    "socorro",
  ];

  const lower = texto.toLowerCase();
  let score = 0;

  palavrasPositivas.forEach((p) => {
    if (lower.includes(p)) score++;
  });
  palavrasNegativas.forEach((p) => {
    if (lower.includes(p)) score--;
  });

  if (score > 0) return "positivo";
  if (score < 0) return "negativo";
  return "neutro";
}

export async function responderChat(
  mensagem: string,
  transacoes: Transacao[],
  metaDiaria: number,
  config: ConfiguracaoAI,
  historico: AIChatMessage[] = [],
): Promise<AIChatMessage> {
  const sentimento = analisarSentimento(mensagem);
  const lower = mensagem.toLowerCase();
  const formatador = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const hoje = new Date().toISOString().split("T")[0];

  // Métricas
  const totalReceitas = transacoes
    .filter((t) => t.tipo === "receita")
    .reduce((acc, t) => acc + t.valor, 0);
  const totalDespesas = transacoes
    .filter((t) => t.tipo === "despesa")
    .reduce((acc, t) => acc + t.valor, 0);
  const lucroAcumulado = totalReceitas - totalDespesas;
  const ganhoHoje = transacoes
    .filter((t) => t.data === hoje && t.tipo === "receita")
    .reduce((acc, t) => acc + t.valor, 0);
  const countHoje = transacoes.filter(
    (t) => t.data === hoje && t.tipo === "receita",
  ).length;
  const mediaReceitaPorCorrida =
    countHoje > 0
      ? totalReceitas / transacoes.filter((t) => t.tipo === "receita").length
      : 0;

  let resposta = "";

  const saudacoes = [
    "oi",
    "olá",
    "ola",
    "bom dia",
    "boa tarde",
    "boa noite",
    "e ai",
    "eaí",
    "opa",
  ];
  const agradecimentos = [
    "obrigado",
    "obrigada",
    "valeu",
    "vlw",
    "top",
    "show",
    "ajudou",
  ];
  const despedidas = [
    "tchau",
    "fui",
    "flw",
    "até mais",
    "ate logo",
    "ate mais",
  ];

  const isSaudacao = saudacoes.some((s) => lower.startsWith(s));
  const isAgradecimento = agradecimentos.some((a) => lower.includes(a));
  const isDespedida = despedidas.some((d) => lower.includes(d));

  // Simulate a slight delay for realistic processing feel
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (isSaudacao) {
    const horas = new Date().getHours();
    const cumprimento =
      horas < 12 ? "Bom dia" : horas < 18 ? "Boa tarde" : "Boa noite";
    resposta = `${cumprimento}. Como posso ajudar com seus indicadores financeiros hoje? `;
  }

  if (isAgradecimento) {
    resposta += "À disposição para auxiliar na otimização de seus resultados. ";
  }

  if (
    lower.includes("estratégia") ||
    lower.includes("como ganhar mais") ||
    lower.includes("dica") ||
    lower.includes("renda")
  ) {
    const melhorFonte = Object.entries(
      transacoes
        .filter((t) => t.tipo === "receita")
        .reduce(
          (acc, t) => {
            acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
            return acc;
          },
          {} as Record<string, number>,
        ),
    ).sort((a, b) => b[1] - a[1])[0];

    const fonteNome = melhorFonte ? melhorFonte[0] : "plataformas";

    resposta += `\nDe acordo com seus registros, a categoria **${fonteNome.toUpperCase()}** apresenta o melhor desempenho. O retorno médio por entrada é de ${formatador.format(mediaReceitaPorCorrida)}. Priorizar momentos de alta demanda pode elevar sua lucratividade.`;
  } else if (
    lower.includes("análise") ||
    lower.includes("meus números") ||
    lower.includes("saúde") ||
    lower.includes("resumo")
  ) {
    const margemLíquida =
      totalReceitas > 0 ? (lucroAcumulado / totalReceitas) * 100 : 0;
    const avaliacao =
      margemLíquida > 50
        ? "Excelente"
        : margemLíquida > 30
          ? "Saudável"
          : "Requer atenção";

    resposta += `\nSua margem de lucro atual está em **${margemLíquida.toFixed(1)}%** (${avaliacao}). O saldo acumulado é de ${formatador.format(lucroAcumulado)}. ${margemLíquida < 30 ? "Recomenda-se uma revisão rigorosa nos custos operacionais mensais." : "Seus custos estão controlados no momento."}`;
  } else if (
    lower.includes("meta") ||
    lower.includes("objetivo") ||
    lower.includes("falta quanto")
  ) {
    const falta = Math.max(metaDiaria - ganhoHoje, 0);
    const pct = (ganhoHoje / metaDiaria) * 100;

    if (falta > 0) {
      resposta += `\nProgresso diário: **${pct.toFixed(1)}%**. Restam ${formatador.format(falta)} para alcançar sua meta de receita diária. Com foco, você consegue bater o objetivo.`;
    } else {
      resposta += `\n**Meta atingida.** O superávit de hoje excede o planejado. Qualquer entrada adicional ajuda a formar sua reserva de emergência.`;
    }
  } else if (
    lower.includes("despesa") ||
    lower.includes("gasto") ||
    lower.includes("caro") ||
    lower.includes("reduzir") ||
    lower.includes("economia")
  ) {
    const maioresDespesas = Object.entries(
      transacoes
        .filter((t) => t.tipo === "despesa")
        .reduce(
          (acc, t) => {
            acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
            return acc;
          },
          {} as Record<string, number>,
        ),
    ).sort((a, b) => b[1] - a[1]);

    const maiorDespesa = maioresDespesas.length > 0 ? maioresDespesas[0] : null;
    const impactoCustos =
      totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;

    if (maiorDespesa) {
      resposta += `\nIdentifiquei que sua categoria de maior gasto é **${maiorDespesa[0].toUpperCase()}** (${formatador.format(maiorDespesa[1])}). No geral, suas despesas consomem ${impactoCustos.toFixed(1)}% das suas receitas. Acompanhe esses custos de perto para não corroer seu patrimônio.`;
    } else {
      resposta += `\nNo momento não encontrei despesas significativas. Continue controlando os gastos!`;
    }
  } else if (
    lower.includes("orçamento") ||
    lower.includes("reserva") ||
    lower.includes("investir") ||
    lower.includes("futuro")
  ) {
    const recomendacaoReserva = lucroAcumulado * 0.3; // 30% pro futuro
    resposta += `\nConsiderando seu saldo de ${formatador.format(lucroAcumulado)}, a regra 50-30-20 sugere que você guarde ou invista cerca de 30% do seu lucro. No momento, isso seria aproximadamente **${formatador.format(recomendacaoReserva)}**. Pensar no futuro é o primeiro passo para a liberdade financeira.`;
  } else if (lower.includes("dica") || lower.includes("conselho")) {
    resposta += `\n**Dica do dia:** Sempre pague a si mesmo primeiro. Ao receber seu salário ou renda principal, reserve imediatamente uma fatia para investimentos antes de começar a pagar as contas. E evite usar o cartão de crédito para compras por impulso!`;
  } else if (isDespedida) {
    resposta =
      "Até logo. Estarei monitorando seus dados e à disposição em caso de dúvidas.";
  } else if (resposta === "") {
    resposta = `Seu saldo líquido apurado no momento é de ${formatador.format(lucroAcumulado)}. Caso deseje uma análise de metas, projeções ou custos operacionais, basta me informar.`;
  }

  // Personalization logic
  if (config.nivelDetalhe === "resumido") {
    resposta = resposta.split(".")[0] + ".";
  }

  return {
    role: "assistant",
    content: resposta.trim(),
    sentiment: sentimento,
  };
}

export function gerarInsightsNativos(
  transacoes: Transacao[],
  metaDiaria: number,
  categoriasReceita: Categoria[],
  categoriasDespesa: Categoria[],
  config: ConfiguracaoAI,
): AIInsight[] {
  let insights: AIInsight[] = [];
  const hoje = new Date().toISOString().split("T")[0];
  const formatador = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // 1. Cálculo de Métricas Estratégicas
  const transacoesMes = transacoes.filter((t) =>
    t.data.startsWith(hoje.slice(0, 7)),
  );
  const ganhosMes = transacoesMes
    .filter((t) => t.tipo === "receita")
    .reduce((acc, t) => acc + t.valor, 0);
  const gastosMes = transacoesMes
    .filter((t) => t.tipo === "despesa")
    .reduce((acc, t) => acc + t.valor, 0);
  const lucroMes = ganhosMes - gastosMes;
  const margemBruta = (lucroMes / (ganhosMes || 1)) * 100;

  // Insight 1: Saúde Financeira (Regra 50/30/20 simplificada)
  if (margemBruta > 40) {
    insights.push({
      tipo: "sucesso",
      titulo: "Alto Poder de Poupança",
      mensagem: `Você manteve ${margemBruta.toFixed(1)}% das suas receitas este mês. Excelente capacidade de guardar para o futuro ou investir.`,
      prioridade: 1,
    });
  } else if (margemBruta < 10 && ganhosMes > 1000) {
    insights.push({
      tipo: "alerta",
      titulo: "Orçamento Estrangulado",
      mensagem: `Sua margem de sobra caiu para ${margemBruta.toFixed(1)}%. Há pouco espaço para reservas de emergência. Evite novas dívidas.`,
      prioridade: 1,
    });
  }

  // Insight 2: Reserva de Emergência
  const reservaIdeial = ganhosMes > 0 ? gastosMes * 3 : 5000;
  const saldoAtual = transacoes.reduce(
    (acc, t) => (t.tipo === "receita" ? acc + t.valor : acc - t.valor),
    0,
  );

  if (saldoAtual < reservaIdeial * 0.1 && gastosMes > 0) {
    insights.push({
      tipo: "financeiro",
      titulo: "Reserva de Emergência Menor",
      mensagem: `Uma reserva ideal cobriria 3 meses de gastos (${formatador.format(reservaIdeial)}). Sugere-se alocar parte das próximas entradas para isso.`,
      prioridade: 2,
    });
  }

  // Insight 3: Dependência de Renda
  const ganhosPorFonte = transacoesMes
    .filter((t) => t.tipo === "receita")
    .reduce(
      (acc, t) => {
        acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
        return acc;
      },
      {} as Record<string, number>,
    );

  Object.entries(ganhosPorFonte).forEach(([catId, valor]) => {
    const pct = (valor / ganhosMes) * 100;
    if (pct > 95 && ganhosMes > 2000) {
      const nome =
        categoriasReceita.find((c) => c.id === catId)?.nome || "Receita";
      insights.push({
        tipo: "dica",
        titulo: "Única Fonte de Renda",
        mensagem: `Aproximadamente ${pct.toFixed(0)}% da sua receita vem de ${nome}. Sempre que possível, diversifique para ter mais segurança.`,
        prioridade: 3,
      });
    }
  });

  // Insight 4: Custos Essenciais vs Lazer
  const gastosLazerCompras = transacoesMes
    .filter((t) => ["lazer", "compras"].includes(t.categoria))
    .reduce((acc, t) => acc + t.valor, 0);
  if (gastosLazerCompras > gastosMes * 0.4 && gastosMes > 0) {
    insights.push({
      tipo: "info",
      titulo: "Gastos Variáveis Elevados",
      mensagem: `Lazer e Compras representam ${((gastosLazerCompras / gastosMes) * 100).toFixed(1)}% do mês. Cuide para que não afetem suas parcelas essenciais.`,
      prioridade: 4,
    });
  }

  // Aplicação da Configuração do Usuário
  if (config.nivelDetalhe === "resumido") {
    insights = insights
      .slice(0, 3)
      .map((i) => ({ ...i, mensagem: i.mensagem.split(".")[0] + "." }));
  }

  if (config.focarEmGanhos && !config.focarEmGastos) {
    insights = insights.filter(
      (i) => i.tipo === "sucesso" || i.tipo === "financeiro",
    );
  }

  return insights.sort((a, b) => a.prioridade - b.prioridade);
}
