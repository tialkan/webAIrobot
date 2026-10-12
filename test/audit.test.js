import test from "node:test";
import assert from "node:assert/strict";
const response = (
  body = "<html><body>Test</body></html>",
  status = 200,
  url = "https://example.com/",
  headers = {},
) => ({
  ok: true,
  result: {
    url,
    status,
    headers: { "content-type": "text/html", ...headers },
    body,
    bytes: Buffer.byteLength(body),
    cookies: [],
    chain: [{ url, status }],
  },
});
import { inspectAnswer, domainMatch, auditSite } from "../src/audit.js";
test("search hit is not a citation; exact domain boundary", () => {
  assert.equal(domainMatch("https://badexample.com", "example.com"), false);
  assert.equal(domainMatch("https://example.com.tr", "example.com"), false);
  assert.equal(domainMatch("https://blog.example.com", "example.com"), true);
  const base = {
    output: [
      {
        type: "search_results",
        results: [{ id: 1, url: "https://example.com/" }],
      },
      {
        type: "message",
        content: [{ type: "output_text", text: "Sources elsewhere" }],
      },
    ],
  };
  assert.equal(inspectAnswer(base, "example.com").cited, false);
  base.output[1].content[0].text = "Here [1]";
  assert.equal(inspectAnswer(base, "example.com").cited, true);
});
test("pasted answer is labelled as imported", async () => {
  const r = await auditSite("example.com", {
    fetcher: async () => response(),
    question: "Test topic?",
    responseText: "Kaynak https://example.com/source",
  });
  assert.match(r.bolumler[0].satirlar[1].deger, /canlı AI sorgusu değildir/);
});
