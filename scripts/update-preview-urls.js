/**
 * Update preview_url field in all blog posts to point to Directus preview endpoint.
 * 
 * Usage: node scripts/update-preview-urls.js
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@asigurari.ro';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';

let TOKEN = '';

async function api(method, path, body = null) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`,
        },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${DIRECTUS_URL}${path}`, opts);
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
}

async function main() {
    const auth = await api('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    TOKEN = auth.data?.access_token;
    if (!TOKEN) throw new Error('Auth failed');
    console.log('✓ Authenticated');

    // Get all posts
    let allPosts = [];
    let page = 1;
    while (true) {
        const result = await api('GET', `/items/blog_posts?fields=id,slug&limit=100&page=${page}`);
        if (!result?.data?.length) break;
        allPosts = allPosts.concat(result.data);
        if (result.data.length < 100) break;
        page++;
    }
    console.log(`Found ${allPosts.length} posts`);

    let updated = 0;
    for (const post of allPosts) {
        // Preview URL points to Directus endpoint which renders full HTML preview
        const previewUrl = `${DIRECTUS_URL}/preview/${post.id}`;
        await api('PATCH', `/items/blog_posts/${post.id}`, { preview_url: previewUrl });
        updated++;
        if (updated % 50 === 0) console.log(`  Updated ${updated}/${allPosts.length}...`);
    }

    console.log(`\n✓ Done! Updated ${updated} posts`);
    console.log(`Preview URL format: ${DIRECTUS_URL}/preview/{id}`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
