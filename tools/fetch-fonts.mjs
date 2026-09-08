import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../assets/fonts",
);
const sources = [
  [
    "manrope-latin-variable.woff2",
    "https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSg.woff2",
  ],
  [
    "instrument-serif-latin-regular.woff2",
    "https://fonts.gstatic.com/s/instrumentserif/v5/jizBRFtNs2ka5fXjeivQ4LroWlx-6zUTjg.woff2",
  ],
  [
    "instrument-serif-latin-italic.woff2",
    "https://fonts.gstatic.com/s/instrumentserif/v5/jizHRFtNs2ka5fXjeivQ4LroWlx-6zAjjH7M.woff2",
  ],
  [
    "Manrope-OFL.txt",
    "https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt",
  ],
  [
    "InstrumentSerif-OFL.txt",
    "https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/OFL.txt",
  ],
];

await mkdir(directory, { recursive: true });
const records = await Promise.all(
  sources.map(async ([filename, url]) => {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Font download failed: ${response.status} ${url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (
      filename.endsWith(".woff2") &&
      bytes.subarray(0, 4).toString() !== "wOF2"
    ) {
      throw new Error(`Invalid WOFF2 file: ${filename}`);
    }
    if (
      filename.endsWith(".txt") &&
      !bytes.toString().includes("SIL OPEN FONT LICENSE")
    ) {
      throw new Error(`Missing OFL license: ${filename}`);
    }
    await writeFile(path.join(directory, filename), bytes);
    console.log(`${filename}: ${bytes.length} bytes`);
    return {
      filename,
      url,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }),
);
await writeFile(
  path.join(directory, "sources.json"),
  JSON.stringify(
    {
      downloaded: new Date().toISOString().slice(0, 10),
      cssSource:
        "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400..700&display=swap",
      subset: "latin — inclui os caracteres acentuados do português",
      records,
    },
    null,
    2,
  ) + "\n",
);
