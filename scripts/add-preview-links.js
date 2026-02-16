/**
 * Add preview_url field to blog_posts and populate all articles with preview links.
 * 
 * Usage: node scripts/add-preview-links.js
 */

const crypto = require('crypto');

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@asigurari.ro';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';
const PREVIEW_SECRET = 'ee4016c8434b8bfac95a92cb7cc44bb9'; // Symfony kernel.secret
const SITE_URL = process.env.SITE_URL || 'http://localhost'; // Change to https://www.asigurari.ro in production

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

function generatePreviewUrl(slug) {
    const token = crypto.createHmac('sha256', PREVIEW_SECRET).update(slug).digest('hex');
    return `${SITE_URL}/blog/preview/${token}/${slug}`;
}

async function main() {
    // Authenticate
    const auth = await api('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    TOKEN = auth.data?.access_token;
    if (!TOKEN) throw new Error('Auth failed');
    console.log('✓ Authenticated');

    // Step 1: Add preview_url field if it doesn't exist
    console.log('\nAdding preview_url field...');
    const fieldResult = await api('POST', '/fields/blog_posts', {
        field: 'preview_url',
        type: 'string',
        meta: {
            interface: 'presentation-links',
            display: 'formatted-value',
            display_options: {
                format_value: '{{value}}'
            },
            readonly: true,
            hidden: false,
            width: 'full',
            sort: 99,
            note: 'Link de preview — click pentru a vedea articolul inainte de publicare',
            options: {
                links: [
                    {
                        label: '👁️ Preview Articol',
                        icon: 'visibility',
                        type: 'url',
                        url: '{{preview_url}}'
                    }
                ]
            }
        },
        schema: {
            data_type: 'varchar',
            max_length: 500,
            is_nullable: true,
        }
    });
    
    if (fieldResult?.errors) {
        // Field might already exist
        console.log('  Field may already exist, continuing...');
    } else {
        console.log('✓ preview_url field created');
    }

    // Step 2: Get all blog posts
    console.log('\nFetching all blog posts...');
    let allPosts = [];
    let page = 1;
    const limit = 100;
    
    while (true) {
        const result = await api('GET', `/items/blog_posts?fields=id,slug&limit=${limit}&page=${page}`);
        if (!result?.data?.length) break;
        allPosts = allPosts.concat(result.data);
        if (result.data.length < limit) break;
        page++;
    }
    
    console.log(`Found ${allPosts.length} posts`);

    // Step 3: Update each post with preview_url
    let updated = 0;
    for (const post of allPosts) {
        if (!post.slug) continue;
        
        const previewUrl = generatePreviewUrl(post.slug);
        await api('PATCH', `/items/blog_posts/${post.id}`, {
            preview_url: previewUrl
        });
        updated++;
        
        if (updated % 50 === 0) {
            console.log(`  Updated ${updated}/${allPosts.length}...`);
        }
    }

    console.log(`\n✓ Done! Updated ${updated} posts with preview links`);
    console.log(`\nPreview links use: ${SITE_URL}/blog/preview/{token}/{slug}`);
    console.log('Change SITE_URL for production.');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
