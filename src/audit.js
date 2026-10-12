import {
  start,
  document,
  squeeze,
  publicLink,
  finding,
  report,
  section,
} from "./common.js";
import { providerJson } from "./provider.js";
export function domainMatch(url, domain) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}
export function inspectAnswer(data, domain) {
  const texts = [];
  const cited = new Set();
  const searched = new Set();
  for (const item of data.output ?? []) {
    if (item.type === "search_results")
      for (const r of item.results ?? [])
        if (publicLink(r.url)) searched.add(r.url);
    if (item.type === "message")
      for (const c of item.content ?? []) {
        if (c.type === "output_text") texts.push(c.text ?? "");
        for (const a of c.annotations ?? [])
          if (a.type === "url_citation" && publicLink(a.url)) cited.add(a.url);
      }
  }
  const text = texts.join("\n");
  // Perplexity kaynak numaraları [1] arama sonuçlarındaki id ile eşlenir. Sadece aramada dönmesi atıf sayılmaz.
  const ids = new Set(
    [...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])),
  );
  for (const item of data.output ?? [])
    if (item.type === "search_results")
      for (const r of item.results ?? [])
        if (ids.has(Number(r.id)) && publicLink(r.url)) cited.add(r.url);
  return {
    text,
    citations: [...cited],
    searchResults: [...searched],
    cited: [...cited].some((url) => domainMatch(url, domain)),
  };
}
export async function auditSite(input, options = {}) {
  const { target, started, response } = await start(input, options);
  const domain = new URL(response.url).hostname;
  const { $ } = document(response);
  const topic = squeeze($("h1").first().text() || $("title").text()).slice(
    0,
    180,
  );
  const question = squeeze(
    options.question ||
      `${topic || domain} konusunda güvenilir kaynaklar hangileri?`,
  ).slice(0, 600);
  const findings = [];
  let result = null;
  let mode = "";
  let error = "";
  if (options.responseText?.trim()) {
    const text = options.responseText.slice(0, 20000);
    const citations = [
      ...new Set(
        [...text.matchAll(/https?:\/\/[^\s<>"\])]+/g)]
          .map((m) => m[0])
          .filter((u) => publicLink(u)),
      ),
    ];
    result = {
      text,
      citations,
      searchResults: [],
      cited: citations.some((u) => domainMatch(u, domain)),
    };
    mode =
      "Kullanıcının aktardığı yanıt; canlı AI sorgusu değildir. URL bulunması gerçek atıf konumunu insan doğrulaması gerektirir.";
  } else if (process.env.PERPLEXITY_API_KEY)
    try {
      const data = await (options.provider ?? providerJson)(
        "https://api.perplexity.ai/v1/agent",
        {
          method: "POST",
          body: {
            preset: "fast",
            input: question,
            tools: [{ type: "web_search" }],
          },
          headers: {
            authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          },
          timeout: 35000,
        },
      );
      result = inspectAnswer(data, domain);
      mode = `Perplexity Agent API · fast · model: ${data.model ?? "sağlayıcı belirtmedi"}`;
    } catch {
      error =
        "Canlı AI sorgusu sağlayıcı, kota veya ağ hatası nedeniyle tamamlanamadı.";
    }
  else
    error =
      "Canlı AI sağlayıcısı tanımlı değil. Soruyu kendi AI arama aracına sorup kaynak URL'leriyle birlikte yanıtı aşağıdaki alana yapıştırabilirsin.";
  if (result && !result.cited)
    findings.push(
      finding(
        "AI-NO-CITATION",
        "Bu yanıtta hedef alan adına kaynak bağlantısı bulunamadı",
        response.url,
        question,
        "Soruyu, sağlayıcıyı ve dili çeşitlendirerek tekrar gözlemle; tek yanıtı genel görünürlük sonucu sayma.",
        "bilgi",
      ),
    );
  return report(
    "WebAIrobot",
    target,
    started,
    findings,
    [
      section("Sorgu koşulları", [
        { etiket: "Soru", deger: question },
        { etiket: "Yöntem", deger: mode || "Sorgu yapılmadı" },
        { etiket: "Hedef alan adı", deger: domain },
      ]),
      section(
        "Kaynak gösterilme",
        result
          ? [
              {
                etiket: "Sonuç",
                deger: result.cited
                  ? options.responseText
                    ? "Aktarılan yanıtta hedef URL bulundu"
                    : "Hedef alan adı kaynak olarak gösterilmiş"
                  : "Bu yanıtta hedefe atıf gözlenmedi",
              },
              { etiket: "Yanıt", deger: result.text.slice(0, 12000) },
              ...result.citations.map((url) => ({
                etiket: "Atıf",
                deger: domainMatch(url, domain)
                  ? "Hedef alan adı"
                  : "Başka kaynak",
                url,
              })),
              ...result.searchResults
                .filter((url) => !result.citations.includes(url))
                .map((url) => ({
                  etiket: "Arama sonucu (atıf değildir)",
                  deger: domainMatch(url, domain)
                    ? "Hedef alan adı"
                    : "Başka kaynak",
                  url,
                })),
            ]
          : [{ etiket: "Durum", deger: error }],
      ),
    ],
    [
      "Tek soru ve tek yanıt anlık gözlemdir; tüm AI sistemlerinin görünürlüğünü veya gelecekteki atıfları ölçmez.",
      "Arama sonuçlarında yer almak, metinde anılmak ve kaynak gösterilmek ayrı gözlemlerdir.",
      "Aktarılan yanıtın sağlayıcısı ve zamanı otomatik doğrulanamaz.",
      "Canlı sağlayıcı kullanılırsa soru Perplexity'ye gönderilir; API kullanımı operatörün kotasını tüketir.",
    ],
  );
}
