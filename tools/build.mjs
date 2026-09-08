import { build } from "esbuild";
import { access, cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(root, "dist");
const sceneOnly = process.argv.includes("--scene-only");

await build({
  entryPoints: [path.join(root, "scene.js")],
  outfile: path.join(root, "assets", "signature.js"),
  bundle: true,
  minify: true,
  format: "esm",
  target: ["es2022"],
  legalComments: "linked",
  sourcemap: false,
  logLevel: "info",
});

if (!sceneOnly) {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const issues = [];
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const knownIds = new Set(ids);
  const requiredDestinations = [
    "https://conecteimob.com.br",
    "https://github.com/miguelzacca",
    "https://github.com/conecteimob/conecteimob",
    "https://github.com/conecteimob/evo",
    "https://github.com/conecteimob/mailer",
    "https://github.com/conecteimob/task",
  ];
  for (const destination of requiredDestinations) {
    if (!html.includes(`href="${destination}"`))
      issues.push(`Existing destination must be preserved: ${destination}`);
  }
  if (ids.length !== knownIds.size) issues.push("Duplicate HTML IDs.");
  if ((html.match(/<h1\b/g) || []).length !== 1)
    issues.push("Expected one primary heading.");
  if (!/<html[^>]+lang="pt-BR"/.test(html))
    issues.push("Portuguese document language is missing.");
  if (
    !/<link[^>]+rel="canonical"[^>]+href="https:\/\/miguelzacca\.dev\/"/.test(
      html,
    )
  ) {
    issues.push("Canonical URL is missing or changed.");
  }
  const structuredData = [
    ...html.matchAll(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ];
  if (!structuredData.length) issues.push("Structured data is missing.");
  const schemaTypes = [];
  for (const [, json] of structuredData) {
    try {
      const data = JSON.parse(json);
      schemaTypes.push(
        ...(data["@graph"] || [data]).map((item) => item["@type"]),
      );
    } catch {
      issues.push("Invalid JSON-LD.");
    }
  }
  for (const type of ["Person", "WebSite", "SoftwareApplication"]) {
    if (!schemaTypes.includes(type))
      issues.push(`Existing structured data must be preserved: ${type}`);
  }
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(?:https?:|data:|mailto:|tel:|\/\/)/.test(url)) continue;
    if (url.startsWith("#")) {
      if (!knownIds.has(url.slice(1)))
        issues.push(`Broken section link: ${url}`);
      continue;
    }
    const filePath = path.resolve(
      root,
      url.split(/[?#]/)[0].replace(/^\//, ""),
    );
    if (!filePath.startsWith(root + path.sep)) {
      issues.push(`Asset path escapes project: ${url}`);
      continue;
    }
    try {
      await access(filePath);
    } catch {
      issues.push(`Missing local asset: ${url}`);
    }
  }
  for (const [, target, value] of html.matchAll(
    /\bdata-count="(\d+)"[^>]*>([^<]*)</g,
  )) {
    if (Number(value.replace(/[^\d]/g, "")) !== Number(target)) {
      issues.push(`Counter must include its final value in HTML: ${target}`);
    }
  }
  if (issues.length) throw new Error(issues.join("\n"));
  // Never recursively remove a computed directory without verifying its exact boundary.
  if (output !== path.join(root, "dist") || path.dirname(output) !== root) {
    throw new Error("Invalid build output directory.");
  }
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const file of [
    "index.html",
    "styles.css",
    "script.js",
    "robots.txt",
    "sitemap.xml",
    "assets",
  ]) {
    await cp(path.join(root, file), path.join(output, file), {
      recursive: true,
    });
  }
  const sceneSize = (await stat(path.join(output, "assets", "signature.js")))
    .size;
  console.log(
    `Static site verified and copied to dist. Scene: ${(sceneSize / 1024).toFixed(1)} KiB before compression.`,
  );
}
