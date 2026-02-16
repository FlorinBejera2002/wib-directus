/**
 * Update preview_url in all blog posts to point to the preview SPA.
 * Format: http://localhost:8056/?id={id}&token={static_token}
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const PREVIEW_URL = process.env.PREVIEW_URL || 'http://localhost:8056';
const ADMIN_EMAIL = 'admin@asigurari.ro';
const ADMIN_PASSWORD = 'ChangeThisPassword123!';
const STATIC_TOKEN = 'preview-readonly-token-2026';

let TOKEN = '';

async function api(method, path, body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${DIRECTUS_URL}${path}`, opts);
    return res.json().catch(() => null);
}

async function main() {
    const auth = await api('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    TOKEN = auth?.data?.access_token;
    if (!TOKEN) throw new Error('Auth failed');
    console.log('✓ Authenticated');

    let allPosts = [], page = 1;
    while (true) {
        const r = await api('GET', `/items/blog_posts?fields=id&limit=100&page=${page}`);
        if (!r?.data?.length) break;
        allPosts = allPosts.concat(r.data);
        if (r.data.length < 100) break;
        page++;
    }
    console.log(`Found ${allPosts.length} posts`);

    let updated = 0;
    for (const post of allPosts) {
        const previewUrl = `${PREVIEW_URL}/?id=${post.id}&token=${STATIC_TOKEN}`;
        await api('PATCH', `/items/blog_posts/${post.id}`, { preview_url: previewUrl });
        updated++;
        if (updated % 50 === 0) console.log(`  Updated ${updated}/${allPosts.length}...`);
    }
    console.log(`\n✓ Done! ${updated} posts updated`);
    console.log(`Preview format: ${PREVIEW_URL}/?id={id}&token=${STATIC_TOKEN}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
