/**
 * Sync 203 blog posts from MongoDB → Directus
 * 
 * Usage: node scripts/sync-mongo-to-directus.js
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@asigurari.ro';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://192.168.0.31:27017';
const MONGO_DB = process.env.MONGO_DB || 'wib_test';

let TOKEN = '';

async function authenticate() {
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
    console.log('✓ Authenticated with Directus');
}

async function directusRequest(method, path, body = null) {
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
    // Dynamic import for mongodb (ESM)
    let MongoClient;
    try {
        const mongodb = await import('mongodb');
        MongoClient = mongodb.MongoClient;
    } catch (e) {
        console.error('mongodb package not found. Install it: npm install mongodb');
        console.log('Falling back to reading from Directus-compatible JSON...');
        return await syncFromFile();
    }

    await authenticate();

    // Connect to MongoDB
    console.log(`Connecting to MongoDB: ${MONGO_URI}/${MONGO_DB}...`);
    const client = new MongoClient(MONGO_URI, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    const db = client.db(MONGO_DB);
    const collection = db.collection('blog_posts');

    const posts = await collection.find({ status: 'published' }).toArray();
    console.log(`Found ${posts.length} published posts in MongoDB`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const post of posts) {
        process.stdout.write(`  [${post.system}] ${post.slug.substring(0, 60)}... `);

        // Check if already exists in Directus
        const existing = await directusRequest('GET',
            `/items/blog_posts?filter[slug][_eq]=${encodeURIComponent(post.slug)}&limit=1`);
        if (existing?.data?.length > 0) {
            console.log('SKIP (exists)');
            skipped++;
            continue;
        }

        const directusPost = {
            title: post.title || '',
            slug: post.slug || '',
            system: post.system || 'common',
            status: 'published',
            content: post.contentHtml || '',
            excerpt: post.excerpt || '',
            intro_text: post.introText || '',
            conclusion: post.conclusion || '',
            featured_image_url: post.featuredImageUrl || '',
            featured_image_alt: post.featuredImageAlt || '',
            author_display_name: post.authorDisplayName || 'Echipa asigurari.ro',
            reading_time: post.readingTime || 0,
            seo_meta_title: post.seo?.metaTitle || post.title || '',
            seo_meta_description: post.seo?.metaDescription || post.excerpt || '',
            seo_canonical_url: post.seo?.canonicalUrl || '',
            og_title: post.social?.ogTitle || '',
            og_description: post.social?.ogDescription || '',
            comments_enabled: true,
            published_at: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date().toISOString(),
        };

        const result = await directusRequest('POST', '/items/blog_posts', directusPost);
        if (result?.data?.id) {
            console.log('OK');
            created++;
        } else {
            console.log('ERROR: ' + JSON.stringify(result).substring(0, 200));
            errors++;
        }

        // Small delay to avoid overwhelming Directus
        await new Promise(r => setTimeout(r, 50));
    }

    console.log(`\nSync complete: ${created} created, ${skipped} skipped, ${errors} errors`);
    await client.close();
}

main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
