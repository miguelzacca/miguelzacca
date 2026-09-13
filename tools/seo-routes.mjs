const canonical = "https://miguelzacca.dev/";
const alternateLinks = `<${canonical}>; rel="canonical", <${canonical}index.md>; rel="alternate"; type="text/markdown", <${canonical}llms.txt>; rel="describedby"; type="text/plain", <${canonical}profile.jsonld>; rel="describedby"; type="application/ld+json"`;
const documentLinks = `<${canonical}>; rel="canonical", <${canonical}llms.txt>; rel="describedby"; type="text/plain"`;

// Only an explicit Markdown request changes the representation. Browser Accept
// lists, wildcards and q=0 keep HTML. No user-agent-based content selection.
export const seoRoutes = [
  {
    src: "^/(?:index\\.html)?$",
    headers: { Vary: "Accept", Link: alternateLinks },
    continue: true,
  },
  {
    src: "^/(?:index\\.html)?$",
    methods: ["GET", "HEAD"],
    has: [{ type: "header", key: "accept", value: "^text/markdown(?:;\\s*charset=utf-8)?$" }],
    dest: "/index.md",
    headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept", Link: documentLinks },
  },
  {
    src: "^/index\\.md$",
    headers: { "Content-Type": "text/markdown; charset=utf-8", Link: documentLinks, "X-Content-Type-Options": "nosniff" },
    continue: true,
  },
  {
    src: "^/README\\.md$",
    headers: { "Content-Type": "text/markdown; charset=utf-8", Link: '<https://github.com/miguelzacca/miguelzacca>; rel="canonical"', "X-Content-Type-Options": "nosniff" },
    continue: true,
  },
  {
    src: "^/llms(?:-full)?\\.txt$",
    headers: { "Content-Type": "text/plain; charset=utf-8", Link: documentLinks, "X-Content-Type-Options": "nosniff" },
    continue: true,
  },
  {
    src: "^/profile\\.jsonld$",
    headers: { "Content-Type": "application/ld+json; charset=utf-8", Link: documentLinks, "X-Content-Type-Options": "nosniff" },
    continue: true,
  },
];

// Match the same SEO rules in the local server so HTTP tests exercise the
// published configuration as well as the files copied into dist.
export function seoResponse(pathname, headers = {}, method = "GET") {
  const result = { pathname, headers: {} };
  for (const route of seoRoutes) {
    if (!new RegExp(route.src).test(pathname)) continue;
    if (route.methods && !route.methods.includes(method)) continue;
    if (route.has?.some((condition) => !new RegExp(condition.value).test(headers[condition.key] || ""))) continue;
    Object.assign(result.headers, route.headers);
    if (route.dest) result.pathname = route.dest;
    if (!route.continue) break;
  }
  return result;
}
