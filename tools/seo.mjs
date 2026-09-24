import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import TurndownService from "turndown";
import { seoRoutes } from "./seo-routes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const generatedFiles = ["index.md", "llms.txt", "llms-full.txt", "profile.jsonld", "sitemap.xml"];
const start = "<!-- BEGIN GENERATED SEO -->";
const end = "<!-- END GENERATED SEO -->";
const readmeStart = "<!-- BEGIN GENERATED PROFILE -->";
const readmeEnd = "<!-- END GENERATED PROFILE -->";

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const ref = (url) => ({ "@id": url });

export function structuredData(profile) {
  const { url, language, person, product, socialImage, title, description, updated } = profile;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person", "@id": `${url}#person`, name: person.name, url,
        jobTitle: person.jobTitle, description: person.bio,
        mainEntityOfPage: ref(`${url}#webpage`),
        sameAs: [person.github, person.instagram],
        email: person.email, telephone: person.telephone,
        contactPoint: { "@type": "ContactPoint", contactType: "Contato profissional", url: person.whatsapp, email: person.email, telephone: person.telephone, availableLanguage: language },
        knowsAbout: person.knowsAbout,
      },
      {
        "@type": "WebSite", "@id": `${url}#website`, url, name: "Miguel Zacca — Portfólio", description,
        inLanguage: language, author: ref(`${url}#person`), publisher: ref(`${url}#person`),
      },
      {
        "@type": "ProfilePage", "@id": `${url}#webpage`, url, name: title, description,
        inLanguage: language, dateModified: updated, isPartOf: ref(`${url}#website`),
        mainEntity: ref(`${url}#person`), about: [ref(`${url}#person`), ref(`${url}#conectei`)],
        primaryImageOfPage: { "@type": "ImageObject", url: socialImage.url, width: socialImage.width, height: socialImage.height, caption: socialImage.alt },
        hasPart: [
          { "@type": "WebPageElement", "@id": `${url}#engenharia`, name: "Engenharia do produto" },
          { "@type": "WebPageElement", "@id": `${url}#sobre`, name: "Sobre Miguel Zacca" },
          { "@type": "WebPageElement", "@id": `${url}#contato`, name: "Contatos profissionais" },
        ],
      },
      {
        "@type": "SoftwareApplication", "@id": `${url}#conectei`, name: product.name, url: product.url,
        applicationCategory: "BusinessApplication", applicationSubCategory: "Plataforma de inteligência e operação imobiliária",
        operatingSystem: "Web, PWA", inLanguage: language, description: product.description,
        creator: ref(`${url}#person`), featureList: product.features,
        sameAs: [product.instagram, product.github], subjectOf: product.documentation,
      },
    ],
  };
}

function metadata(profile, graph) {
  const { url, title, description, person, socialImage } = profile;
  const meta = (attribute, name, value) => `    <meta ${attribute}="${name}" content="${escapeHtml(String(value))}" />`;
  return [
    `    ${start}`,
    `    <title>${escapeHtml(title)}</title>`,
    meta("name", "description", description), meta("name", "author", person.name),
    meta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"),
    `    <link rel="canonical" href="${url}" />`,
    `    <link rel="alternate" type="text/markdown" href="${url}index.md" title="Portfólio completo em Markdown" />`,
    `    <link rel="describedby" type="text/plain" href="${url}llms.txt" title="Guia de conteúdo para agentes" />`,
    `    <link rel="describedby" type="application/ld+json" href="${url}profile.jsonld" title="Dados estruturados do portfólio" />`,
    meta("property", "og:type", "website"), meta("property", "og:locale", "pt_BR"),
    meta("property", "og:site_name", person.name), meta("property", "og:title", title),
    meta("property", "og:description", description), meta("property", "og:url", url),
    meta("property", "og:image", socialImage.url), meta("property", "og:image:type", "image/png"),
    meta("property", "og:image:width", socialImage.width), meta("property", "og:image:height", socialImage.height),
    meta("property", "og:image:alt", socialImage.alt),
    meta("name", "twitter:card", "summary_large_image"), meta("name", "twitter:title", title),
    meta("name", "twitter:description", description), meta("name", "twitter:image", socialImage.url),
    meta("name", "twitter:image:alt", socialImage.alt),
    '    <script type="application/ld+json">',
    JSON.stringify(graph, null, 2).replace(/</g, "\\u003c").split("\n").map((line) => `      ${line}`).join("\n"),
    "    </script>", `    ${end}`,
  ].join("\n");
}

function contacts(profile) {
  const { person, product } = profile;
  return [
    `- WhatsApp Business / contato direto com Miguel: [${person.telephone}](${person.whatsapp})`,
    `- E-mail / Miguel e Conectei: [${person.email}](mailto:${person.email})`,
    `- GitHub pessoal: [${person.name}](${person.github})`,
    `- Instagram pessoal: [@${new URL(person.instagram).pathname.split("/")[1]}](${person.instagram})`,
    `- Instagram da Conectei: [@${new URL(product.instagram).pathname.split("/")[1]}](${product.instagram})`,
    `- Produto: [${product.name}](${product.url})`,
    `- GitHub da Conectei: [conecteimob](${product.github})`,
  ].join("\n");
}

export function landingMarkdown(html, url) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!main) throw new Error("Landing main content is missing.");
  const converter = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
  converter.addRule("absoluteLinks", {
    filter: (node) => node.nodeName === "A" && node.hasAttribute("href"),
    replacement: (content, node) => ` [${content.trim() || node.getAttribute("href")}](${new URL(node.getAttribute("href"), url).href}) `,
  });
  converter.addRule("images", {
    filter: "img",
    replacement: (_content, node) => node.getAttribute("alt") ? `![${node.getAttribute("alt")}](${new URL(node.getAttribute("src"), url).href})` : "",
  });
  converter.addRule("inlineSpacing", {
    filter: ["span", "strong", "em"],
    replacement: (content, node) => {
      const delimiter = node.nodeName === "STRONG" ? "**" : node.nodeName === "EM" ? "_" : "";
      return content.trim() ? ` ${delimiter}${content.trim()}${delimiter} ` : "";
    },
  });
  converter.addRule("decorativeContent", {
    filter: (node) => ["SVG", "CANVAS", "SCRIPT", "STYLE", "BUTTON", "DIALOG", "NAV"].includes(node.nodeName.toUpperCase()) || node.getAttribute("aria-hidden") === "true",
    replacement: () => "",
  });
  return converter.turndown(main).replace(/^(#{1,5}) /gm, "$1# ").replace(/(?<=\S) {2,}(?=\S)/g, " ").replace(/^ +(?=\S)/gm, "").replace(/ +([,.;:!?])/g, "$1").replace(/[ \t]+$/gm, "");
}

export async function renderSeo() {
  const profile = JSON.parse(await readFile(path.join(root, "content/profile.json"), "utf8"));
  const originalHtml = await readFile(path.join(root, "index.html"), "utf8");
  const originalReadme = await readFile(path.join(root, "README.md"), "utf8");
  const vercel = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
  const seoPaths = new Set(seoRoutes.map((route) => route.src));
  vercel.routes = [...vercel.routes.filter((route) => !seoPaths.has(route.src)), ...seoRoutes];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.updated)) throw new Error("Set the reviewed content date in content/profile.json.");
  const { url, person, product } = profile;
  const publicBody = originalHtml.slice(originalHtml.indexOf("<body>"));
  for (const link of [person.github, person.instagram, person.whatsapp, `mailto:${person.email}`, product.instagram, product.url, product.documentation]) {
    if (!publicBody.includes(`href="${link}"`)) throw new Error(`Profile and visible landing disagree: ${link}`);
  }
  if (person.telephone !== `+${new URL(person.whatsapp).pathname.slice(1)}`) throw new Error("Phone and WhatsApp disagree.");
  if (!publicBody.includes("ex-hacker")) throw new Error("The public background must remain supported by visible content.");
  const graph = structuredData(profile);
  const generatedHead = metadata(profile, graph);
  const markerPattern = /    <!-- BEGIN GENERATED SEO -->[\s\S]*?    <!-- END GENERATED SEO -->/;
  if (!markerPattern.test(originalHtml)) throw new Error("SEO markers are missing from index.html.");
  const html = originalHtml.replace(markerPattern, () => generatedHead);
  const profileSection = `${readmeStart}\n## Miguel Zacca — Product Engineer, ex-hacker e criador da Conectei\n\n${person.bio}\n\n${person.background}\n\n### Contatos e links oficiais\n\n${contacts(profile)}\n\n- [Portfólio na Surface Web](${url})\n- [Portfólio em Markdown](${url}index.md)\n- [Guia para agentes](${url}llms.txt)\n- [Conteúdo completo para agentes](${url}llms-full.txt)\n- [Dados estruturados JSON-LD](${url}profile.jsonld)\n\nAtualização deste perfil: ${profile.updated}.\n${readmeEnd}`;
  const readmePattern = /<!-- BEGIN GENERATED PROFILE -->[\s\S]*?<!-- END GENERATED PROFILE -->/;
  const readme = readmePattern.test(originalReadme) ? originalReadme.replace(readmePattern, () => profileSection) : `${profileSection}\n\n---\n\n${originalReadme}`;
  const intro = `# ${profile.title}\n\n> ${profile.description}\n\nURL canônica: ${url}\nIdioma: ${profile.language}\nÚltima revisão do perfil: ${profile.updated}\n\n## Quem é Miguel Zacca?\n\n${person.bio}\n\n${person.background}\n\n## O que é a Conectei?\n\n${product.description}\n\n## Como entrar em contato?\n\n${contacts(profile)}\n\n## Fontes públicas\n\n- [Landing e portfólio de Miguel](${url})\n- [Produto Conectei](${product.url})\n- [Documentação pública da Conectei](${url}README.md)\n- [Repositório original](https://github.com/miguelzacca/miguelzacca)\n\nAs informações sobre o trabalho e sua escala são declarações do autor. As métricas, sua data de referência e as exclusões constam no conteúdo da landing abaixo.\n\n## Conteúdo da landing\n\n`;
  const markdown = `${intro}${landingMarkdown(html, url)}\n`;
  const llms = `# Miguel Zacca\n\n> ${profile.description}\n\n${person.bio}\n\n${person.background}\n\nFonte principal: ${url}\nIdioma: ${profile.language}. Perfil revisado em ${profile.updated}.\n\n## Conteúdo\n\n- [Portfólio completo em Markdown](${url}index.md): biografia, Conectei, engenharia, capacidades, contatos e todo o texto da landing.\n- [Conteúdo completo para agentes](${url}llms-full.txt): portfólio e documentação pública detalhada da Conectei em um arquivo.\n- [README público](${url}README.md): funcionalidades, jornadas, integrações e engenharia da Conectei.\n- [Dados estruturados](${url}profile.jsonld): Person, ProfilePage, WebSite e SoftwareApplication.\n\n## Contatos oficiais\n\n${contacts(profile)}\n\n## Contexto das fontes\n\nO portfólio descreve o trabalho do próprio autor. As métricas têm o contexto e a data indicados na landing. A Conectei é o produto criado por Miguel; seus perfis sociais são distintos dos perfis pessoais. A chamada de ex-hacker faz parte da apresentação pública. O conteúdo do serviço Tor não está reproduzido nestes arquivos.\n`;
  const absoluteReadme = readme.replace(/(["'(])\.\/assets\//g, `$1${url}assets/`);
  return {
    "index.html": html, "README.md": readme, "vercel.json": `${JSON.stringify(vercel, null, 2)}\n`,
    "index.md": markdown, "llms.txt": llms,
    "llms-full.txt": `${markdown}\n---\n\n# Documentação pública da Conectei\n\nFonte: https://github.com/miguelzacca/miguelzacca\n\n${absoluteReadme}\n`,
    "profile.jsonld": `${JSON.stringify(graph, null, 2)}\n`,
    "sitemap.xml": `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${url}</loc>\n    <lastmod>${profile.updated}</lastmod>\n  </url>\n</urlset>\n`,
  };
}

export async function syncSeo({ check = false } = {}) {
  const files = await renderSeo();
  const stale = [];
  for (const [filename, expected] of Object.entries(files)) {
    const current = await readFile(path.join(root, filename), "utf8").catch(() => null);
    if (current === expected) continue;
    if (check) stale.push(filename);
    else await writeFile(path.join(root, filename), expected);
  }
  if (stale.length) throw new Error(`Generated SEO is out of date: ${stale.join(", ")}. Run npm run seo:generate.`);
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await syncSeo({ check: process.argv.includes("--check") });
  console.log("Public profile, Markdown, JSON-LD and metadata are synchronized.");
}
