/**
 * Directus Endpoint: Live Preview for blog posts
 *
 * GET /preview/:id → renders full HTML preview of a blog post
 *
 * This serves a complete preview page directly from Directus,
 * so editors can see exactly how their article will look.
 * No external server needed.
 */
export default (router, { services, getSchema }) => {
	const { ItemsService } = services;

	router.get('/:id', async (req, res) => {
		try {
			const schema = await getSchema();
			const postsService = new ItemsService('blog_posts', {
				schema,
				accountability: req.accountability,
			});

			const post = await postsService.readOne(req.params.id);
			if (!post) {
				return res.status(404).send('Articolul nu a fost gasit.');
			}

			const systemLabels = {
				rca: 'RCA', casco: 'Casco', travel: 'Calatorie', home: 'Locuinta',
				common: 'General', health: 'Sanatate', life: 'Viata',
				accidents: 'Accidente Persoane', breakdown: 'Asistenta Rutiera',
				cmr: 'CMR', malpraxis: 'Malpraxis', rcp: 'Malpraxis',
			};

			const title = post.title || 'Fara titlu';
			const system = post.system || 'common';
			const systemLabel = systemLabels[system] || system;
			const content = post.content || '';
			const excerpt = post.excerpt || '';
			const imageUrl = post.featured_image_url || '';
			const imageAlt = post.featured_image_alt || '';
			const authorName = post.author_display_name || 'Echipa asigurari.ro';
			const readingTime = post.reading_time || 0;
			const introText = post.intro_text || '';
			const conclusion = post.conclusion || '';
			const status = post.status || 'draft';
			const publishedAt = post.published_at ? new Date(post.published_at).toLocaleDateString('ro-RO') : 'Nepublicat';

			const statusColors = {
				draft: '#6b7280', pending_review: '#f59e0b',
				published: '#22c55e', archived: '#ef4444',
			};
			const statusLabels = {
				draft: 'Ciorna', pending_review: 'In asteptare',
				published: 'Publicat', archived: 'Arhivat',
			};

			const html = renderPreviewPage({
				title, system, systemLabel, content, excerpt,
				imageUrl, imageAlt, authorName, readingTime,
				introText, conclusion, status, publishedAt,
				statusColor: statusColors[status] || '#6b7280',
				statusLabel: statusLabels[status] || status,
				directusUrl: req.protocol + '://' + req.get('host'),
				postId: req.params.id,
			});

			res.setHeader('Content-Type', 'text/html; charset=utf-8');
			res.send(html);
		} catch (err) {
			res.status(500).send('Eroare: ' + err.message);
		}
	});
};

function renderPreviewPage(p) {
	const introParagraphs = p.introText
		? p.introText.split('|').filter(s => s.trim()).map(s => `<p>${s.trim()}</p>`).join('')
		: '';
	const conclusionParagraphs = p.conclusion
		? p.conclusion.split('|').filter(s => s.trim()).map(s => `<p>${s.trim()}</p>`).join('')
		: '';

	return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Preview: ${esc(p.title)}</title>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; color: #1f2937; line-height: 1.6; }

/* Preview toolbar - fixed at top */
.preview-bar {
	position: sticky; top: 0; z-index: 1000;
	background: linear-gradient(135deg, #f59e0b, #d97706);
	color: white; padding: 10px 20px;
	display: flex; align-items: center; justify-content: space-between;
	box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.preview-bar-left { display: flex; align-items: center; gap: 12px; }
.preview-bar-left i { font-size: 20px; }
.preview-bar-title { font-weight: 700; font-size: 15px; }
.preview-bar-subtitle { font-size: 12px; opacity: 0.85; }
.preview-bar-right { display: flex; gap: 8px; }
.preview-bar-right a, .preview-bar-right button {
	padding: 6px 14px; border-radius: 6px; font-size: 13px;
	font-weight: 600; text-decoration: none; cursor: pointer; border: none;
}
.btn-back { background: rgba(255,255,255,0.2); color: white; }
.btn-back:hover { background: rgba(255,255,255,0.3); }
.btn-edit { background: white; color: #d97706; }
.btn-edit:hover { background: #fef3c7; }
.status-badge {
	display: inline-flex; align-items: center; gap: 4px;
	padding: 3px 10px; border-radius: 999px; font-size: 11px;
	font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
	background: ${p.statusColor}; color: white;
}

/* Device switcher */
.device-switcher {
	display: flex; justify-content: center; gap: 8px;
	padding: 12px; background: #e5e7eb;
}
.device-btn {
	padding: 6px 16px; border: 2px solid #d1d5db; border-radius: 8px;
	background: white; cursor: pointer; font-size: 13px; font-weight: 600;
}
.device-btn.active { background: #1d4ed8; color: white; border-color: #1d4ed8; }

/* Article container */
.article-wrapper {
	max-width: 900px; margin: 0 auto; padding: 24px 16px;
	transition: max-width 0.3s ease;
}
.article-wrapper.phone-mode { max-width: 390px; }

/* Cards */
.card {
	background: white; border-radius: 12px; padding: 20px 24px;
	box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 16px;
}
h1 { font-size: 26px; font-weight: 800; color: #111827; margin-bottom: 14px; line-height: 1.3; }
.meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; color: #6b7280; align-items: center; }
.meta i { margin-right: 4px; }
.meta .badge { background: #dbeafe; color: #1e40af; padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }

/* Breadcrumb */
.breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; margin-bottom: 16px; flex-wrap: wrap; }
.breadcrumb .sep { font-size: 10px; }
.breadcrumb .current { color: #374151; font-weight: 500; }

/* Image */
.featured-img { width: 100%; height: auto; border-radius: 10px; margin-bottom: 16px; max-height: 450px; object-fit: cover; }

/* Intro & Conclusion */
.intro, .conclusion { border-left: 4px solid #22c55e; padding-left: 16px; margin: 16px 0; }
.intro p, .conclusion p { color: #374151; line-height: 1.7; margin-bottom: 12px; }

/* Content */
.content-area { color: #374151; line-height: 1.7; }
.content-area h2 { font-size: 21px; font-weight: 700; margin: 24px 0 12px; color: #111827; }
.content-area h3 { font-size: 17px; font-weight: 600; margin: 18px 0 8px; color: #1f2937; }
.content-area p { margin-bottom: 12px; }
.content-area ul, .content-area ol { margin: 8px 0 16px 24px; }
.content-area li { margin-bottom: 6px; }
.content-area img { max-width: 100%; border-radius: 8px; margin: 12px 0; }
.content-area a { color: #2563eb; }
.content-area strong { color: #111827; }

/* Excerpt preview */
.excerpt-box { border-left: 4px solid #3b82f6; }
.excerpt-label { font-size: 12px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }

/* Empty state */
.empty-hint { color: #9ca3af; font-style: italic; padding: 60px 20px; text-align: center; }
.empty-hint i { font-size: 40px; margin-bottom: 12px; display: block; color: #d1d5db; }

/* Responsive */
@media (max-width: 640px) {
	h1 { font-size: 20px; }
	.card { padding: 14px 16px; }
	.preview-bar { flex-direction: column; gap: 8px; text-align: center; }
}
</style>
</head>
<body>

<div class="preview-bar">
	<div class="preview-bar-left">
		<i class="fas fa-eye"></i>
		<div>
			<div class="preview-bar-title">MOD PREVIEW</div>
			<div class="preview-bar-subtitle">Aceasta este o previzualizare. Articolul nu este vizibil public.</div>
		</div>
		<span class="status-badge">${esc(p.statusLabel)}</span>
	</div>
	<div class="preview-bar-right">
		<a href="${p.directusUrl}/admin/content/blog_posts/${p.postId}" class="btn-edit">
			<i class="fas fa-pen-to-square"></i> Editeaza
		</a>
		<a href="${p.directusUrl}/admin/content/blog_posts" class="btn-back">
			<i class="fas fa-arrow-left"></i> Lista articole
		</a>
	</div>
</div>

<div class="device-switcher">
	<button class="device-btn active" onclick="setDevice('desktop', this)">🖥️ Desktop</button>
	<button class="device-btn" onclick="setDevice('phone', this)">📱 Mobil</button>
</div>

<div id="article-wrapper" class="article-wrapper">

	<nav class="breadcrumb">
		<span>Acasa</span><i class="fas fa-chevron-right sep"></i>
		<span>Blog</span><i class="fas fa-chevron-right sep"></i>
		<span>${esc(p.systemLabel)}</span><i class="fas fa-chevron-right sep"></i>
		<span class="current">${esc(p.title).substring(0, 60)}${p.title.length > 60 ? '...' : ''}</span>
	</nav>

	<div class="card">
		<h1>${esc(p.title)}</h1>
		<div class="meta">
			<span><i class="far fa-calendar"></i>${p.publishedAt}</span>
			<span><i class="far fa-user"></i>${esc(p.authorName)}</span>
			<span class="badge">${esc(p.systemLabel)}</span>
			${p.readingTime > 0 ? '<span><i class="far fa-clock"></i>' + p.readingTime + ' min lectura</span>' : ''}
		</div>
	</div>

	<div class="card">
		${p.imageUrl ? '<img class="featured-img" src="' + esc(p.imageUrl) + '" alt="' + esc(p.imageAlt) + '" onerror="this.style.display=\'none\'">' : ''}
		${introParagraphs ? '<div class="intro">' + introParagraphs + '</div>' : ''}
	</div>

	<div class="card">
		<div class="content-area">
			${p.content || '<div class="empty-hint"><i class="fas fa-pen-fancy"></i>Niciun continut inca.<br>Editeaza articolul pentru a adauga continut.</div>'}
		</div>
	</div>

	${conclusionParagraphs ? '<div class="card"><div class="conclusion">' + conclusionParagraphs + '</div></div>' : ''}

	${p.excerpt ? '<div class="card excerpt-box"><div class="excerpt-label"><i class="fas fa-quote-left"></i> Excerpt (afisat in lista de articole)</div><p style="color:#374151;">' + esc(p.excerpt) + '</p></div>' : ''}

</div>

<script>
function setDevice(mode, btn) {
	const wrapper = document.getElementById('article-wrapper');
	document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
	btn.classList.add('active');
	if (mode === 'phone') {
		wrapper.classList.add('phone-mode');
	} else {
		wrapper.classList.remove('phone-mode');
	}
}
</script>
</body>
</html>`;
}

function esc(str) {
	if (!str) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
