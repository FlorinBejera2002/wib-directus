/**
 * Create news collection in Directus, add test articles, and set preview URLs.
 * Usage: node scripts/setup-news.js
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
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok && !text.includes('already exists')) {
        console.error(`  [${res.status}] ${method} ${path}: ${text.substring(0, 200)}`);
    }
    return data;
}

// ─── Step 1: Create collection ───
async function createCollection() {
    console.log('\n📦 Creating news collection...');
    const result = await api('POST', '/collections', {
        collection: 'news',
        schema: {},
        meta: {
            icon: 'newspaper',
            note: 'Știri și noutăți din domeniul asigurărilor',
            sort_field: 'sort',
            archive_field: 'status',
            archive_value: 'archived',
            unarchive_value: 'draft',
            singleton: false,
        },
    });
    if (result?.data) console.log('  ✓ Collection created');
    else console.log('  → Collection may already exist, continuing...');
}

// ─── Step 2: Create fields ───
async function createFields() {
    console.log('\n📝 Creating fields...');

    const fields = [
        { field: 'status', type: 'string', meta: { interface: 'select-dropdown', display: 'labels', width: 'half', options: { choices: [{ text: 'Ciornă', value: 'draft' }, { text: 'În așteptare', value: 'pending_review' }, { text: 'Publicat', value: 'published' }, { text: 'Arhivat', value: 'archived' }] }, display_options: { choices: [{ text: 'Ciornă', value: 'draft', background: '#A2B5CD' }, { text: 'În așteptare', value: 'pending_review', background: '#D4A017' }, { text: 'Publicat', value: 'published', background: '#2E8B57' }, { text: 'Arhivat', value: 'archived', background: '#B22222' }] } }, schema: { default_value: 'draft' } },
        { field: 'sort', type: 'integer', meta: { interface: 'input', hidden: true }, schema: {} },
        { field: 'title', type: 'string', meta: { interface: 'input', width: 'full', required: true, note: 'Titlul știrii' }, schema: {} },
        { field: 'slug', type: 'string', meta: { interface: 'input', width: 'half', note: 'URL-ul știrii (generat automat din titlu)' }, schema: {} },
        { field: 'excerpt', type: 'text', meta: { interface: 'input-multiline', width: 'full', note: 'Rezumat scurt afișat în lista de știri' }, schema: {} },
        { field: 'content', type: 'text', meta: { interface: 'input-rich-text-html', width: 'full', note: 'Conținutul complet al știrii' }, schema: {} },
        { field: 'category', type: 'string', meta: { interface: 'select-dropdown', width: 'half', options: { choices: [{ text: 'Legislație', value: 'legislatie' }, { text: 'Piață', value: 'piata' }, { text: 'Companii', value: 'companii' }, { text: 'Produse', value: 'produse' }, { text: 'Tehnologie', value: 'tehnologie' }, { text: 'General', value: 'general' }] } }, schema: { default_value: 'general' } },
        { field: 'featured_image_url', type: 'string', meta: { interface: 'input', width: 'half', note: 'URL imagine principală' }, schema: {} },
        { field: 'author_name', type: 'string', meta: { interface: 'input', width: 'half', note: 'Numele autorului' }, schema: { default_value: 'Echipa asigurari.ro' } },
        { field: 'published_at', type: 'timestamp', meta: { interface: 'datetime', width: 'half', note: 'Data publicării' }, schema: {} },
        { field: 'is_breaking', type: 'boolean', meta: { interface: 'boolean', width: 'half', note: 'Știre de ultimă oră?' }, schema: { default_value: false } },
        { field: 'source_url', type: 'string', meta: { interface: 'input', width: 'half', note: 'Link sursă externă (opțional)' }, schema: {} },
        { field: 'source_name', type: 'string', meta: { interface: 'input', width: 'half', note: 'Numele sursei (ex: ASF, BAAR)' }, schema: {} },
        { field: 'preview_url', type: 'string', meta: { interface: 'presentation-links', display: 'formatted-value', width: 'full', note: 'Link preview articol', options: { links: [{ label: '👁️ Vezi Preview', icon: 'visibility', type: 'normal', url: '{{preview_url}}' }] }, display_options: { format_value: '{{value}}' }, readonly: true }, schema: {} },
        { field: 'date_created', type: 'timestamp', meta: { interface: 'datetime', readonly: true, hidden: true, special: ['date-created'] }, schema: {} },
        { field: 'date_updated', type: 'timestamp', meta: { interface: 'datetime', readonly: true, hidden: true, special: ['date-updated'] }, schema: {} },
    ];

    for (const f of fields) {
        const result = await api('POST', '/fields/news', f);
        const ok = result?.data || (typeof result === 'string' && result.includes('already exists'));
        console.log(`  ${ok ? '✓' : '✗'} ${f.field}`);
    }
}

// ─── Step 3: Add test news articles ───
async function addTestNews() {
    console.log('\n📰 Adding test news articles...');

    const news = [
        {
            title: 'ASF anunță noi reglementări pentru piața RCA în 2026',
            slug: 'asf-noi-reglementari-rca-2026',
            excerpt: 'Autoritatea de Supraveghere Financiară a publicat un nou set de reglementări care vor schimba modul în care sunt calculate primele RCA începând cu trimestrul II 2026.',
            category: 'legislatie',
            status: 'published',
            is_breaking: true,
            author_name: 'Echipa asigurari.ro',
            source_name: 'ASF',
            source_url: 'https://asfromania.ro',
            published_at: '2026-02-15T10:00:00',
            content: `<div class="max-w-7xl mx-auto">
<div class="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-8">
<div class="flex items-center gap-2 mb-4"><span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Breaking</span><span class="text-gray-500 text-sm">15 Februarie 2026</span></div>
<h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-4">Noile reglementări ASF pentru RCA</h2>
<p class="text-gray-700 leading-relaxed mb-4">Autoritatea de Supraveghere Financiară (ASF) a publicat astăzi un nou cadru de reglementare pentru piața asigurărilor auto obligatorii (RCA). Principalele modificări vizează:</p>
<ul class="list-disc pl-6 space-y-2 text-gray-700 mb-4">
<li><strong>Transparența tarifelor</strong> — companiile de asigurări vor fi obligate să publice metodologia de calcul a primelor</li>
<li><strong>Bonus-malus unificat</strong> — se introduce un sistem unic de bonus-malus la nivel național</li>
<li><strong>Decontare directă extinsă</strong> — limita pentru decontare directă crește de la 10.000 la 25.000 EUR</li>
<li><strong>Protecția consumatorului</strong> — termen maxim de 5 zile pentru emiterea poliței după plată</li>
</ul>
<p class="text-gray-700 leading-relaxed mb-4">Noile reglementări intră în vigoare la 1 aprilie 2026 și se aplică tuturor companiilor de asigurări autorizate să opereze pe piața RCA din România.</p>
<div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-6">
<p class="text-blue-800 font-semibold mb-1">📌 Ce trebuie să știți</p>
<p class="text-blue-700 text-sm">Dacă aveți o poliță RCA activă, aceasta rămâne valabilă până la expirare. Noile reguli se aplică doar polițelor emise după 1 aprilie 2026.</p>
</div>
</div></div>`,
        },
        {
            title: 'Euroins România raportează creștere de 15% a primelor brute subscrise',
            slug: 'euroins-crestere-15-procente-prime-2025',
            excerpt: 'Euroins România a încheiat anul 2025 cu o creștere semnificativă, susținută de segmentul RCA și de expansiunea pe piața asigurărilor de locuințe.',
            category: 'companii',
            status: 'published',
            is_breaking: false,
            author_name: 'Maria Ionescu',
            source_name: 'Euroins România',
            published_at: '2026-02-14T14:30:00',
            content: `<div class="max-w-7xl mx-auto">
<div class="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-8">
<h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-4">Rezultate financiare Euroins România 2025</h2>
<p class="text-gray-700 leading-relaxed mb-4">Euroins România, unul dintre cei mai mari asigurători de pe piața locală, a raportat pentru anul fiscal 2025 prime brute subscrise în valoare de 2.1 miliarde lei, reprezentând o creștere de 15% față de anul anterior.</p>
<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
<div class="bg-green-50 rounded-lg p-4 text-center"><p class="text-3xl font-bold text-green-700">2.1 mld</p><p class="text-sm text-gray-600">Prime brute subscrise (lei)</p></div>
<div class="bg-blue-50 rounded-lg p-4 text-center"><p class="text-3xl font-bold text-blue-700">+15%</p><p class="text-sm text-gray-600">Creștere anuală</p></div>
<div class="bg-purple-50 rounded-lg p-4 text-center"><p class="text-3xl font-bold text-purple-700">1.2M</p><p class="text-sm text-gray-600">Polițe active</p></div>
</div>
<p class="text-gray-700 leading-relaxed mb-4">Creșterea a fost susținută în principal de segmentul RCA, care reprezintă aproximativ 60% din portofoliul companiei, dar și de expansiunea pe piața asigurărilor de locuințe obligatorii (PAD).</p>
<p class="text-gray-700 leading-relaxed">Compania a anunțat că va continua investițiile în digitalizare și în îmbunătățirea procesului de despăgubire pentru a reduce timpul mediu de soluționare a daunelor.</p>
</div></div>`,
        },
        {
            title: 'Asigurările de călătorie: cerere record pentru sezonul de iarnă 2025-2026',
            slug: 'asigurari-calatorie-cerere-record-iarna-2025-2026',
            excerpt: 'Românii au cumpărat cu 30% mai multe asigurări de călătorie pentru sezonul de iarnă, pe fondul creșterii numărului de vacanțe la schi în Austria și Italia.',
            category: 'piata',
            status: 'published',
            is_breaking: false,
            author_name: 'Andrei Popescu',
            published_at: '2026-02-12T09:00:00',
            content: `<div class="max-w-7xl mx-auto">
<div class="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-8">
<h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-4">Cerere record pentru asigurări de călătorie</h2>
<p class="text-gray-700 leading-relaxed mb-4">Piața asigurărilor de călătorie din România a înregistrat o creștere spectaculoasă în sezonul de iarnă 2025-2026. Conform datelor agregate de la principalii asigurători, numărul polițelor de călătorie vândute a crescut cu 30% față de sezonul anterior.</p>
<p class="text-gray-700 leading-relaxed mb-4">Principalele destinații pentru care românii au achiziționat asigurări sunt:</p>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
<div class="bg-white border-2 border-gray-100 rounded-lg p-4 flex items-center gap-3"><span class="text-2xl">🇦🇹</span><div><p class="font-semibold text-gray-800">Austria</p><p class="text-sm text-gray-500">35% din polițe</p></div></div>
<div class="bg-white border-2 border-gray-100 rounded-lg p-4 flex items-center gap-3"><span class="text-2xl">🇮🇹</span><div><p class="font-semibold text-gray-800">Italia</p><p class="text-sm text-gray-500">25% din polițe</p></div></div>
<div class="bg-white border-2 border-gray-100 rounded-lg p-4 flex items-center gap-3"><span class="text-2xl">🇫🇷</span><div><p class="font-semibold text-gray-800">Franța</p><p class="text-sm text-gray-500">15% din polițe</p></div></div>
<div class="bg-white border-2 border-gray-100 rounded-lg p-4 flex items-center gap-3"><span class="text-2xl">🇧🇬</span><div><p class="font-semibold text-gray-800">Bulgaria</p><p class="text-sm text-gray-500">12% din polițe</p></div></div>
</div>
<div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
<p class="text-amber-800 font-semibold mb-1">💡 Sfat</p>
<p class="text-amber-700 text-sm">Verificați întotdeauna dacă asigurarea de călătorie acoperă sporturile de iarnă. Multe polițe standard exclud accidentele la schi.</p>
</div>
</div></div>`,
        },
        {
            title: 'BAAR introduce platforma digitală pentru constatarea amiabilă de accident',
            slug: 'baar-platforma-digitala-constatare-amiabila',
            excerpt: 'Biroul Asigurătorilor de Autovehicule din România lansează o aplicație mobilă care permite completarea constatării amiabile direct de pe telefon.',
            category: 'tehnologie',
            status: 'published',
            is_breaking: true,
            author_name: 'Echipa asigurari.ro',
            source_name: 'BAAR',
            published_at: '2026-02-10T11:00:00',
            content: `<div class="max-w-7xl mx-auto">
<div class="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-8">
<div class="flex items-center gap-2 mb-4"><span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Breaking</span><span class="text-gray-500 text-sm">10 Februarie 2026</span></div>
<h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-4">Constatare amiabilă digitală — o premieră în România</h2>
<p class="text-gray-700 leading-relaxed mb-4">BAAR a lansat oficial platforma „eConstatare", o aplicație mobilă disponibilă pe iOS și Android care permite șoferilor implicați într-un accident minor să completeze formularul de constatare amiabilă direct de pe telefon.</p>
<h3 class="text-lg font-bold text-gray-900 mb-3 mt-6">Cum funcționează</h3>
<div class="space-y-3 mb-6">
<div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"><span class="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">1</span><p class="text-gray-700">Descărcați aplicația eConstatare din App Store sau Google Play</p></div>
<div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"><span class="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">2</span><p class="text-gray-700">Fotografiați locul accidentului și vehiculele implicate</p></div>
<div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"><span class="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">3</span><p class="text-gray-700">Completați datele celor doi șoferi și schița accidentului</p></div>
<div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"><span class="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">4</span><p class="text-gray-700">Semnați digital și trimiteți — documentul ajunge instant la ambii asigurători</p></div>
</div>
<p class="text-gray-700 leading-relaxed">Aplicația este gratuită și reduce semnificativ timpul necesar pentru completarea formalităților în caz de accident minor.</p>
</div></div>`,
        },
        {
            title: 'Prețul mediu al polițelor CASCO a scăzut cu 8% în ianuarie 2026',
            slug: 'pret-mediu-casco-scadere-ianuarie-2026',
            excerpt: 'Competiția crescută între asigurători și introducerea telematicii au dus la scăderea prețurilor CASCO pentru prima dată în ultimii 3 ani.',
            category: 'produse',
            status: 'draft',
            is_breaking: false,
            author_name: 'Elena Dumitrescu',
            published_at: null,
            content: `<div class="max-w-7xl mx-auto">
<div class="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-8">
<h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-4">CASCO mai ieftin în 2026</h2>
<p class="text-gray-700 leading-relaxed mb-4">Pentru prima dată în ultimii trei ani, prețul mediu al polițelor CASCO a înregistrat o scădere semnificativă. Conform analizei realizate pe baza ofertelor de la 8 companii de asigurări, prima medie pentru un autoturism de clasă medie a scăzut cu 8% în ianuarie 2026 față de aceeași perioadă a anului trecut.</p>
<p class="text-gray-700 leading-relaxed mb-4">Factorii principali care au contribuit la această scădere:</p>
<ul class="list-disc pl-6 space-y-2 text-gray-700 mb-4">
<li><strong>Competiția crescută</strong> — intrarea a doi noi jucători pe piața CASCO</li>
<li><strong>Telematica</strong> — reduceri de până la 20% pentru șoferii care acceptă monitorizarea stilului de condus</li>
<li><strong>Franșize mai mari</strong> — opțiuni noi cu franșize mai mari dar prime mai mici</li>
</ul>
<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
<p class="text-green-800 font-semibold mb-1">✅ Recomandare</p>
<p class="text-green-700 text-sm">Acum este un moment bun pentru a compara ofertele CASCO. Folosiți comparatorul nostru pentru a găsi cea mai bună ofertă.</p>
</div>
</div></div>`,
        },
        {
            title: 'Ghid: Cum să alegi asigurarea de locuință potrivită în 2026',
            slug: 'ghid-asigurare-locuinta-2026',
            excerpt: 'Tot ce trebuie să știi despre asigurarea obligatorie PAD și asigurarea facultativă de locuință — diferențe, acoperiri și sfaturi practice.',
            category: 'produse',
            status: 'pending_review',
            is_breaking: false,
            author_name: 'Echipa asigurari.ro',
            published_at: null,
            content: `<div class="max-w-7xl mx-auto">
<div class="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-8">
<h2 class="text-xl md:text-2xl font-bold text-gray-900 mb-4">Asigurarea de locuință — Ghid complet 2026</h2>
<p class="text-gray-700 leading-relaxed mb-4">Alegerea asigurării de locuință potrivite poate fi confuză, mai ales când există atât varianta obligatorie (PAD) cât și cea facultativă. În acest ghid vă explicăm diferențele și vă ajutăm să luați cea mai bună decizie.</p>

<div class="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-8">
<div class="flex items-center gap-3 mb-6"><i class="fas fa-list text-blue-700 text-lg md:text-2xl"></i><h2 class="text-lg md:text-2xl font-bold">Cuprins</h2></div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
<a href="#pad-obligatorie" class="flex items-start gap-3 p-3 bg-white border-2 border-gray-100 rounded-lg md:hover:bg-gray-100 transition-colors"><i class="fas fa-chevron-right text-green-500 mt-1"></i><span class="font-semibold text-gray-800">Ce este asigurarea PAD obligatorie</span></a>
<a href="#facultativa" class="flex items-start gap-3 p-3 bg-white border-2 border-gray-100 rounded-lg md:hover:bg-gray-100 transition-colors"><i class="fas fa-chevron-right text-green-500 mt-1"></i><span class="font-semibold text-gray-800">Asigurarea facultativă de locuință</span></a>
<a href="#diferente" class="flex items-start gap-3 p-3 bg-white border-2 border-gray-100 rounded-lg md:hover:bg-gray-100 transition-colors"><i class="fas fa-chevron-right text-green-500 mt-1"></i><span class="font-semibold text-gray-800">Diferențe PAD vs. Facultativă</span></a>
<a href="#sfaturi" class="flex items-start gap-3 p-3 bg-white border-2 border-gray-100 rounded-lg md:hover:bg-gray-100 transition-colors"><i class="fas fa-chevron-right text-green-500 mt-1"></i><span class="font-semibold text-gray-800">Sfaturi practice</span></a>
</div>
</div>

<div id="pad-obligatorie" class="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-8">
<h3 class="text-lg font-bold text-gray-900 mb-3">Ce este asigurarea PAD obligatorie</h3>
<p class="text-gray-700 leading-relaxed mb-4">PAD (Polița de Asigurare împotriva Dezastrelor) este obligatorie pentru toate locuințele din România. Aceasta acoperă trei riscuri principale: cutremur, inundații și alunecări de teren.</p>
<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
<div class="bg-orange-50 rounded-lg p-4 text-center"><p class="text-2xl mb-1">🏚️</p><p class="font-semibold text-gray-800">Cutremur</p></div>
<div class="bg-blue-50 rounded-lg p-4 text-center"><p class="text-2xl mb-1">🌊</p><p class="font-semibold text-gray-800">Inundații</p></div>
<div class="bg-amber-50 rounded-lg p-4 text-center"><p class="text-2xl mb-1">⛰️</p><p class="font-semibold text-gray-800">Alunecări de teren</p></div>
</div>
<p class="text-gray-700 leading-relaxed">Prețul PAD este fix: 20 EUR/an pentru locuințe tip A (beton) și 10 EUR/an pentru locuințe tip B (alte materiale).</p>
</div>

<div id="facultativa" class="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-8">
<h3 class="text-lg font-bold text-gray-900 mb-3">Asigurarea facultativă de locuință</h3>
<p class="text-gray-700 leading-relaxed mb-4">Asigurarea facultativă oferă o acoperire mult mai largă decât PAD. Pe lângă dezastre naturale, aceasta poate include: incendiu, explozie, furt, vandalism, spargerea conductelor, fenomene atmosferice și multe altele.</p>
<p class="text-gray-700 leading-relaxed">Prețul variază între 50 și 300 EUR/an, în funcție de valoarea locuinței, zona geografică și nivelul de acoperire ales.</p>
</div>

</div></div>`,
        },
    ];

    for (const item of news) {
        const result = await api('POST', '/items/news', item);
        if (result?.data) {
            console.log(`  ✓ "${item.title.substring(0, 50)}..." (${item.status})`);
        } else {
            console.log(`  ✗ Failed: "${item.title.substring(0, 50)}..."`);
        }
    }
}

// ─── Step 4: Set preview URLs ───
async function setPreviewUrls() {
    console.log('\n🔗 Setting preview URLs...');

    let allNews = [], page = 1;
    while (true) {
        const r = await api('GET', `/items/news?fields=id&limit=100&page=${page}`);
        if (!r?.data?.length) break;
        allNews = allNews.concat(r.data);
        if (r.data.length < 100) break;
        page++;
    }

    for (const item of allNews) {
        const previewUrl = `${PREVIEW_URL}/?collection=news&id=${item.id}&token=${STATIC_TOKEN}`;
        await api('PATCH', `/items/news/${item.id}`, { preview_url: previewUrl });
    }
    console.log(`  ✓ Updated ${allNews.length} news items`);
}

async function main() {
    const auth = await api('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    TOKEN = auth?.data?.access_token;
    if (!TOKEN) throw new Error('Auth failed');
    console.log('✓ Authenticated');

    await createCollection();
    await createFields();
    await addTestNews();
    await setPreviewUrls();

    console.log('\n🎉 Done! News collection ready.');
    console.log(`   Directus: ${DIRECTUS_URL}/admin/content/news`);
    console.log(`   Preview:  ${PREVIEW_URL}/?collection=news&id=1&token=${STATIC_TOKEN}`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
