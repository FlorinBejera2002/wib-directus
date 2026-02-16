/**
 * Fix public permissions for blog_posts collection
 * Run this if blog API returns FORBIDDEN
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@asigurari.ro';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';

let TOKEN = '';

async function login() {
    const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const data = await res.json();
    if (!data.data?.access_token) {
        throw new Error('Auth failed: ' + JSON.stringify(data));
    }
    TOKEN = data.data.access_token;
    console.log('✓ Authenticated');
}

async function request(method, path, body = null) {
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
    try { 
        const json = JSON.parse(text);
        if (res.ok) return json;
        console.log(`✗ ${method} ${path} → ${res.status}: ${text.substring(0, 200)}`);
        return null;
    } catch { 
        return text; 
    }
}

async function deleteExistingPublicPermissions() {
    console.log('\n=== Deleting existing public permissions ===');
    const perms = await request('GET', '/permissions?filter[role][_null]=true&limit=-1');
    if (perms?.data) {
        for (const perm of perms.data) {
            await request('DELETE', `/permissions/${perm.id}`);
            console.log(`✓ Deleted permission ${perm.id} for ${perm.collection}`);
        }
    }
}

async function createPublicPermissions() {
    console.log('\n=== Creating public permissions ===');
    
    const publicPerms = [
        { 
            collection: 'blog_posts', 
            action: 'read', 
            fields: ['*'], 
            permissions: { _and: [{ status: { _eq: 'published' } }] } 
        },
        { 
            collection: 'blog_categories', 
            action: 'read', 
            fields: ['*'] 
        },
        { 
            collection: 'blog_tags', 
            action: 'read', 
            fields: ['*'] 
        },
        { 
            collection: 'blog_comments', 
            action: 'read', 
            fields: ['id', 'post', 'author_name', 'content', 'status', 'parent_comment', 'date_created'], 
            permissions: { _and: [{ status: { _eq: 'approved' } }] } 
        },
        { 
            collection: 'blog_comments', 
            action: 'create', 
            fields: ['post', 'author_name', 'author_email', 'content', 'parent_comment'], 
            presets: { status: 'pending' } 
        },
        { 
            collection: 'newsletter_subscribers', 
            action: 'create', 
            fields: ['email', 'name', 'confirmed', 'subscribed_at'] 
        },
        { 
            collection: 'news', 
            action: 'read', 
            fields: ['*'], 
            permissions: { _and: [{ status: { _eq: 'published' } }] } 
        },
    ];
    
    for (const perm of publicPerms) {
        const result = await request('POST', '/permissions', { role: null, ...perm });
        if (result) {
            console.log(`✓ Created ${perm.action} permission for ${perm.collection}`);
        }
    }
}

async function testPublicAccess() {
    console.log('\n=== Testing public access ===');
    
    // Test without auth
    const res = await fetch(`${DIRECTUS_URL}/items/blog_posts?aggregate[count]=id&limit=0`);
    const data = await res.json();
    
    if (res.ok) {
        const count = data.data?.[0]?.count?.id || 0;
        console.log(`✓ Public access works! Found ${count} blog posts`);
    } else {
        console.log(`✗ Public access failed: ${JSON.stringify(data)}`);
    }
}

async function main() {
    console.log('=== Fix Public Permissions ===');
    console.log(`URL: ${DIRECTUS_URL}`);
    
    await login();
    await deleteExistingPublicPermissions();
    await createPublicPermissions();
    await testPublicAccess();
    
    console.log('\n=== Done! ===');
}

main().catch(console.error);
