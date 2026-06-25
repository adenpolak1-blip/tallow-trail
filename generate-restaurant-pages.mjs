import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const siteUrl = 'https://tallow-trail.vercel.app';
const city = 'Houston';
const restaurants = JSON.parse(await readFile('restaurants.json', 'utf8'));
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

function answerFor(restaurant) {
  if (restaurant.verdict === 'clean') {
    return `${restaurant.name} is listed as clean for seed-oil-free ordering in ${city}. They cook in ${restaurant.cooks_in}.`;
  }
  if (restaurant.verdict === 'around') {
    return `${restaurant.name} is an order-around restaurant in ${city}. They cook in ${restaurant.cooks_in}. Order ${restaurant.order_this}, and skip ${restaurant.skip_this}.`;
  }
  return `${restaurant.name} is listed as avoid for strict seed-oil-free diners in ${city}. They cook in ${restaurant.cooks_in}. If you must go, order ${restaurant.order_this}.`;
}

function detailRows(restaurant) {
  const rows = [
    ['Verdict', verdictLabels[restaurant.verdict]],
    ['Neighborhood', restaurant.neighborhood],
    ['Cuisine', restaurant.cuisine],
    ['Cooks in', restaurant.cooks_in],
    ['Order this', restaurant.order_this],
    ['Skip', restaurant.skip_this || 'No specific skip item listed. Confirm sauces, dressings, and specials before ordering.'],
    ['Watch', restaurant.watch || 'Confirm details with the kitchen before ordering.'],
    ['Source', restaurant.source],
    ['Last checked', restaurant.last_checked]
  ];

  return rows.map(([key, value]) => `
          <div class="r-row"><span class="r-key">${escapeHtml(key)}</span><span class="r-val">${escapeHtml(value)}</span></div>`).join('');
}

function pageFor(restaurant) {
  const title = `Is ${restaurant.name} seed-oil-free? — ${city}`;
  const description = `Seed-oil-free guide for ${restaurant.name} in ${city}: what they cook in, what to order, what to skip, and last checked date.`;
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Does ${restaurant.name} use seed oils?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answerFor(restaurant)
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
<link rel="canonical" href="${siteUrl}/restaurant/${escapeHtml(restaurant.slug)}">
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
    <div class="eyebrow">Houston field guide · Est. 2026</div>
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
    <div class="sec-eyebrow">Restaurant report · ${escapeHtml(city)}, TX</div>
    <h1 class="sec-title">Is ${escapeHtml(restaurant.name)} seed-oil-free?</h1>
    <p class="sec-note">${escapeHtml(answerFor(restaurant))}</p>

    <article class="report v-${escapeHtml(restaurant.verdict)}" data-verdict="v-${escapeHtml(restaurant.verdict)}">
      <div class="r-head">
        <div>
          <h2 class="r-name">${escapeHtml(restaurant.name)}</h2>
          <div class="r-meta">${escapeHtml(restaurant.neighborhood)} · ${escapeHtml(restaurant.cuisine)}</div>
        </div>
        <span class="seal ${escapeHtml(restaurant.verdict)}">${escapeHtml(verdictLabels[restaurant.verdict])}</span>
      </div>
      <div class="r-body">${detailRows(restaurant)}
      </div>
      <div class="r-foot"><span>Source: ${escapeHtml(restaurant.source)}</span><span>Last checked ${escapeHtml(restaurant.last_checked)}</span></div>
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

await rm('restaurant', { recursive: true, force: true });

for (const restaurant of restaurants) {
  const dir = `restaurant/${restaurant.slug}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/index.html`, pageFor(restaurant));
}

console.log(`Generated ${restaurants.length} restaurant pages.`);
