import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { landingMarkdown, renderSeo, structuredData, syncSeo } from "./seo.mjs";
import { seoResponse, seoRoutes } from "./seo-routes.mjs";

test("published SEO outputs match the source and build artifacts", async () => {
  await syncSeo({ check: true });
  const files = await renderSeo();
  for (const name of ["index.html", "index.md", "README.md", "llms.txt", "llms-full.txt", "profile.jsonld", "sitemap.xml"]) {
    assert.equal(await readFile(`dist/${name}`, "utf8"), files[name], `${name} must reach production`);
  }
  const config = JSON.parse(await readFile("vercel.json", "utf8"));
  assert.deepEqual(config.routes.slice(-seoRoutes.length), seoRoutes);
  assert.equal(config.routes[0].status, 404);
  assert.match(config.routes[0].src, /onion/);
});

test("JSON-LD ties the person, portfolio and product together without invented ratings", async () => {
  const profile = JSON.parse(await readFile("content/profile.json", "utf8"));
  const graph = structuredData(profile)["@graph"];
  const person = graph.find((node) => node["@type"] === "Person");
  const page = graph.find((node) => node["@type"] === "ProfilePage");
  const product = graph.find((node) => node["@type"] === "SoftwareApplication");
  assert.equal(new Set(graph.map((node) => node["@id"])).size, graph.length);
  assert.equal(page.mainEntity["@id"], person["@id"]);
  assert.equal(product.creator["@id"], person["@id"]);
  assert.equal(person.contactPoint.url, profile.person.whatsapp);
  assert.equal(person.telephone, `+${new URL(profile.person.whatsapp).pathname.slice(1)}`);
  assert.match(person.description, /ex-hacker/);
  assert.ok(!person.sameAs.includes(profile.product.instagram));
  assert.ok(!JSON.stringify(graph).match(/FAQPage|aggregateRating|reviewCount|priceCurrency/));
  const html = await readFile("dist/index.html", "utf8");
  const embedded = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(embedded, JSON.parse(await readFile("dist/profile.jsonld", "utf8")));
});

test("Markdown follows the actual landing, resolves URLs and excludes decoration", () => {
  const result = landingMarkdown('<main><h1><span>Produto</span><span>completo</span></h1><p>Nova capacidade publicada.</p><a href="#contato">Contato</a><a href="/projeto">Projeto</a><img src="assets/screen.png" alt="Tela real"><svg><text>DECORATION</text></svg><div aria-hidden="true"><p>HIDDEN</p></div><button>CONTROL</button></main>', "https://miguelzacca.dev/");
  assert.match(result, /Produto\s+completo/);
  assert.match(result, /Nova capacidade publicada/);
  assert.match(result, /\[Contato\]\(https:\/\/miguelzacca.dev\/#contato\)/);
  assert.match(result, /\[Projeto\]\(https:\/\/miguelzacca.dev\/projeto\)/);
  assert.match(result, /https:\/\/miguelzacca.dev\/assets\/screen.png/);
  assert.doesNotMatch(result, /DECORATION|HIDDEN|CONTROL|<svg/);
});

test("all public contact links appear in every agent representation", async () => {
  const profile = JSON.parse(await readFile("content/profile.json", "utf8"));
  const links = [profile.person.whatsapp, profile.person.github, profile.person.instagram, `mailto:${profile.person.email}`, profile.product.url, profile.product.instagram];
  for (const name of ["index.md", "llms.txt", "llms-full.txt", "README.md"]) {
    const text = await readFile(`dist/${name}`, "utf8");
    for (const link of links) assert.ok(text.includes(link), `${link} missing from ${name}`);
    assert.match(text, /ex-hacker/);
  }
  const sitemap = await readFile("dist/sitemap.xml", "utf8");
  assert.equal((sitemap.match(/<loc>/g) || []).length, 1);
  assert.doesNotMatch(sitemap, /\.onion|\.md|llms/);
});

test("content negotiation preserves browsers, canonical links and explicit exclusions", () => {
  for (const accept of [undefined, "*/*", "text/html", "text/html,application/xhtml+xml", "text/markdown;q=0", "text/markdown;q=0.5,text/html;q=1"]) {
    const response = seoResponse("/", { accept });
    assert.equal(response.pathname, "/", accept);
    assert.equal(response.headers.Vary, "Accept");
    assert.match(response.headers.Link, /index\.md.*rel="alternate"/);
  }
  for (const pathname of ["/", "/index.html"]) {
    for (const method of ["GET", "HEAD"]) {
      const response = seoResponse(pathname, { accept: "text/markdown" }, method);
      assert.equal(response.pathname, "/index.md");
      assert.equal(response.headers["Content-Type"], "text/markdown; charset=utf-8");
      assert.equal(response.headers.Vary, "Accept");
      assert.match(response.headers.Link, /<https:\/\/miguelzacca.dev\/>; rel="canonical"/);
    }
  }
  assert.equal(seoResponse("/missing.md", { accept: "text/markdown" }).pathname, "/missing.md");
  assert.equal(seoResponse("/onion", { accept: "text/markdown" }).pathname, "/onion");
});
