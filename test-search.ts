import * as cheerio from "cheerio";

async function test() {
  const query = "preço da gasolina";
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
    if (i >= 5) return;
    const title = $(el).find(".result__title").text().trim();
    const snippet = $(el).find(".result__snippet").text().trim();
    const link = $(el).find(".result__url").attr("href") || "";

    if (title && snippet) {
      results.push({ title, snippet, link });
    }
  });

  console.log(JSON.stringify(results, null, 2));
}

test();
