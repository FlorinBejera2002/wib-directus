/**
 * Fix preview_url field in blog_posts and news to be a clickable link.
 * Deletes the old field and recreates it as a simple string with proper display.
 * 
 * Usage: node scripts/fix-preview-field.js
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
    const text = await res.text();
    try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; } catch { return { ok: res.ok, status: res.status, data: text }; }
}

async function fixCollection(collection, idField, buildUrl) {
    console.log(`\n📝 Fixing ${collection}...`);

    // Step 1: Read all current preview URLs and IDs
    let allItems = [], page = 1;
    while (true) {
        const r = await api('GET', `/items/${collection}?fields=id&limit=100&page=${page}`);
        if (!r.data?.data?.length) break;
        allItems = allItems.concat(r.data.data);
        if (r.data.data.length < 100) break;
        page++;
    }
    console.log(`  Found ${allItems.length} items`);

    // Step 2: Delete old field
    console.log('  Deleting old preview_url field...');
    const del = await api('DELETE', `/fields/${collection}/preview_url`);
    if (del.ok) console.log('  ✓ Deleted');
    else console.log(`  → Delete status: ${del.status} (may not exist)`);

    // Step 3: Wait a moment
    await new Promise(r => setTimeout(r, 1000));

    // Step 4: Create new field as simple input with proper note
    console.log('  Creating new preview_url field...');
    const create = await api('POST', `/fields/${collection}`, {
        field: 'preview_url',
        type: 'string',
        meta: {
            interface: 'input',
            display: 'formatted-value',
            display_options: {
                format_value: '<a href="{{value}}" target="_blank" style="color:#2563eb;text-decoration:underline;font-weight:600;">👁️ Deschide Preview</a>',
            },
            width: 'full',
            note: 'Click pe link-ul albastru de mai sus pentru a vedea preview-ul articolului',
            readonly: true,
            sort: 99,
        },
        schema: {},
    });
    if (create.ok) console.log('  ✓ Created');
    else console.log(`  ✗ Create failed: ${JSON.stringify(create.data).substring(0, 200)}`);

    // Step 5: Populate preview URLs
    console.log('  Setting preview URLs...');
    for (const item of allItems) {
        const url = buildUrl(item.id);
        await api('PATCH', `/items/${collection}/${item.id}`, { preview_url: url });
    }
    console.log(`  ✓ Updated ${allItems.length} items`);
}

async function main() {
    const auth = await api('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    TOKEN = auth.data?.data?.access_token;
    if (!TOKEN) throw new Error('Auth failed');
    console.log('✓ Authenticated');

    await fixCollection('blog_posts', 'id', (id) =>
        `${PREVIEW_URL}/?id=${id}&token=${STATIC_TOKEN}`
    );

    await fixCollection('news', 'id', (id) =>
        `${PREVIEW_URL}/?collection=news&id=${id}&token=${STATIC_TOKEN}`
    );

    console.log('\n🎉 Done! Preview links are now clickable in both collections.');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
