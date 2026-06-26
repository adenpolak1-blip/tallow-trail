const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ren-admin-2026';
const OWNER = process.env.GITHUB_OWNER || 'adenpolak1-blip';
const REPO = process.env.GITHUB_REPO || 'tallow-trail';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_API_BASE = 'https://api.github.com/';

const requiredFields = [
  'name',
  'slug',
  'neighborhood',
  'cuisine',
  'verdict',
  'cooks_in',
  'order_this',
  'source',
  'last_checked'
];

function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function absoluteUrl(value, label) {
  const raw = cleanString(value);
  if (!raw) {
    throw new Error(`Server is missing ${label}.`);
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} must be an absolute URL. Current value starts with: "${raw.slice(0, 40)}"`);
  }

  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error(`${label} must start with https:// or http://.`);
  }

  return url.toString();
}

function githubUrl(pathname, searchParams = {}) {
  const url = new URL(pathname.replace(/^\/+/, ''), GITHUB_API_BASE);
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function normalizeRestaurant(body) {
  const restaurant = {
    name: cleanString(body.name),
    slug: cleanString(body.slug),
    neighborhood: cleanString(body.neighborhood),
    cuisine: cleanString(body.cuisine),
    verdict: cleanString(body.verdict),
    cooks_in: cleanString(body.cooks_in),
    order_this: cleanString(body.order_this),
    skip_this: cleanString(body.skip_this),
    watch: cleanString(body.watch),
    source: cleanString(body.source),
    last_checked: cleanString(body.last_checked)
  };

  const missing = requiredFields.filter((field) => !restaurant[field]);
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  if (!['clean', 'around', 'avoid'].includes(restaurant.verdict)) {
    throw new Error('Verdict must be one of clean, around, avoid.');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(restaurant.slug)) {
    throw new Error('Slug must use lowercase letters, numbers, and hyphens only.');
  }

  return restaurant;
}

async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('Server is missing GITHUB_TOKEN.');
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || `GitHub request failed with ${response.status}`);
  }
  return data;
}

async function getFile(path) {
  const data = await githubRequest(githubUrl(
    `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/contents/${path}`,
    { ref: BRANCH }
  ));
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { content, sha: data.sha };
}

async function updateFile(path, content, sha, message) {
  return githubRequest(githubUrl(
    `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/contents/${path}`
  ), {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString('base64'),
      sha,
      branch: BRANCH
    })
  });
}

async function triggerDeploy() {
  const hook = absoluteUrl(process.env.VERCEL_DEPLOY_HOOK_URL, 'VERCEL_DEPLOY_HOOK_URL');
  const response = await fetch(hook, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Deploy hook failed with ${response.status}.`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || body.password !== ADMIN_PASSWORD) {
      send(res, 401, { error: 'Unauthorized.' });
      return;
    }

    const restaurant = normalizeRestaurant(body);
    const file = await getFile('restaurants.json');
    const restaurants = JSON.parse(file.content);

    if (restaurants.some((item) => item.slug === restaurant.slug)) {
      send(res, 409, { error: `A restaurant with slug "${restaurant.slug}" already exists.` });
      return;
    }

    restaurants.push(restaurant);
    const updated = `${JSON.stringify(restaurants, null, 2)}\n`;
    const result = await updateFile(
      'restaurants.json',
      updated,
      file.sha,
      `Add ${restaurant.name} restaurant report`
    );

    await triggerDeploy();

    send(res, 200, {
      ok: true,
      restaurant,
      commit: result.commit?.sha || null,
      deployTriggered: true
    });
  } catch (error) {
    send(res, 500, { error: error.message || 'Unexpected server error.' });
  }
};
