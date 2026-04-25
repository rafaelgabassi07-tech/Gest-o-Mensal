async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        historico: [], 
        mensagem: "Oi, tudo bem? Me fale sobre a inflação no brasil hoje", 
        profile: { nome: "Rafael", profissao: "Dev", metaMensal: 1000 }, 
        saldoTotal: 0, ganhosHoje: 0, gastosHoje: 0, metaDiaria: 33, config: {} 
      })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}
test();
