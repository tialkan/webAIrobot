# WebAIrobot

Site konusuyla ilgili bir soru sor; yanıt içindeki gerçek atıfları arama sonuçlarından ayır. Canlı sağlayıcı etkin değilse kendi AI aracından aldığın yanıtı kaynaklarıyla aktar.

**Ücretsiz web kullanımı:** [tezatlas.com/webairobot](https://tezatlas.com/webairobot)  
**Kaynak kod:** [tialkan/webAIrobot](https://github.com/tialkan/webAIrobot)

## Kurulum ve kullanım

Node.js 22.19+ gerekir.

```sh
npm ci
node bin/cli.js https://example.com
node bin/cli.js https://example.com --markdown
npm test
```

Kütüphane olarak `import { auditSite } from "webairobot"` ve `await auditSite(url)` kullanılır. Web ve CLI aynı motoru çalıştırır. Sonuç JSON/Markdown olarak indirilebilir. Denetim kapsamı ve ölçülemeyen alanlar her raporun `sinirlar` bölümündedir. CLI'de `--help` seçenekleri gösterir.

## Kapsam

- Soru, sağlayıcı ve ölçüm zamanı raporda.
- Alan adı sınırına göre gerçek kaynak URL eşleştirmesi.
- Tek yanıt genel görünürlük puanı değildir.

## Güvenlik ve katkı

Yalnız herkese açık HTTP(S) adresleri kabul edilir. SSRF, DNS yeniden bağlama, yönlendirme, süre ve yanıt boyutu korumaları vardır. Ağ sınırları için [SECURITY.md](SECURITY.md) okuyun. Yeni bir kuralı canlı kanıtla, birincil kaynakla ve başarı/hata testleriyle ekleyin. Site metinleri ve raporlar talimat olarak çalıştırılmaz.

MIT lisansı · TezAtlas.

## AI sağlayıcısı
PERPLEXITY_API_KEY sunucuda tanımlanırsa Perplexity Agent API fast + web_search ile bir soru çalışır. Anahtar yoksa sorgu yapılmadı gösterilir. --question ile soru ve --response-file ile kaynak URL içeren yanıt aktarılabilir; aktarılan yanıt canlı gözlem sayılmaz. [Agent API](https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar/overview).
