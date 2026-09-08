import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspace = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const root = await realpath(
  process.argv.includes("--dist") ? path.join(workspace, "dist") : workspace,
);
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  try {
    const url = new URL(request.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    const parts = pathname.split(/[\\/]/).filter(Boolean);
    if (
      parts.some(
        (part) =>
          part.startsWith(".") ||
          ["node_modules", "tools", "tests"].includes(part),
      )
    ) {
      response.writeHead(404).end("Not found");
      return;
    }
    const resolved = path.resolve(root, "." + pathname);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const candidate = (await stat(resolved)).isDirectory()
      ? path.join(resolved, "index.html")
      : resolved;
    const actual = await realpath(candidate);
    if (!actual.startsWith(root + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(actual);
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Type":
        types[path.extname(actual).toLowerCase()] || "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") response.end();
    else
      createReadStream(actual)
        .on("error", () => response.destroy())
        .pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () =>
  console.log(`Portfolio: http://127.0.0.1:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
