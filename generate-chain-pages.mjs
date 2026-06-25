import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const siteUrl = 'https://tallow-trail.vercel.app';
const chains = JSON.parse(await readFile('chains.json', 'utf8'));
const indexHtml = await readFile('index.html', 'utf8');
const css = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';

const verdictLabels = {
  clean: 'Clean',
  around: 'Order Around',
  avoid: 'Avoid'
};

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function doesAnswer(chain) {
  return `${chain.name} is an order-around chain for seed-oil-free diners. ${chain.cooks_in} ${chain.skip_this}`;
}

function orderAnswer(chain) {
  return `At ${chain.name}, order ${chain.order_this} ${chain.watch}`;
}

function detailRows(chain) {
  const rows = [
    ['Verdict', verdictLabels[chain.verdict]],
    ['Cooks in', chain.cooks_in],
    ['Order this', chain.order_this],
    ['Skip', chain.skip_this],
    ['Watch', chain.watch],
    ['Source', chain.source],
    ['Last checked', chain.last_checked]
  ];

  return rows.map(([key, value]) => `
          <div class="r-row"><span class="r-key">${escapeHtml(key)}</span><span class="r-val">${escapeHtml(value)}</span></div>`).join('');
}

function pageFor(chain) {
  const title = `How to eat seed-oil-free at ${chain.name} — Ren`;
  const description = `Seed-oil-free order-around guide for ${chain.name}: what to order, what to skip, and which oils or fryers to ask about.`;
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Does ${chain.name} use seed oils?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: doesAnswer(chain)
        }
      },
      {
        '@type': 'Question',
        name: `What can I order at ${chain.name} seed-oil-free?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: orderAnswer(chain)
        }
      }
    ]
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${siteUrl}/chains/${escapeHtml(chain.slug)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>${css}
  .crumb{display:inline-block;margin:28px 0 0;font-family:"Space Mono",monospace;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;}
  .restaurant-page{padding:34px 0 44px;}
  .restaurant-page .report{margin-top:24px;}
</style>
</head>
<body>

<header class="top">
  <div class="wrap">
    <div class="eyebrow">Chain order-around guide · Est. 2026</div>
    <div class="brand">Ren<span class="dot">.</span></div>
    <div class="tagline">
      <span>Eat seed-oil-free anywhere in Houston</span>
      <span>Updated June 25, 2026</span>
    </div>
  </div>
</header>

<main class="wrap restaurant-page">
  <a class="crumb" href="/">← Back to reports</a>

  <section>
    <div class="sec-eyebrow">Chain order-around</div>
    <h1 class="sec-title">How to eat seed-oil-free at ${escapeHtml(chain.name)}</h1>
    <p class="sec-note">${escapeHtml(orderAnswer(chain))}</p>

    <article class="report v-${escapeHtml(chain.verdict)}" data-verdict="v-${escapeHtml(chain.verdict)}">
      <div class="r-head">
        <div>
          <h2 class="r-name">${escapeHtml(chain.name)}</h2>
          <div class="r-meta">National chain · Order-around</div>
        </div>
        <span class="seal ${escapeHtml(chain.verdict)}">${escapeHtml(verdictLabels[chain.verdict])}</span>
      </div>
      <div class="r-body">${detailRows(chain)}
      </div>
      <div class="r-foot"><span>Source: ${escapeHtml(chain.source)}</span><span>Last checked ${escapeHtml(chain.last_checked)}</span></div>
    </article>
  </section>
</main>

<script type="application/ld+json">
${JSON.stringify(faq, null, 2).replaceAll('</', '<\\/')}
</script>

</body>
</html>
`;
}

await rm('chains', { recursive: true, force: true });

for (const chain of chains) {
  const dir = `chains/${chain.slug}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/index.html`, pageFor(chain));
}

console.log(`Generated ${chains.length} chain pages.`);
