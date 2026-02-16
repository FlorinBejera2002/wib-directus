/**
 * Directus Hook: Sync blog_posts to MongoDB
 *
 * When a blog post is created/updated/deleted in Directus,
 * this hook syncs the data to MongoDB so Symfony can read it.
 *
 * Requires: MONGO_URI env var (e.g. mongodb://192.168.0.31:27017/wib_test)
 */

const { MongoClient, ObjectId } = require('mongodb');

let mongoClient = null;
let db = null;

async function getDb() {
	if (db) return db;

	const uri = process.env.MONGO_URI || 'mongodb://192.168.0.31:27017';
	const dbName = process.env.MONGO_DB || 'wib_test';

	mongoClient = new MongoClient(uri, {
		connectTimeoutMS: 5000,
		serverSelectionTimeoutMS: 5000,
	});

	await mongoClient.connect();
	db = mongoClient.db(dbName);
	console.log(`[mongo-sync] Connected to MongoDB: ${dbName}`);
	return db;
}

const SYSTEM_CATEGORY_MAP = {
	rca: { name: 'RCA', slug: 'rca' },
	casco: { name: 'Casco', slug: 'casco' },
	travel: { name: 'Calatorie', slug: 'travel' },
	home: { name: 'Locuinta', slug: 'home' },
	common: { name: 'General', slug: 'common' },
	health: { name: 'Sanatate', slug: 'health' },
	life: { name: 'Viata', slug: 'life' },
	accidents: { name: 'Accidente Persoane', slug: 'accidents' },
	breakdown: { name: 'Asistenta Rutiera', slug: 'breakdown' },
	cmr: { name: 'CMR', slug: 'cmr' },
	malpraxis: { name: 'Malpraxis', slug: 'malpraxis' },
	rcp: { name: 'Malpraxis', slug: 'rcp' },
};

function directusToMongo(item) {
	const sys = item.system || 'common';
	const category = SYSTEM_CATEGORY_MAP[sys] || { name: 'General', slug: 'common' };

	// Calculate reading time
	const plainText = (item.content || '').replace(/<[^>]*>/g, '');
	const wordCount = plainText.split(/\s+/).filter(Boolean).length;
	const readingTime = Math.max(1, Math.ceil(wordCount / 200));

	// Auto-generate excerpt if not provided
	let excerpt = item.excerpt || '';
	if (!excerpt && plainText) {
		excerpt = plainText.substring(0, 297) + (plainText.length > 300 ? '...' : '');
	}

	return {
		title: item.title || '',
		slug: item.slug || '',
		system: sys,
		status: item.status || 'draft',
		contentHtml: item.content || '',
		excerpt,
		introText: item.intro_text || '',
		conclusion: item.conclusion || '',
		tocItems: item.toc_items || [],
		contentSections: item.content_sections || [],
		featuredImageUrl: item.featured_image_url || '',
		featuredImageAlt: item.featured_image_alt || '',
		authorDisplayName: item.author_display_name || 'Echipa asigurari.ro',
		author: { id: item.author || null, name: item.author_display_name || '', email: '' },
		category,
		tags: [], // M2M tags need separate resolution
		readingTime,
		seo: {
			metaTitle: item.seo_meta_title || item.title || '',
			metaDescription: item.seo_meta_description || excerpt,
			keywords: item.seo_keywords || [],
			canonicalUrl: item.seo_canonical_url || `https://www.asigurari.ro/blog/${sys}/${item.slug}`,
		},
		social: {
			ogTitle: item.og_title || item.title || '',
			ogDescription: item.og_description || excerpt,
			ogImage: item.featured_image_url || '',
			posted: item.social_posted || {},
		},
		stats: {
			views: item.stats_views || 0,
			likes: item.stats_likes || 0,
			shares: item.stats_shares || 0,
			comments: item.stats_comments || 0,
		},
		commentsEnabled: true,
		directusId: item.id || '',
		version: item.version || 1,
		publishedAt: item.published_at ? new Date(item.published_at) : new Date(),
		createdAt: item.date_created ? new Date(item.date_created) : new Date(),
		updatedAt: new Date(),
	};
}

export default ({ action, init }) => {
	// Sync on create
	action('blog_posts.items.create', async ({ payload, key }) => {
		try {
			const database = await getDb();
			const collection = database.collection('blog_posts');
			const doc = directusToMongo({ ...payload, id: key });
			await collection.insertOne(doc);
			console.log(`[mongo-sync] Created: ${doc.slug}`);
		} catch (err) {
			console.error(`[mongo-sync] Create error:`, err.message);
		}
	});

	// Sync on update
	action('blog_posts.items.update', async ({ payload, keys }) => {
		try {
			const database = await getDb();
			const collection = database.collection('blog_posts');

			for (const directusId of keys) {
				const updateFields = {};
				const mongoDoc = directusToMongo({ ...payload, id: directusId });

				// Only update fields that were actually changed
				for (const [key, value] of Object.entries(mongoDoc)) {
					if (value !== undefined && value !== null) {
						updateFields[key] = value;
					}
				}
				updateFields.updatedAt = new Date();

				await collection.updateOne(
					{ directusId: directusId },
					{ $set: updateFields },
					{ upsert: false }
				);
				console.log(`[mongo-sync] Updated: directusId=${directusId}`);
			}
		} catch (err) {
			console.error(`[mongo-sync] Update error:`, err.message);
		}
	});

	// Sync on delete
	action('blog_posts.items.delete', async ({ keys }) => {
		try {
			const database = await getDb();
			const collection = database.collection('blog_posts');

			for (const directusId of keys) {
				await collection.deleteOne({ directusId: directusId });
				console.log(`[mongo-sync] Deleted: directusId=${directusId}`);
			}
		} catch (err) {
			console.error(`[mongo-sync] Delete error:`, err.message);
		}
	});

	// Also trigger n8n webhook when status changes to 'published'
	action('blog_posts.items.update', async ({ payload, keys }) => {
		if (payload.status !== 'published') return;

		const webhookUrl = process.env.N8N_WEBHOOK_URL;
		if (!webhookUrl) return;

		try {
			const database = await getDb();
			const collection = database.collection('blog_posts');

			for (const directusId of keys) {
				const post = await collection.findOne({ directusId });
				if (!post) continue;

				// Fire n8n webhook for social media posting
				await fetch(`${webhookUrl}/webhook/blog-published`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: post.title,
						slug: post.slug,
						system: post.system,
						excerpt: post.excerpt,
						featured_image_url: post.featuredImageUrl,
						tags: post.tags,
						url: `https://www.asigurari.ro/blog/${post.system}/${post.slug}`,
					}),
				});
				console.log(`[mongo-sync] n8n webhook fired for: ${post.slug}`);
			}
		} catch (err) {
			console.error(`[mongo-sync] Webhook error:`, err.message);
		}
	});
};
