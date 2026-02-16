/**
 * Directus Schema Setup Script
 * 
 * Run this after Directus is up to create all collections, fields, and roles.
 * Usage: node scripts/setup-schema.js
 * 
 * Requires: DIRECTUS_URL, ADMIN_EMAIL, ADMIN_PASSWORD env vars
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@asigurari.ro';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';

let TOKEN = '';

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
    
    if (!res.ok) {
        // Ignore "already exists" errors
        if (res.status === 400 && text.includes('already exists')) {
            console.log(`  ⚠ Already exists, skipping: ${path}`);
            return null;
        }
        console.error(`  ✗ ${method} ${path} → ${res.status}: ${text}`);
        return null;
    }
    
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function login() {
    const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const data = await res.json();
    TOKEN = data.data.access_token;
    console.log('✓ Logged in as admin');
}

// ============================================================
// Collections
// ============================================================

async function createCollections() {
    console.log('\n=== Creating Collections ===');

    // blog_categories
    await request('POST', '/collections', {
        collection: 'blog_categories',
        meta: { icon: 'category', note: 'Blog categories (RCA, Casco, Travel, etc.)', sort_field: 'sort' },
        schema: {},
    });
    console.log('✓ blog_categories');

    // blog_tags
    await request('POST', '/collections', {
        collection: 'blog_tags',
        meta: { icon: 'label', note: 'Blog tags for articles' },
        schema: {},
    });
    console.log('✓ blog_tags');

    // blog_posts
    await request('POST', '/collections', {
        collection: 'blog_posts',
        meta: { icon: 'article', note: 'Blog articles', archive_field: 'status', archive_value: 'archived', unarchive_value: 'draft', sort_field: 'sort' },
        schema: {},
    });
    console.log('✓ blog_posts');

    // blog_posts_tags (junction)
    await request('POST', '/collections', {
        collection: 'blog_posts_tags',
        meta: { icon: 'link', hidden: true },
        schema: {},
    });
    console.log('✓ blog_posts_tags');

    // blog_comments
    await request('POST', '/collections', {
        collection: 'blog_comments',
        meta: { icon: 'comment', note: 'User comments on blog posts' },
        schema: {},
    });
    console.log('✓ blog_comments');

    // newsletter_subscribers
    await request('POST', '/collections', {
        collection: 'newsletter_subscribers',
        meta: { icon: 'mail', note: 'Newsletter email subscribers' },
        schema: {},
    });
    console.log('✓ newsletter_subscribers');
}

// ============================================================
// Fields
// ============================================================

async function createFields() {
    console.log('\n=== Creating Fields ===');

    // --- blog_categories fields ---
    const catFields = [
        { field: 'name', type: 'string', meta: { required: true, width: 'half', interface: 'input', note: 'Category display name' }, schema: { is_nullable: false } },
        { field: 'slug', type: 'string', meta: { required: true, width: 'half', interface: 'input', note: 'URL slug (auto-generated)' }, schema: { is_unique: true, is_nullable: false } },
        { field: 'system_key', type: 'string', meta: { required: true, width: 'half', interface: 'select-dropdown', options: { choices: [
            { text: 'RCA', value: 'rca' }, { text: 'Casco', value: 'casco' }, { text: 'Travel', value: 'travel' },
            { text: 'Home', value: 'home' }, { text: 'Common', value: 'common' }, { text: 'Health', value: 'health' },
            { text: 'Life', value: 'life' }, { text: 'Accidents', value: 'accidents' }, { text: 'Breakdown', value: 'breakdown' },
            { text: 'CMR', value: 'cmr' }, { text: 'Malpraxis', value: 'malpraxis' },
        ]}, note: 'System key matching URL pattern' }, schema: { is_unique: true, is_nullable: false } },
        { field: 'description', type: 'text', meta: { width: 'full', interface: 'input-multiline' }, schema: { is_nullable: true } },
        { field: 'icon', type: 'string', meta: { width: 'half', interface: 'input', note: 'FontAwesome icon class' }, schema: { is_nullable: true } },
        { field: 'sort', type: 'integer', meta: { width: 'half', interface: 'input', hidden: true }, schema: { default_value: 0 } },
    ];
    for (const f of catFields) {
        await request('POST', '/fields/blog_categories', f);
    }
    console.log('✓ blog_categories fields');

    // --- blog_tags fields ---
    const tagFields = [
        { field: 'name', type: 'string', meta: { required: true, width: 'half', interface: 'input' }, schema: { is_nullable: false } },
        { field: 'slug', type: 'string', meta: { required: true, width: 'half', interface: 'input' }, schema: { is_unique: true, is_nullable: false } },
    ];
    for (const f of tagFields) {
        await request('POST', '/fields/blog_tags', f);
    }
    console.log('✓ blog_tags fields');

    // --- blog_posts fields ---
    const postFields = [
        // Core content
        { field: 'title', type: 'string', meta: { required: true, width: 'full', interface: 'input', sort: 1, note: 'Article title' }, schema: { is_nullable: false } },
        { field: 'slug', type: 'string', meta: { required: true, width: 'half', interface: 'input', sort: 2, note: 'URL slug (auto-generated from title)' }, schema: { is_unique: true, is_nullable: false } },
        { field: 'system', type: 'string', meta: { required: true, width: 'half', interface: 'select-dropdown', sort: 3, options: { choices: [
            { text: 'RCA', value: 'rca' }, { text: 'Casco', value: 'casco' }, { text: 'Călătorie', value: 'travel' },
            { text: 'Locuință', value: 'home' }, { text: 'General', value: 'common' }, { text: 'Sănătate', value: 'health' },
            { text: 'Viață', value: 'life' }, { text: 'Accidente', value: 'accidents' }, { text: 'Asistență Rutieră', value: 'breakdown' },
            { text: 'CMR', value: 'cmr' }, { text: 'Malpraxis', value: 'malpraxis' },
        ]}, note: 'Insurance system category' }, schema: { is_nullable: false } },
        { field: 'status', type: 'string', meta: { required: true, width: 'half', interface: 'select-dropdown', sort: 4, options: { choices: [
            { text: 'Draft', value: 'draft' }, { text: 'Pending Review', value: 'pending_review' },
            { text: 'Published', value: 'published' }, { text: 'Archived', value: 'archived' },
        ]}, note: 'Publication status' }, schema: { default_value: 'draft', is_nullable: false } },
        { field: 'content', type: 'text', meta: { width: 'full', interface: 'input-rich-text-html', sort: 5, note: 'Full article HTML content' }, schema: { is_nullable: true } },
        { field: 'excerpt', type: 'text', meta: { width: 'full', interface: 'input-multiline', sort: 6, note: 'Short excerpt (max 300 chars)' }, schema: { is_nullable: true } },
        { field: 'intro_text', type: 'text', meta: { width: 'full', interface: 'input-multiline', sort: 7, note: 'Intro paragraphs (pipe-separated)' }, schema: { is_nullable: true } },
        { field: 'conclusion', type: 'text', meta: { width: 'full', interface: 'input-multiline', sort: 8, note: 'Conclusion paragraphs (pipe-separated)' }, schema: { is_nullable: true } },

        // Images
        { field: 'featured_image', type: 'uuid', meta: { width: 'half', interface: 'file-image', sort: 9, note: 'Featured image' }, schema: { is_nullable: true }, relation: { related_collection: 'directus_files' } },
        { field: 'featured_image_alt', type: 'string', meta: { width: 'half', interface: 'input', sort: 10, note: 'Alt text for featured image' }, schema: { is_nullable: true } },
        { field: 'featured_image_url', type: 'string', meta: { width: 'full', interface: 'input', sort: 11, note: 'External image URL (for migrated articles)' }, schema: { is_nullable: true } },

        // Structured content (for Twig-compatible rendering)
        { field: 'toc_items', type: 'json', meta: { width: 'full', interface: 'input-code', sort: 12, options: { language: 'json' }, note: 'Table of contents: [{href, title}]' }, schema: { is_nullable: true } },
        { field: 'content_sections', type: 'json', meta: { width: 'full', interface: 'input-code', sort: 13, options: { language: 'json' }, note: 'Structured sections matching Twig format' }, schema: { is_nullable: true } },

        // Author
        { field: 'author', type: 'uuid', meta: { width: 'half', interface: 'select-dropdown-m2o', sort: 14, note: 'Author (Directus user)' }, schema: { is_nullable: true }, relation: { related_collection: 'directus_users' } },
        { field: 'author_display_name', type: 'string', meta: { width: 'half', interface: 'input', sort: 15, note: 'Public display name (or "Anonim")' }, schema: { default_value: 'Echipa asigurari.ro', is_nullable: true } },

        // Category
        { field: 'category', type: 'uuid', meta: { width: 'half', interface: 'select-dropdown-m2o', sort: 16, note: 'Blog category' }, schema: { is_nullable: true }, relation: { related_collection: 'blog_categories' } },

        // Publication
        { field: 'published_at', type: 'timestamp', meta: { width: 'half', interface: 'datetime', sort: 17, note: 'Publication date' }, schema: { is_nullable: true } },
        { field: 'reading_time', type: 'integer', meta: { width: 'half', interface: 'input', sort: 18, note: 'Reading time in minutes (auto-calculated)' }, schema: { default_value: 0, is_nullable: true } },

        // SEO
        { field: 'seo_meta_title', type: 'string', meta: { width: 'full', interface: 'input', sort: 19, group: 'seo_group', note: 'Override <title> tag' }, schema: { is_nullable: true } },
        { field: 'seo_meta_description', type: 'text', meta: { width: 'full', interface: 'input-multiline', sort: 20, group: 'seo_group', note: 'Override meta description' }, schema: { is_nullable: true } },
        { field: 'seo_keywords', type: 'json', meta: { width: 'full', interface: 'tags', sort: 21, group: 'seo_group', note: 'SEO keywords' }, schema: { is_nullable: true } },
        { field: 'seo_canonical_url', type: 'string', meta: { width: 'full', interface: 'input', sort: 22, group: 'seo_group', note: 'Canonical URL override' }, schema: { is_nullable: true } },

        // Open Graph / Social
        { field: 'og_title', type: 'string', meta: { width: 'half', interface: 'input', sort: 23, group: 'social_group', note: 'Open Graph title' }, schema: { is_nullable: true } },
        { field: 'og_description', type: 'text', meta: { width: 'half', interface: 'input-multiline', sort: 24, group: 'social_group' }, schema: { is_nullable: true } },
        { field: 'og_image', type: 'uuid', meta: { width: 'half', interface: 'file-image', sort: 25, group: 'social_group', note: 'OG image (defaults to featured)' }, schema: { is_nullable: true }, relation: { related_collection: 'directus_files' } },
        { field: 'social_posted', type: 'json', meta: { width: 'full', interface: 'input-code', sort: 26, group: 'social_group', note: 'Social media posting status' }, schema: { default_value: '{}', is_nullable: true } },

        // Stats
        { field: 'stats_views', type: 'integer', meta: { width: 'quarter', interface: 'input', sort: 27, group: 'stats_group', readonly: true }, schema: { default_value: 0 } },
        { field: 'stats_likes', type: 'integer', meta: { width: 'quarter', interface: 'input', sort: 28, group: 'stats_group', readonly: true }, schema: { default_value: 0 } },
        { field: 'stats_shares', type: 'integer', meta: { width: 'quarter', interface: 'input', sort: 29, group: 'stats_group', readonly: true }, schema: { default_value: 0 } },
        { field: 'stats_comments', type: 'integer', meta: { width: 'quarter', interface: 'input', sort: 30, group: 'stats_group', readonly: true }, schema: { default_value: 0 } },

        // Internal
        { field: 'mongo_id', type: 'string', meta: { width: 'half', interface: 'input', sort: 31, hidden: true, note: 'MongoDB ObjectId reference' }, schema: { is_nullable: true } },
        { field: 'version', type: 'integer', meta: { width: 'half', interface: 'input', sort: 32, hidden: true }, schema: { default_value: 1 } },
        { field: 'sort', type: 'integer', meta: { hidden: true }, schema: { is_nullable: true } },
    ];

    // Create field groups first
    await request('POST', '/fields/blog_posts', { field: 'seo_group', type: 'alias', meta: { interface: 'group-detail', special: ['alias', 'no-data', 'group'], options: { start: 'closed' }, sort: 19 } });
    await request('POST', '/fields/blog_posts', { field: 'social_group', type: 'alias', meta: { interface: 'group-detail', special: ['alias', 'no-data', 'group'], options: { start: 'closed' }, sort: 23 } });
    await request('POST', '/fields/blog_posts', { field: 'stats_group', type: 'alias', meta: { interface: 'group-detail', special: ['alias', 'no-data', 'group'], options: { start: 'closed' }, sort: 27 } });

    for (const f of postFields) {
        await request('POST', '/fields/blog_posts', f);
    }
    console.log('✓ blog_posts fields');

    // --- blog_posts_tags junction fields ---
    const junctionFields = [
        { field: 'blog_posts_id', type: 'uuid', schema: { is_nullable: false }, relation: { related_collection: 'blog_posts' } },
        { field: 'blog_tags_id', type: 'uuid', schema: { is_nullable: false }, relation: { related_collection: 'blog_tags' } },
    ];
    for (const f of junctionFields) {
        await request('POST', '/fields/blog_posts_tags', f);
    }

    // M2M relation: blog_posts.tags
    await request('POST', '/fields/blog_posts', {
        field: 'tags',
        type: 'alias',
        meta: { interface: 'list-m2m', special: ['m2m'], sort: 16, width: 'full', note: 'Article tags' },
        relation: {
            related_collection: 'blog_tags',
            meta: { junction_field: 'blog_tags_id', one_field: 'tags' },
        },
    });
    console.log('✓ blog_posts_tags junction');

    // --- blog_comments fields ---
    const commentFields = [
        { field: 'post', type: 'uuid', meta: { required: true, width: 'half', interface: 'select-dropdown-m2o' }, schema: { is_nullable: false }, relation: { related_collection: 'blog_posts' } },
        { field: 'author_name', type: 'string', meta: { required: true, width: 'half', interface: 'input' }, schema: { is_nullable: false } },
        { field: 'author_email', type: 'string', meta: { width: 'half', interface: 'input', note: 'Not displayed publicly' }, schema: { is_nullable: true } },
        { field: 'content', type: 'text', meta: { required: true, width: 'full', interface: 'input-multiline' }, schema: { is_nullable: false } },
        { field: 'status', type: 'string', meta: { required: true, width: 'half', interface: 'select-dropdown', options: { choices: [
            { text: 'Pending', value: 'pending' }, { text: 'Approved', value: 'approved' }, { text: 'Spam', value: 'spam' },
        ]} }, schema: { default_value: 'pending', is_nullable: false } },
        { field: 'parent_comment', type: 'uuid', meta: { width: 'half', interface: 'select-dropdown-m2o', note: 'For nested replies' }, schema: { is_nullable: true }, relation: { related_collection: 'blog_comments' } },
    ];
    for (const f of commentFields) {
        await request('POST', '/fields/blog_comments', f);
    }
    console.log('✓ blog_comments fields');

    // --- newsletter_subscribers fields ---
    const nlFields = [
        { field: 'email', type: 'string', meta: { required: true, width: 'half', interface: 'input' }, schema: { is_unique: true, is_nullable: false } },
        { field: 'name', type: 'string', meta: { width: 'half', interface: 'input' }, schema: { is_nullable: true } },
        { field: 'confirmed', type: 'boolean', meta: { width: 'half', interface: 'boolean' }, schema: { default_value: false } },
        { field: 'subscribed_at', type: 'timestamp', meta: { width: 'half', interface: 'datetime' }, schema: { is_nullable: true } },
        { field: 'unsubscribed_at', type: 'timestamp', meta: { width: 'half', interface: 'datetime' }, schema: { is_nullable: true } },
    ];
    for (const f of nlFields) {
        await request('POST', '/fields/newsletter_subscribers', f);
    }
    console.log('✓ newsletter_subscribers fields');
}

// ============================================================
// Roles & Permissions
// ============================================================

async function createRoles() {
    console.log('\n=== Creating Roles ===');

    // Editor role
    const editor = await request('POST', '/roles', {
        name: 'Editor',
        icon: 'edit',
        description: 'Can create, edit, and publish blog posts',
        admin_access: false,
        app_access: true,
    });
    if (editor) console.log('✓ Editor role:', editor.data?.id);

    // Contributor role
    const contributor = await request('POST', '/roles', {
        name: 'Contributor',
        icon: 'person_add',
        description: 'Can create draft blog posts for review',
        admin_access: false,
        app_access: true,
    });
    if (contributor) console.log('✓ Contributor role:', contributor.data?.id);

    return { editorId: editor?.data?.id, contributorId: contributor?.data?.id };
}

async function createPermissions(roles) {
    console.log('\n=== Creating Permissions ===');

    if (roles.editorId) {
        // Editor: full CRUD on blog collections
        for (const collection of ['blog_posts', 'blog_categories', 'blog_tags', 'blog_comments', 'blog_posts_tags', 'newsletter_subscribers']) {
            for (const action of ['create', 'read', 'update', 'delete']) {
                await request('POST', '/permissions', {
                    role: roles.editorId,
                    collection,
                    action,
                    fields: ['*'],
                });
            }
        }
        // Editor can also read/upload files
        for (const action of ['create', 'read']) {
            await request('POST', '/permissions', {
                role: roles.editorId,
                collection: 'directus_files',
                action,
                fields: ['*'],
            });
        }
        console.log('✓ Editor permissions');
    }

    if (roles.contributorId) {
        // Contributor: create drafts only, read own posts
        await request('POST', '/permissions', {
            role: roles.contributorId,
            collection: 'blog_posts',
            action: 'create',
            fields: ['title', 'slug', 'system', 'content', 'excerpt', 'intro_text', 'featured_image', 'featured_image_alt', 'tags', 'author_display_name', 'category'],
            presets: { status: 'draft' },
        });
        await request('POST', '/permissions', {
            role: roles.contributorId,
            collection: 'blog_posts',
            action: 'read',
            fields: ['*'],
            permissions: { _and: [{ user_created: { _eq: '$CURRENT_USER' } }] },
        });
        await request('POST', '/permissions', {
            role: roles.contributorId,
            collection: 'blog_posts',
            action: 'update',
            fields: ['title', 'slug', 'system', 'content', 'excerpt', 'intro_text', 'featured_image', 'featured_image_alt', 'tags', 'author_display_name', 'category'],
            permissions: { _and: [{ user_created: { _eq: '$CURRENT_USER' } }, { status: { _eq: 'draft' } }] },
        });
        // Contributor can read categories and tags
        for (const collection of ['blog_categories', 'blog_tags']) {
            await request('POST', '/permissions', {
                role: roles.contributorId,
                collection,
                action: 'read',
                fields: ['*'],
            });
        }
        // Contributor can upload files
        await request('POST', '/permissions', {
            role: roles.contributorId,
            collection: 'directus_files',
            action: 'create',
            fields: ['*'],
        });
        console.log('✓ Contributor permissions');
    }

    // Public permissions (no role = public)
    const publicPerms = [
        { collection: 'blog_posts', action: 'read', fields: ['*'], permissions: { _and: [{ status: { _eq: 'published' } }] } },
        { collection: 'blog_categories', action: 'read', fields: ['*'] },
        { collection: 'blog_tags', action: 'read', fields: ['*'] },
        { collection: 'blog_comments', action: 'read', fields: ['id', 'post', 'author_name', 'content', 'status', 'parent_comment', 'date_created'], permissions: { _and: [{ status: { _eq: 'approved' } }] } },
        { collection: 'blog_comments', action: 'create', fields: ['post', 'author_name', 'author_email', 'content', 'parent_comment'], presets: { status: 'pending' } },
        { collection: 'newsletter_subscribers', action: 'create', fields: ['email', 'name'] },
    ];
    for (const perm of publicPerms) {
        await request('POST', '/permissions', { role: null, ...perm });
    }
    console.log('✓ Public permissions');
}

// ============================================================
// Seed Categories
// ============================================================

async function seedCategories() {
    console.log('\n=== Seeding Categories ===');

    const categories = [
        { name: 'RCA', slug: 'rca', system_key: 'rca', description: 'Asigurare de Răspundere Civilă Auto', icon: 'fas fa-car', sort: 1 },
        { name: 'Casco', slug: 'casco', system_key: 'casco', description: 'Asigurare Casco pentru autovehicule', icon: 'fas fa-shield-alt', sort: 2 },
        { name: 'Călătorie', slug: 'travel', system_key: 'travel', description: 'Asigurare de călătorie', icon: 'fas fa-plane', sort: 3 },
        { name: 'Locuință', slug: 'home', system_key: 'home', description: 'Asigurare de locuință', icon: 'fas fa-home', sort: 4 },
        { name: 'General', slug: 'common', system_key: 'common', description: 'Articole generale despre asigurări', icon: 'fas fa-newspaper', sort: 5 },
        { name: 'Sănătate', slug: 'health', system_key: 'health', description: 'Asigurare de sănătate', icon: 'fas fa-heartbeat', sort: 6 },
        { name: 'Viață', slug: 'life', system_key: 'life', description: 'Asigurare de viață', icon: 'fas fa-heart', sort: 7 },
        { name: 'Accidente Persoane', slug: 'accidents', system_key: 'accidents', description: 'Asigurare de accidente persoane', icon: 'fas fa-user-shield', sort: 8 },
        { name: 'Asistență Rutieră', slug: 'breakdown', system_key: 'breakdown', description: 'Asigurare de asistență rutieră', icon: 'fas fa-truck-pickup', sort: 9 },
        { name: 'CMR', slug: 'cmr', system_key: 'cmr', description: 'Asigurare CMR transport marfă', icon: 'fas fa-truck', sort: 10 },
        { name: 'Malpraxis', slug: 'malpraxis', system_key: 'malpraxis', description: 'Asigurare de malpraxis medical', icon: 'fas fa-stethoscope', sort: 11 },
    ];

    for (const cat of categories) {
        await request('POST', '/items/blog_categories', cat);
    }
    console.log('✓ 11 categories seeded');
}

// ============================================================
// Main
// ============================================================

async function main() {
    console.log('=== Directus Schema Setup ===');
    console.log(`URL: ${DIRECTUS_URL}`);

    await login();
    await createCollections();
    await createFields();
    const roles = await createRoles();
    await createPermissions(roles);
    await seedCategories();

    console.log('\n=== Setup Complete! ===');
    console.log('Next steps:');
    console.log('1. Run the Twig → MongoDB migration command');
    console.log('2. Sync migrated data to Directus via API');
}

main().catch(console.error);
