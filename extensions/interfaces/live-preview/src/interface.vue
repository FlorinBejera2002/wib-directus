<template>
	<div class="live-preview-wrapper">
		<div class="preview-header">
			<div class="preview-header-left">
				<span class="preview-icon">👁️</span>
				<span class="preview-title">Previzualizare Live</span>
			</div>
			<div class="preview-header-right">
				<button class="preview-toggle" @click="expanded = !expanded">
					{{ expanded ? '▼ Ascunde' : '▶ Arata preview' }}
				</button>
			</div>
		</div>

		<div v-if="expanded" class="preview-container">
			<div class="preview-toolbar">
				<button
					:class="['device-btn', { active: device === 'desktop' }]"
					@click="device = 'desktop'"
				>🖥️ Desktop</button>
				<button
					:class="['device-btn', { active: device === 'phone' }]"
					@click="device = 'phone'"
				>📱 Mobil</button>
			</div>

			<div class="preview-frame-wrapper" :class="device">
				<iframe
					ref="previewFrame"
					class="preview-frame"
					:srcdoc="previewHtml"
					sandbox="allow-same-origin"
					frameborder="0"
				></iframe>
			</div>
		</div>
	</div>
</template>

<script>
import { computed, ref, inject, watch } from 'vue';

export default {
	props: {
		value: { type: String, default: null },
		collection: { type: String, default: '' },
		field: { type: String, default: '' },
		primaryKey: { type: [String, Number], default: '+' },
	},
	setup(props) {
		const expanded = ref(true);
		const device = ref('desktop');
		const values = inject('values', ref({}));

		const systemLabels = {
			rca: 'RCA', casco: 'Casco', travel: 'Calatorie', home: 'Locuinta',
			common: 'General', health: 'Sanatate', life: 'Viata',
			accidents: 'Accidente Persoane', breakdown: 'Asistenta Rutiera',
			cmr: 'CMR', malpraxis: 'Malpraxis', rcp: 'Malpraxis',
		};

		const previewHtml = computed(() => {
			const v = values.value || {};
			const title = v.title || 'Titlu articol...';
			const system = v.system || 'common';
			const systemLabel = systemLabels[system] || system;
			const content = v.content || '<p style="color:#9ca3af;">Continutul articolului va aparea aici...</p>';
			const excerpt = v.excerpt || '';
			const imageUrl = v.featured_image_url || '';
			const imageAlt = v.featured_image_alt || '';
			const authorName = v.author_display_name || 'Echipa asigurari.ro';
			const readingTime = v.reading_time || 0;
			const introText = v.intro_text || '';
			const conclusion = v.conclusion || '';
			const status = v.status || 'draft';

			const statusColors = {
				draft: '#6b7280',
				pending_review: '#f59e0b',
				published: '#22c55e',
				archived: '#ef4444',
			};
			const statusLabels = {
				draft: 'Ciorna',
				pending_review: 'In asteptare',
				published: 'Publicat',
				archived: 'Arhivat',
			};

			return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	background: #f3f4f6;
	color: #1f2937;
	line-height: 1.6;
	padding: 16px;
}
.status-bar {
	background: ${statusColors[status] || '#6b7280'};
	color: white;
	padding: 8px 16px;
	border-radius: 8px;
	margin-bottom: 16px;
	font-size: 12px;
	font-weight: 600;
	display: flex;
	align-items: center;
	gap: 8px;
}
.breadcrumb {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	color: #6b7280;
	margin-bottom: 16px;
	flex-wrap: wrap;
}
.breadcrumb a { color: #6b7280; text-decoration: none; }
.breadcrumb .sep { font-size: 10px; }
.card {
	background: white;
	border-radius: 12px;
	padding: 16px 20px;
	box-shadow: 0 1px 3px rgba(0,0,0,0.08);
	margin-bottom: 16px;
}
h1 {
	font-size: 24px;
	font-weight: 800;
	color: #111827;
	margin-bottom: 12px;
	line-height: 1.3;
}
.meta {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	font-size: 13px;
	color: #6b7280;
	align-items: center;
}
.meta .badge {
	background: #dbeafe;
	color: #1e40af;
	padding: 2px 10px;
	border-radius: 999px;
	font-size: 12px;
	font-weight: 600;
}
.meta i { margin-right: 4px; }
.featured-img {
	width: 100%;
	height: auto;
	border-radius: 8px;
	margin-bottom: 16px;
	max-height: 400px;
	object-fit: cover;
}
.intro {
	border-left: 4px solid #22c55e;
	padding-left: 16px;
	margin: 16px 0;
}
.intro p {
	color: #374151;
	line-height: 1.7;
	margin-bottom: 12px;
}
.content-area {
	color: #374151;
	line-height: 1.7;
}
.content-area h2 { font-size: 20px; font-weight: 700; margin: 20px 0 10px; color: #111827; }
.content-area h3 { font-size: 17px; font-weight: 600; margin: 16px 0 8px; color: #1f2937; }
.content-area p { margin-bottom: 12px; }
.content-area ul, .content-area ol { margin: 8px 0 12px 20px; }
.content-area li { margin-bottom: 4px; }
.content-area img { max-width: 100%; border-radius: 8px; margin: 12px 0; }
.content-area a { color: #2563eb; }
.conclusion {
	border-left: 4px solid #22c55e;
	padding-left: 16px;
	margin-top: 16px;
}
.conclusion p {
	color: #374151;
	line-height: 1.7;
	margin-bottom: 12px;
}
.empty-hint {
	color: #9ca3af;
	font-style: italic;
	padding: 40px 20px;
	text-align: center;
}
</style>
</head>
<body>
	<div class="status-bar">
		<i class="fas fa-circle" style="font-size:8px;"></i>
		Status: ${statusLabels[status] || status}
	</div>

	<nav class="breadcrumb">
		<span>Acasa</span>
		<i class="fas fa-chevron-right sep"></i>
		<span>Blog</span>
		<i class="fas fa-chevron-right sep"></i>
		<span>${systemLabel}</span>
		<i class="fas fa-chevron-right sep"></i>
		<span style="color:#374151;font-weight:500;">${title.substring(0, 50)}${title.length > 50 ? '...' : ''}</span>
	</nav>

	<div class="card">
		<h1>${title}</h1>
		<div class="meta">
			<span><i class="far fa-user"></i>${authorName}</span>
			<span class="badge">${systemLabel}</span>
			${readingTime > 0 ? '<span><i class="far fa-clock"></i>' + readingTime + ' min lectura</span>' : ''}
		</div>
	</div>

	<div class="card">
		${imageUrl ? '<img class="featured-img" src="' + imageUrl + '" alt="' + (imageAlt || '') + '">' : ''}

		${introText ? '<div class="intro">' + introText.split('|').map(p => '<p>' + p.trim() + '</p>').join('') + '</div>' : ''}
	</div>

	<div class="card">
		<div class="content-area">
			${content || '<div class="empty-hint"><i class="fas fa-pen-fancy" style="font-size:32px;margin-bottom:12px;display:block;"></i>Incepe sa scrii continutul articolului...<br>Preview-ul se va actualiza automat.</div>'}
		</div>
	</div>

	${conclusion ? '<div class="card"><div class="conclusion">' + conclusion.split('|').map(p => '<p>' + p.trim() + '</p>').join('') + '</div></div>' : ''}

	${excerpt ? '<div class="card" style="border-left:4px solid #3b82f6;"><p style="font-size:13px;color:#6b7280;margin-bottom:4px;font-weight:600;">Excerpt (afisat in lista de articole):</p><p style="color:#374151;">' + excerpt + '</p></div>' : ''}
</body>
</html>`;
		});

		return { expanded, device, previewHtml };
	},
};
</script>

<style scoped>
.live-preview-wrapper {
	width: 100%;
	border: 2px solid var(--border-normal, #e2e8f0);
	border-radius: 12px;
	overflow: hidden;
	background: var(--background-normal, #f8fafc);
}
.preview-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: var(--background-normal-alt, #f1f5f9);
	border-bottom: 1px solid var(--border-normal, #e2e8f0);
}
.preview-header-left {
	display: flex;
	align-items: center;
	gap: 8px;
	font-weight: 600;
	font-size: 14px;
}
.preview-icon { font-size: 18px; }
.preview-title { color: var(--foreground-normal, #334155); }
.preview-toggle {
	background: var(--primary, #6644ff);
	color: white;
	border: none;
	padding: 6px 14px;
	border-radius: 6px;
	cursor: pointer;
	font-size: 13px;
	font-weight: 600;
}
.preview-toggle:hover { opacity: 0.9; }
.preview-toolbar {
	display: flex;
	gap: 8px;
	padding: 10px 16px;
	background: var(--background-normal, #f8fafc);
	border-bottom: 1px solid var(--border-normal, #e2e8f0);
}
.device-btn {
	padding: 6px 12px;
	border: 1px solid var(--border-normal, #e2e8f0);
	border-radius: 6px;
	background: white;
	cursor: pointer;
	font-size: 13px;
}
.device-btn.active {
	background: var(--primary, #6644ff);
	color: white;
	border-color: var(--primary, #6644ff);
}
.preview-frame-wrapper {
	padding: 16px;
	display: flex;
	justify-content: center;
	background: #e5e7eb;
	min-height: 500px;
}
.preview-frame-wrapper.desktop .preview-frame {
	width: 100%;
	max-width: 900px;
	height: 700px;
}
.preview-frame-wrapper.phone .preview-frame {
	width: 375px;
	height: 700px;
	border-radius: 20px;
	box-shadow: 0 0 0 8px #1f2937, 0 0 0 10px #374151;
}
.preview-frame {
	background: white;
	border: none;
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
</style>
