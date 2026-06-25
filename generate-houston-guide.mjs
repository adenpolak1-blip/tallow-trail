import { mkdir, readFile, writeFile } from 'node:fs/promises';

const siteUrl = 'https://tallow-trail.vercel.app';
const restaurants = JSON.parse(await readFile('restaurants.json', 'utf8'));
const chains = JSON.parse(await readFile('chains.json', 'utf8'));
const indexHtml = await readFile('index.html', 'utf8');
const css = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
const cleanRestaurants = restaurants.filter((restaurant) => restaurant.verdict === 'clean');

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cleanSummary(restaurant) {
  return `${restaurant.cooks_in}. Order: ${restaurant.order_this}.`;
}

function chainSummary(chain) {
  return `${chain.order_this} ${chain.skip_this}`;
}

const faq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What Houston restaurants are seed-oil-free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `Ren lists these fully clean Houston options: ${cleanRestaurants.map((restaurant) => restaurant.name).join(', ')}.`
      }
    },
    {
      '@type': 'Question',
      name: 'Where can I eat seed-oil-free in Houston?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Start with fully clean restaurants, then use order-around rules at normal restaurants: choose grilled or pan-cooked proteins, ask for butter or olive oil, skip unknown fryers, and confirm sauces.'
      }
    },
    {
      '@type': 'Question',
      name: 'What oil does Buff Burger use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Buff Burger is listed with grass-fed beef and fries in beef tallow.'
      }
    },
    {
      '@type': 'Question',
      name: 'Does Cottonwood use seed oils?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Cottonwood is listed as clean with a 100% beef tallow fryer. Confirm sauces and dressings before ordering.'
      }
    }
  ]
};

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Seed-oil-free restaurants in Houston — Complete 2026 guide — Ren</title>
<meta name="description" content="The 2026 Ren guide to seed-oil-free restaurants in Houston, fully clean spots, order-around rules, and chain orders that work.">
<link rel="canonical" href="${siteUrl}/guide/houston">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>${css}
  .crumb{display:inline-block;margin:28px 0 0;font-family:"Space Mono",monospace;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;}
  .guide-page{padding:34px 0 44px;}
  .guide-intro{font-size:19px;max-width:64ch;color:var(--ink-soft);}
  .guide-list{display:grid;gap:14px;margin-top:24px;}
  .guide-item{background:var(--cream);border:1px solid var(--rule);border-left:5px solid var(--clean);border-radius:3px;padding:18px 20px;}
  .guide-item.around{border-left-color:var(--around);}
  .guide-item h3{font-family:"Oswald",sans-serif;font-weight:600;font-size:22px;line-height:1.08;margin:0 0 6px;}
  .guide-item p{font-size:16.5px;line-height:1.45;color:var(--ink-soft);margin:0;}
  .tips{display:grid;gap:10px;margin:22px 0 0;padding-left:20px;color:var(--ink-soft);}
  .tips li{padding-left:4px;}
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

<main class="wrap guide-page">
  <a class="crumb" href="/">← Back to reports</a>

  <section>
    <div class="sec-eyebrow">Houston guide · 2026</div>
    <h1 class="sec-title">How to eat seed-oil-free in Houston (2026 guide)</h1>
    <p class="guide-intro">Most restaurant kitchens rely on soybean, canola, sunflower, rice bran, or blended vegetable oils because they are cheap, neutral, and easy to run through a fryer. That makes seed-oil-free dining hard if you only ask whether a restaurant is “healthy.” The real question is what fat touches the grill, fryer, sauces, dressings, and roasted sides.</p>
    <p class="guide-intro">Houston is better than most cities for this because the food scene is broad, meat-forward, and unusually responsive to direct kitchen questions. You can find fully clean spots using beef tallow, butter, olive oil, avocado oil, or coconut oil, and you can still eat well at mixed-oil restaurants if you know what to order around.</p>
    <p class="guide-intro">Use this guide as the starting point: pick fully clean restaurants when you can, use the order-around rules when you cannot, and confirm details with the server because kitchens change suppliers and prep methods.</p>
  </section>

  <section>
    <div class="sec-eyebrow">Verified clean</div>
    <h2 class="sec-title">The fully clean spots</h2>
    <p class="sec-note">These are the Houston reports currently marked clean in Ren.</p>
    <div class="guide-list">
${cleanRestaurants.map((restaurant) => `      <article class="guide-item">
        <h3><a href="/restaurant/${escapeHtml(restaurant.slug)}">${escapeHtml(restaurant.name)}</a></h3>
        <p>${escapeHtml(cleanSummary(restaurant))}</p>
      </article>`).join('\n')}
    </div>
  </section>

  <section>
    <div class="sec-eyebrow">Ordering rules</div>
    <h2 class="sec-title">How to order clean at any Houston restaurant</h2>
    <p class="sec-note">Most restaurants are not fully clean, but many still have a workable order if you keep the request simple and specific.</p>
    <ul class="tips">
      <li>Choose grilled, broiled, smoked, or pan-cooked proteins instead of fried items.</li>
      <li>Ask for butter, olive oil, avocado oil, or no oil on the grill or pan.</li>
      <li>Skip fryers unless the restaurant confirms beef tallow, coconut oil, or another clean fat.</li>
      <li>Ask about sauces, dressings, aiolis, marinades, and roasted vegetables because seed oils often hide there.</li>
      <li>At Tex-Mex spots, build around grilled fajita meat, salsa, sour cream, cheese, avocado, and beans only when the bean fat is confirmed.</li>
      <li>When in doubt, order a plain protein, simple vegetable, and sauce on the side.</li>
    </ul>
  </section>

  <section>
    <div class="sec-eyebrow">National chains</div>
    <h2 class="sec-title">The chain order-arounds</h2>
    <p class="sec-note">These are not fully clean restaurants. They are repeatable chain orders that avoid the worst default prep.</p>
    <div class="guide-list">
${chains.map((chain) => `      <article class="guide-item around">
        <h3><a href="/chains/${escapeHtml(chain.slug)}">${escapeHtml(chain.name)}</a></h3>
        <p>${escapeHtml(chainSummary(chain))}</p>
      </article>`).join('\n')}
    </div>
  </section>

  <section class="faq">
    <div class="sec-eyebrow">FAQ</div>
    <h2 class="sec-title">Houston seed-oil-free dining questions</h2>
    <div style="margin-top:20px;">
      <details open>
        <summary>What Houston restaurants are seed-oil-free?</summary>
        <p>Ren currently lists these fully clean Houston options: ${escapeHtml(cleanRestaurants.map((restaurant) => restaurant.name).join(', '))}.</p>
      </details>
      <details>
        <summary>Where can I eat seed-oil-free in Houston?</summary>
        <p>Start with the fully clean spots above. At normal restaurants, order grilled or pan-cooked proteins, ask for butter or olive oil, skip unknown fryers, and confirm sauces.</p>
      </details>
      <details>
        <summary>What oil does Buff Burger use?</summary>
        <p>Buff Burger is listed with grass-fed beef and fries in beef tallow.</p>
      </details>
      <details>
        <summary>Does Cottonwood use seed oils?</summary>
        <p>Cottonwood is listed as clean with a 100% beef tallow fryer. Confirm sauces and dressings before ordering.</p>
      </details>
    </div>
  </section>
</main>

<script type="application/ld+json">
${JSON.stringify(faq, null, 2).replaceAll('</', '<\\/')}
</script>

</body>
</html>
`;

await mkdir('guide/houston', { recursive: true });
await writeFile('guide/houston/index.html', page);

console.log('Generated Houston guide page.');
