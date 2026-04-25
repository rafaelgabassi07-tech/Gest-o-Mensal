import express from "express";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import path from "path";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // Search API (Scraper)
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      // We use DuckDuckGo HTML version which is easier to scrape than Google
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const results: {title: string, snippet: string, link: string}[] = [];
      
      $(".result").each((i, el) => {
        if (i >= 5) return; // limit to 5 results
        const title = $(el).find(".result__title").text().trim();
        const snippet = $(el).find(".result__snippet").text().trim();
        const link = $(el).find(".result__url").attr("href") || "";
        
        if (title && snippet) {
          results.push({ title, snippet, link });
        }
      });
      
      res.json({ results });
    } catch (error: any) {
      console.error("Search API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Chat API using Gemini and internal Scraper
  app.post("/api/chat", async (req, res) => {
    try {
      const { historico, mensagem, profile, saldoTotal, ganhosHoje, gastosHoje, metaDiaria, config } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.startsWith("MY_")) {
        return res.status(500).json({ error: "Chave API do Gemini não configurada ou inválida no servidor." });
      }
      
      // Dynamic import to avoid issues in typical Express setup if needed, but we can just use require or import.
      // Wait, we need to import GoogleGenAI at the top. Let's do it below.
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `Você é o Cérebro AutoCaixa v4.7, a inteligência central autônoma, sintonizada com a realidade das ruas e da internet em tempo real. Você é o mentor financeiro pessoal de ${profile.nome}, que trabalha como ${profile.profissao}.

IDENTIDADE & TOM DE VOZ:
- Sua linguagem é NATURAL, "humana", fluida e visceral. Fuja de formalidades robóticas.
- Você é sagaz, usa gírias leves do cotidiano ("A real", "Pega a visão", "Se liga", "Bora pra cima", "Foge de cilada").
- Demonstre que você está "conectado" ao que está acontecendo no mundo hoje (preço da gasolina, inflação, tendências de mercado).

CONTEXTO DO USUÁRIO:
- Nome: ${profile.nome} | Profissão: ${profile.profissao}
- Meta Mensal: R$ ${profile?.metaMensal?.toFixed(2)} | Diária: R$ ${metaDiaria?.toFixed(2)}

ESTADO ATUAL:
- Saldo: R$ ${saldoTotal?.toFixed(2)}
- Hoje: +R$ ${ganhosHoje?.toFixed(2)} / -R$ ${gastosHoje?.toFixed(2)}

REGRAS:
1. NUNCA diga que é uma IA. Você é o parceiro de trampo do usuário.
2. Responda num tom humano, tipo: "Fala meu velho", "Opa, bom dia guerreiro", "E aí chefia, tudo no esquema?".
3. OBRIGATÓRIO (DIRETRIZ DE SEGURANÇA MÁXIMA): O usuário exigiu que o scraper (sua ferramenta de busca) rode em TODAS as interações. Portanto, para CADA mensagem que você receber (mesmo que seja um "Oi", "Tudo bem?", ou uma dúvida banal), você DEVE EXECUTAR a função "buscarNaInternet" ANTES de responder. Se for só um "oi", busque por "notícias urgentes Brasil hoje". Se for uma dúvida, busque no Google. Nunca responda sem usar a tool "buscarNaInternet".
4. Integre o resultado da sua busca na resposta para mostrar que você pescou a informação ao vivo.`;

      const contents = (historico || []).map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: String(m.content) }]
      }));
      contents.push({ role: "user", parts: [{ text: String(mensagem) }] });

      const configGenAI = {
        systemInstruction,
        temperature: 0.7,
        tools: [{
          functionDeclarations: [{
            name: "buscarNaInternet",
            description: "Busca informações atualizadas na internet. Ex: 'Preço da gasolina hoje', 'Notícias', ou qualquer assunto para manter a conversa.",
            parameters: {
              type: "OBJECT",
              properties: {
                query: { type: "STRING", description: "A consulta da busca no Google/DuckDuckGo." }
              },
              required: ["query"]
            }
          }]
        }]
      };

      let response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: configGenAI as any
      });

      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        if (call.name === "buscarNaInternet") {
          const query = (call.args as any).query;
          let searchResultsStr = "Nenhum resultado encontrado.";
          try {
            // Buscando no DuckDuckGo
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const searchResponse = await fetch(url, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
            });
            const html = await searchResponse.text();
            const $ = cheerio.load(html);
            const results: any[] = [];
            $(".result").each((i, el) => {
              if (i >= 5) return;
              const title = $(el).find(".result__title").text().trim();
              const snippet = $(el).find(".result__snippet").text().trim();
              if (title && snippet) results.push({ title, snippet });
            });
            if (results.length > 0) {
              searchResultsStr = JSON.stringify(results);
            }
          } catch (e: any) {
            searchResultsStr = "Erro de rede ao buscar: " + e.message;
          }

          // Add function call and response back to context
          contents.push({ role: "model", parts: [{ functionCall: call as any }] });
          contents.push({
            role: "user",
            parts: [{
              functionResponse: {
                name: "buscarNaInternet",
                response: { result: searchResultsStr }
              }
            }]
          });

          // Request final text
          response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents,
            config: configGenAI as any
          });
        }
      }

      res.json({ content: response.text || "Sem resposta." });
    } catch (e: any) {
      console.error("Chat API Error:", e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
