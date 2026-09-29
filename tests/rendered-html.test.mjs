import assert from "node:assert/strict";
import test from "node:test";
import { content } from "../app/content.ts";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the game shell and metadata from app/content.ts", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.ok(html.includes(`<html lang="${escapeHtml(content.language)}">`));
  assert.ok(html.includes(`<title>${escapeHtml(`${content.title} — ${content.subtitle}`)}</title>`));
  assert.match(html, /class="screen start-screen ready-screen"/i);
  assert.ok(html.includes(escapeHtml(content.text.startShow)));
  assert.doesNotMatch(html, /<img/i);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});
