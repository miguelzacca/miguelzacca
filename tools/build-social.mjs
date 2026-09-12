import { chromium } from "@playwright/test";

// Reproducible personal sharing card, using the approved monogram and local fonts.
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.goto("http://127.0.0.1:4173");
await page.setContent(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@font-face{font-family:Manrope;src:url(http://127.0.0.1:4173/assets/fonts/manrope-latin-variable.woff2)}
@font-face{font-family:Instrument;font-style:italic;src:url(http://127.0.0.1:4173/assets/fonts/instrument-serif-latin-italic.woff2)}
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#eeeae1;color:#202e29;font-family:Manrope,sans-serif;padding:48px 60px;position:relative}header{display:flex;justify-content:space-between;font-size:14px;letter-spacing:.015em;border-bottom:1px solid #bfc5b5;padding-bottom:23px}main{position:relative;padding-top:36px}h1{font-size:75px;line-height:1.05;letter-spacing:-5px;font-weight:500;margin:0}em{font-family:Instrument;font-size:98px;font-weight:400}p{font-size:15px;max-width:400px;line-height:1.8;margin-top:23px}img{position:absolute;right:-23px;top:-12px;width:550px;height:493px;object-fit:contain}footer{position:absolute;bottom:37px;left:60px;right:60px;border-top:1px solid #bfc5b5;padding-top:17px;font-size:12px;display:flex;justify-content:space-between}i{position:absolute;right:21px;top:14px;width:425px;height:425px;border:1px solid #c8cdbf;border-radius:50%}
</style></head><body><header><strong>Miguel Zacca</strong><span>Product Engineer · Criador da Conectei</span></header><main><h1>Eu construo<br>produtos.<br><em>Por inteiro.</em></h1><p>Da experiência na tela<br>aos sistemas por trás dela.</p><i></i><img src="http://127.0.0.1:4173/assets/signature-fallback.svg" alt=""></main><footer><span>Produto + experiência + engenharia</span><span>miguelzacca.dev ↗</span></footer></body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.locator("img").evaluate((img) => img.decode());
await page.screenshot({ path: "assets/portfolio-social.png" });
await browser.close();
