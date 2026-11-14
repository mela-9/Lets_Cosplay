import QRCode from 'qrcode';

const STORAGE_KEYS = {
    theme: 'letscosplay-theme',
    session: 'letscosplay-session',
    chatSession: 'letscosplay-chat-session',
    favorites: 'letscosplay-favorites',
    submissions: 'letscosplay-my-event-submissions',
};

const seedProducts = [];

const seedEvents = [
    { id: 'e1', title: 'Jakarta Cosplay Parade 2026', date: '21 November 2026', location: 'M Bloc Space, Jakarta', theme: 'anime fantasy parade', category: 'Komunitas', tier: 'Gratis', status: 'Disetujui', image: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85', description: 'Parade kostum dan panggung komunitas untuk semua fandom. Ada mini competition dan photo walk.', featured: true },
    { id: 'e2', title: 'Nusantara Pop Culture Fest', date: '5 Desember 2026', location: 'JCC Senayan, Jakarta', theme: 'game fantasy pop culture', category: 'Unggulan', tier: 'Prabayar', status: 'Disetujui', image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85', description: 'Festival pop culture, cosplay showcase, artist alley, dan meet-and-greet bersama kreator.', featured: true },
    { id: 'e3', title: 'Malam Yokai: Cosplay Photo Walk', date: '12 Desember 2026', location: 'Kota Tua, Jakarta', theme: 'japan kimono yokai', category: 'Komunitas', tier: 'Gratis', status: 'Disetujui', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=85', description: 'Jelajah malam bertema folklore Jepang dengan sesi foto bersama komunitas.', featured: false },
];

const categories = [
    { name: 'Anime', icon: 'auto_awesome' },
    { name: 'Game', icon: 'sports_esports' },
    { name: 'Film & Serial', icon: 'movie' },
    { name: 'Komik', icon: 'menu_book' },
    { name: 'Fantasy', icon: 'flare' },
    { name: 'Aksesori', icon: 'diamond' },
];

const orderStages = [
    'Pesanan Dibuat', 'Pembayaran Diverifikasi', 'Diproses', 'Dikirim JNE',
    'Dalam Perjalanan', 'Diterima', 'Masa Sewa', 'Dikembalikan / Selesai',
];
const toDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatDate = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${value}T00:00:00`)) : 'Belum ditentukan';

const readStorage = (key, fallback) => {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
};

const writeStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        showToast('Penyimpanan browser tidak tersedia. Perubahan ini hanya berlaku sementara.');
    }
};

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
const icon = (name, extra = '') => `<span class="material-symbols-outlined ${extra}" aria-hidden="true">${name}</span>`;
const photoCreditMarkup = (product) => product.imageCredit ? `<small class="photo-credit">Foto: <a href="${escapeHtml(product.imageCreditUrl)}" target="_blank" rel="noreferrer">${escapeHtml(product.imageCredit)}</a> · <a href="${escapeHtml(product.imageLicenseUrl)}" target="_blank" rel="noreferrer">${escapeHtml(product.imageLicense)}</a></small>` : '';
const localizeCopy = (markup) => [
    ['Smart pairing', 'Pencocokan kostum'],
    ['Dashboard overview', 'Ringkasan toko'],
    ['Review penyewa & pembayaran', 'Verifikasi penyewa & pembayaran'],
    ['Fulfillment', 'Pengelolaan pesanan'],
    ['Refund deposit', 'Kembalikan deposit'],
    ['Update status', 'Perbarui status'],
    ['· Featured', '· Unggulan'],
    ['Featured promotion', 'Promosi unggulan'],
    ['Organizer', 'Penyelenggara'],
    ['non-profit', 'nirlaba'],
    ['photo walk', 'jalan-jalan foto'],
    ['gathering', 'pertemuan komunitas'],
    ['E-wallet', 'Dompet digital'],
    ['Prototype UI/UX untuk keperluan akademik.', 'Demo UI/UX untuk keperluan akademik.'],
    ['">Edit</button>', '">Ubah</button>'],
].reduce((text, [source, replacement]) => text.replaceAll(source, replacement), markup);
const imageToDataUrl = (file, max = 900, quality = 0.75) => new Promise((resolve, reject) => {
    if (!file || !String(file.type).startsWith('image/')) return reject(new Error('File harus berupa gambar (JPG/PNG).'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('Ukuran gambar maksimal 8 MB.'));
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
        const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(source);
        resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => { URL.revokeObjectURL(source); reject(new Error('Gambar tidak dapat dibaca.')); };
    image.src = source;
});
const app = document.querySelector('#app');

const state = {
    page: 'home',
    param: null,
    productId: 'c1',
    size: 'M',
    days: 3,
    rentalDate: toDateValue(new Date(Date.now() + 86400000)),
    addons: [],
    category: '',
    search: '',
    sort: 'popular',
    maxPrice: null,
    loaded: false,
    favorites: readStorage(STORAGE_KEYS.favorites, []).map(String),
    sizeFilters: [],
    onlyAvailable: true,
    catalogPage: 1,
    orderFilter: 'Semua',
    adminSection: 'overview',
    trustScore: readStorage(STORAGE_KEYS.session, null)?.trustScore ?? 55,
    session: readStorage(STORAGE_KEYS.session, null),
    inventory: [],
    orders: [],
    events: [],
    eventSearch: { query: '', location: '', tier: '', active: false },
    selectedEvent: null,
    modal: null,
    chatOpen: false,
    chatMessages: [],
    chatRequestId: 0,
    chatLoading: false,
};

const api = async (path, { method = 'GET', body } = {}) => {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (state.session?.token) headers.Authorization = `Bearer ${state.session.token}`;
    const res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text.slice(0, 160) }; }
    if (!res.ok) {
        if (res.status === 401 && state.session) {
            clearSession();
            showToast('Sesi berakhir, silakan masuk kembali.');
            navigate('login');
        }
        const firstError = data.errors ? Object.values(data.errors)[0]?.[0] : null;
        const error = new Error(firstError || data.message || `Terjadi kesalahan server (${res.status}).`);
        error.status = res.status;
        throw error;
    }
    return data;
};

const asList = (value) => Array.isArray(value) ? value : (typeof value === 'string' && value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []);
const normalizeCostume = (item) => ({ ...item, id: String(item.id), size: asList(item.size), accessories: asList(item.accessories), themes: asList(item.themes), price: Number(item.price), deposit: Number(item.deposit), stock: Number(item.stock ?? 0), rating: Number(item.rating ?? 5), reviews: Number(item.reviews ?? 0) });
const normalizeEvent = (item) => ({ ...item, id: String(item.id), featured: Boolean(item.featured) });
const mySubmissionIds = () => readStorage(STORAGE_KEYS.submissions, []).map(String);

const setSession = (user, token = state.session?.token) => {
    state.session = { ...user, token };
    state.trustScore = user.trustScore ?? 55;
    writeStorage(STORAGE_KEYS.session, state.session);
};
const clearSession = () => {
    state.session = null;
    state.orders = [];
    state.trustScore = 55;
    try { localStorage.removeItem(STORAGE_KEYS.session); } catch {}
};
const loadCatalog = async () => {
    try {
        const data = await api('/costumes');
        state.inventory = (Array.isArray(data) ? data : []).map(normalizeCostume);
        if (!state.inventory.some((item) => String(item.id) === String(state.productId))) state.productId = state.inventory[0]?.id ?? '';
    } catch { /* katalog tetap seperti sebelumnya */ }
};
const loadEvents = async () => {
    try {
        const ids = mySubmissionIds().join(',');
        const data = await api(`/events${ids ? `?ids=${encodeURIComponent(ids)}` : ''}`);
        state.events = (Array.isArray(data) ? data : []).map(normalizeEvent);
    } catch {
        if (!state.events.length) state.events = seedEvents.map(normalizeEvent);
    }
};
const loadOrders = async () => {
    if (!state.session?.token) { state.orders = []; return; }
    try { state.orders = await api('/orders'); } catch { /* biarkan */ }
};
const refreshAll = () => Promise.all([loadCatalog(), loadEvents(), loadOrders()]);

const priceCeiling = () => Math.max(200000, ...state.inventory.map((item) => Math.ceil(item.price / 5000) * 5000));
const productById = (id) => state.inventory.find((product) => String(product.id) === String(id)) || state.inventory[0] || {
    id: '', name: 'Kostum', price: 0, deposit: 0, image: '', size: ['M'], category: '', series: '', description: '', accessories: [], rating: 5, reviews: 0
};
const depositForProduct = (product) => Math.ceil(product.deposit * (state.trustScore >= 85 ? 0.5 : 1));
const navigate = (page, param = null) => {
    if (state.session?.role === 'admin' && page !== 'admin') { page = 'admin'; param = state.adminSection; }
    if (state.session?.role === 'customer' && page === 'admin') { page = 'home'; param = null; }
    if (['checkout', 'orders', 'tracking'].includes(page) && state.session?.role !== 'customer') { page = 'login'; param = null; }
    state.page = page;
    state.param = param;
    state.modal = null;
    const hash = `#${page}${param ? `/${encodeURIComponent(param)}` : ''}`;
    history.pushState({ page, param }, '', hash);
    window.scrollTo({ top: 0, behavior: 'instant' });
    render();
};
const goBack = () => history.back();

const theme = () => document.documentElement.dataset.theme || 'light';
const toggleTheme = () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(STORAGE_KEYS.theme, next); } catch {}
    render();
};

const showToast = (message) => {
    document.querySelector('.toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 3200);
};

const topHeader = () => {
    const adminView = state.session?.role === 'admin';
    const customerView = state.session?.role === 'customer';
    const links = adminView
        ? [['overview', 'Dashboard Admin'], ['inventory', 'Kelola Katalog'], ['orders', 'Verifikasi Pesanan Masuk'], ['events', 'Kurasi Event'], ['qr', 'Generator QR Event']].map(([section, label]) => `<a href="#admin/${section}" data-admin-section="${section}" class="nav-link ${state.adminSection === section ? 'active' : ''}">${label}</a>`).join('')
        : [['home', 'Beranda'], ['catalog', 'Katalog Kostum'], ['rules', 'Rules Rental'], ['howto', 'Cara Sewa'], ...(customerView ? [['orders', 'Pesanan Saya']] : []), ['events', 'Telusuri Event Bersama AI']].map(([page, label]) => `<a href="#${page}" data-go="${page}" class="nav-link ${state.page === page || (state.page === 'detail' && page === 'catalog') ? 'active' : ''}">${label}</a>`).join('');
    return `
    <header class="site-header ${adminView ? 'admin-header' : ''}">
        <div class="container header-main">
            <a class="brand" href="${adminView ? '#admin' : '#home'}" data-go="${adminView ? 'admin' : 'home'}" aria-label="Let'sCosplay ${adminView ? 'dashboard admin' : 'beranda'}"><span class="brand-mark">LC</span><span class="brand-name">Let's<span>Cosplay</span></span></a>
            <nav class="main-nav" aria-label="Navigasi ${adminView ? 'admin' : 'customer'}">${links}</nav>
            <div class="header-actions">
                <button class="icon-button" type="button" data-action="theme" aria-label="Ganti tema" title="Ganti tema">${icon(theme() === 'dark' ? 'light_mode' : 'dark_mode')}</button>
                ${state.session ? `<span class="muted small header-user">${escapeHtml(state.session.name)}</span><button class="button button-secondary button-small" type="button" data-action="logout">Keluar</button>` : `<button class="button button-secondary button-small" type="button" data-go="login">Masuk</button><button class="button button-primary button-small" type="button" data-go="register">Daftar</button>`}
                <button class="icon-button mobile-menu" type="button" data-action="menu" aria-label="Buka navigasi">${icon('menu')}</button>
            </div>
        </div>
    </header>`;
};

const footer = () => `
    <footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div><a class="brand" href="#home" data-go="home"><span class="brand-mark">LC</span><span class="brand-name">Let's<span>Cosplay</span></span></a><p class="footer-note">Temukan karakter favoritmu. Kami siapkan kostum, kamu ciptakan ceritanya.</p></div>
                <div><h4>Jelajahi</h4><div class="footer-links"><a href="#catalog" data-go="catalog">Katalog kostum</a><a href="#events" data-go="events">Event cosplay</a><a href="#rules" data-go="rules">Aturan rental</a></div></div>
                <div><h4>Bantuan</h4><div class="footer-links">${state.session ? '<a href="#orders" data-go="orders">Pesanan saya</a>' : '<a href="#login" data-go="login">Masuk akun</a><a href="#register" data-go="register">Daftar akun</a>'}<a href="#howto" data-go="howto">Cara sewa</a><a href="#organizer" data-go="organizer">Pasang iklan event</a></div></div>
                <div><h4>Jam layanan</h4><div class="footer-links"><span>Senin–Sabtu</span><span>09.00–18.00 WIB</span><span>Jakarta, Indonesia</span></div></div>
            </div>
            <div class="footer-bottom"><span>© 2026 Let'sCosplay. Semua hak dilindungi.</span><span>Data akun &amp; pesanan tersimpan aman di server.</span></div>
        </div>
    </footer>`;

const skeletonCards = (count) => Array.from({ length: count }, () => '<article class="product-card skeleton-card" aria-hidden="true"><div class="product-photo"></div><div class="product-info"><span class="skeleton-line w60"></span><span class="skeleton-line w90"></span><span class="skeleton-line w40"></span></div></article>').join('');

const productCard = (product) => `
    <article class="product-card reveal ${product.stock > 0 ? '' : 'is-rented'}">
        <div class="product-photo">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
            ${product.tag ? `<span class="product-tag">${escapeHtml(product.tag)}</span>` : ''}
            <button type="button" class="favorite-button ${state.favorites.includes(String(product.id)) ? 'is-favorite' : ''}" data-action="favorite" data-id="${escapeHtml(product.id)}" aria-pressed="${state.favorites.includes(String(product.id))}" aria-label="Simpan ${escapeHtml(product.name)}">${icon('favorite', state.favorites.includes(String(product.id)) ? 'filled' : '')}</button>
        </div>
        <div class="product-info">
            <div class="product-meta"><span>${escapeHtml(product.category)} · ${escapeHtml(product.series)}${product.origin ? ` · ${escapeHtml(product.origin)}` : ''}</span><span class="availability ${product.stock > 0 ? '' : 'is-out'}">${product.stock > 0 ? 'Tersedia' : 'Sedang disewa'}</span></div>
            <h3 class="product-name">${escapeHtml(product.name)}</h3>
            <div class="card-bottom"><div><div class="product-price">${money(product.price)} <small>/ hari</small></div><div class="rating">${product.reviews ? `${icon('star')} ${product.rating} <span class="muted small">(${product.reviews})</span>` : '<span class="muted small">Baru</span>'}</div></div><button class="button button-soft button-small" type="button" data-go="detail" data-id="${escapeHtml(product.id)}">Lihat detail</button></div>
            ${photoCreditMarkup(product)}
        </div>
    </article>`;

const eventCard = (event, compact = false, aiMatch = null) => `
    <article class="event-card reveal">
        <img src="${escapeHtml(event.image)}" alt="Poster ${escapeHtml(event.title)}" loading="lazy">
        <div><div class="product-meta"><span>${escapeHtml(event.category)}</span><span>${escapeHtml(event.tier)}${event.featured ? ' · Unggulan' : ''}</span></div><h3>${escapeHtml(event.title)}</h3><p>${icon('calendar_month')} ${escapeHtml(event.date)} · ${escapeHtml(event.location)}</p>${compact ? '' : `<p>${escapeHtml(event.description)}</p>`}${aiMatch ? `<div class="event-ai-match"><strong>${escapeHtml(aiMatch.reasons.join(' · '))}</strong><small>Kostum terkait: ${escapeHtml(aiMatch.costumes.join(', ') || 'Belum ada pasangan langsung')}</small></div>` : ''}</div>
        <div class="event-card-actions"><button class="button button-primary button-small" type="button" data-go="event" data-id="${escapeHtml(event.id)}">${compact ? 'Lihat' : 'Kostum cocok'}</button></div>
    </article>`;

const homePage = () => `
    <section class="home-hero">
        <img class="hero-image" src="https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=2000&q=88" alt="Cosplay dan acara komunitas" fetchpriority="high">
        <div class="hero-content"><div class="hero-copy reveal"><span class="eyebrow">Sewa kostum. Jadi karakter favoritmu.</span><h1 class="display">Panggung cerita<br>ada di tanganmu.</h1><p>Kostum cosplay terkurasi, siap dikirim ke rumah. Pilih karakter, tentukan tanggal, dan mulai petualanganmu.</p><div class="hero-actions"><button class="button button-primary" data-go="catalog" type="button">Jelajahi kostum ${icon('arrow_forward')}</button><button class="button button-secondary" data-go="events" type="button">Telusuri event bersama AI</button></div><div class="hero-meta"><div><strong>${state.inventory.length || '—'}</strong>Kostum pilihan</div><div><strong>${state.events.filter((event) => event.status === 'Disetujui').length || '—'}</strong>Event tayang</div><div><strong>50%</strong>Deposit refundable</div></div></div></div>
    </section>
    <div class="container"><form class="search-panel" id="home-search"><label class="search-control">${icon('search')}<input name="query" placeholder="Cari karakter atau serial" aria-label="Cari karakter atau serial"></label><label class="search-control">${icon('category')}<select name="category" aria-label="Kategori"><option value="">Semua kategori</option>${categories.map((category) => `<option>${category.name}</option>`).join('')}</select></label><label class="search-control">${icon('straighten')}<select name="size" aria-label="Ukuran"><option value="">Semua ukuran</option>${['XS', 'S', 'M', 'L', 'XL'].map((size) => `<option>${size}</option>`).join('')}</select></label><button class="button button-primary" type="submit">Cari kostum</button></form></div>
    <div class="container content-section">
        <div class="section-heading"><div><span class="eyebrow">Temukan duniamu</span><h2>Jelajahi kategori</h2></div><button class="button button-quiet" data-go="catalog" type="button">Semua kostum ${icon('arrow_forward')}</button></div>
        <div class="category-row">${categories.map((category) => `<button class="category-tile" type="button" data-category="${category.name}"><span class="category-icon">${icon(category.icon)}</span>${category.name}</button>`).join('')}</div>
        <div class="section-heading"><div><span class="eyebrow">Kurasi minggu ini</span><h2>Kostum yang lagi ramai</h2></div><button class="button button-quiet" data-go="catalog" type="button">Lihat katalog ${icon('arrow_forward')}</button></div>
        <div class="product-grid">${state.inventory.slice(0, 4).map(productCard).join('') || (state.loaded ? '<div class="empty-state">Katalog masih kosong. Kostum baru segera hadir!</div>' : skeletonCards(4))}</div>
        <div class="section-heading"><div><span class="eyebrow">Mudah dari awal</span><h2>Rental dalam empat langkah</h2></div></div>
        <div class="steps-grid">${[['01', 'Pilih karakter', 'Cari kostum, pilih ukuran, dan tentukan lama sewa.'], ['02', 'Lengkapi data', 'Isi formulir penyewa dan unggah dokumen yang diperlukan.'], ['03', 'Bayar DP', 'Amankan pesanan dengan pembayaran minimal 50%.'], ['04', 'Tampil percaya diri', 'Kostum dikirim, lalu kembalikan sesuai jadwal rental.']].map(([n, title, copy]) => `<article class="step-item"><span class="step-number">${n}</span><h3>${title}</h3><p>${copy}</p></article>`).join('')}</div>
        <div class="section-heading"><div><span class="eyebrow">Komunitas lebih dekat</span><h2>Event cosplay mendatang</h2></div><button class="button button-quiet" data-go="events" type="button">Semua event ${icon('arrow_forward')}</button></div>
        <div class="stack">${state.events.filter((event) => event.status === 'Disetujui').slice(0, 2).map((event) => eventCard(event, true)).join('')}</div>
        <section class="event-strip" style="margin-top:42px"><div class="event-art" role="img" aria-label="Suasana event komunitas"></div><div class="event-copy"><span class="eyebrow">Untuk komunitas & organizer</span><h2>Event-mu pantas ditemukan.</h2><p>Promosikan gathering, festival, atau photo walk kepada komunitas cosplay yang tepat.</p><button class="button button-primary" data-go="organizer" type="button">Pasang iklan event ${icon('arrow_forward')}</button></div></section>
    </div>`;

const catalogPage = () => {
    const matching = state.inventory.filter((product) => {
        const query = state.search.toLowerCase();
        return (!state.category || product.category === state.category || (state.category === 'Fantasy' && product.themes.includes('fantasy')))
            && (!query || `${product.name} ${product.series} ${product.category}`.toLowerCase().includes(query))
            && product.price <= (state.maxPrice ?? Infinity)
            && (!state.sizeFilters.length || state.sizeFilters.some((size) => product.size.includes(size)))
            && (!state.onlyAvailable || product.stock > 0);
    });
    const sorted = [...matching].sort((a, b) => state.sort === 'price-low' ? a.price - b.price : state.sort === 'price-high' ? b.price - a.price : b.rating - a.rating);
    return `<div class="container page-wrap">
        <div class="breadcrumb"><a data-go="home" href="#home">Beranda</a><span>/</span><span>Katalog kostum</span></div>
        <div class="page-intro"><div><span class="eyebrow">Temukan karakter favorit</span><h1 class="page-title">Katalog kostum</h1><p>Pilihan kostum terawat untuk convention, pemotretan, dan acara spesialmu.</p></div><button class="button button-secondary" data-go="rules" type="button">${icon('menu_book')} Aturan rental</button></div>
        <div class="catalog-layout">
            <aside class="filter-panel" id="filter-panel"><div class="filter-title">Filter kostum <button class="button button-quiet button-small" data-action="reset-filters" type="button">Reset</button></div><div class="filter-body">
                <div class="filter-group"><h4>Kategori</h4>${categories.map((category) => `<label class="filter-label"><input type="radio" name="catalog-category" value="${category.name}" ${state.category === category.name ? 'checked' : ''}>${category.name}</label>`).join('')}<label class="filter-label"><input type="radio" name="catalog-category" value="" ${!state.category ? 'checked' : ''}>Semua kategori</label></div>
                <div class="filter-group"><h4>Ukuran tersedia</h4>${['XS', 'S', 'M', 'L', 'XL'].map((size) => `<label class="filter-label"><input type="checkbox" data-size-filter="${size}" ${state.sizeFilters.includes(size) ? 'checked' : ''}>${size}</label>`).join('')}</div>
                <div class="filter-group"><h4>Rentang harga per hari</h4><div class="filter-range"><input type="range" min="50000" max="${priceCeiling()}" step="5000" value="${state.maxPrice ?? priceCeiling()}" data-action="price-range"><span class="muted small">Maks. ${money(state.maxPrice ?? priceCeiling())}</span></div></div>
                <div class="filter-group"><h4>Ketersediaan</h4><label class="filter-label"><input type="checkbox" data-availability-filter ${state.onlyAvailable ? 'checked' : ''}> Siap disewa</label></div>
            </div></aside>
            <section><div class="catalog-toolbar"><span class="muted small">${sorted.length} kostum ditemukan</span><div class="quantity-row"><button class="button button-secondary button-small" data-action="mobile-filters" type="button">${icon('tune')} Filter</button><select class="select" data-action="sort" aria-label="Urutkan katalog"><option value="popular" ${state.sort === 'popular' ? 'selected' : ''}>Paling populer</option><option value="price-low" ${state.sort === 'price-low' ? 'selected' : ''}>Harga terendah</option><option value="price-high" ${state.sort === 'price-high' ? 'selected' : ''}>Harga tertinggi</option></select></div></div>
                <div class="filter-chips">${state.search ? `<button type="button" class="chip chip-button" data-action="clear-search" aria-label="Hapus pencarian ${escapeHtml(state.search)}">${escapeHtml(state.search)} ×</button>` : ''}<span class="chip">Deposit refundable</span><span class="chip">Kondisi terverifikasi</span></div><div class="product-grid">${sorted.length ? sorted.map(productCard).join('') : (state.loaded ? '<div class="empty-state">Belum ada kostum yang sesuai. Coba ubah kategori atau harga.</div>' : skeletonCards(6))}</div><div class="pagination"><button aria-label="Halaman sebelumnya">‹</button><button class="active">1</button><button>2</button><button>3</button><button aria-label="Halaman berikutnya">›</button></div>
            </section>
        </div></div>`;
};

const detailPage = () => {
    const product = productById(state.param || state.productId);
    state.productId = product.id;
    if (!product.size.includes(state.size)) state.size = product.size[0];
    const addOnTotal = state.addons.reduce((total, addon) => total + (addon === 'wig' ? 35000 : 15000), 0);
    const subtotal = (product.price + addOnTotal) * state.days;
    const ship = 18000;
    const deposit = depositForProduct(product);
    const total = subtotal + ship + deposit;
    const images = [product.image];
    return `<div class="container page-wrap"><div class="breadcrumb"><a href="#home" data-go="home">Beranda</a><span>/</span><a href="#catalog" data-go="catalog">Katalog</a><span>/</span><span>${escapeHtml(product.name)}</span></div>
        <div class="detail-layout"><div><img class="detail-main-image" src="${escapeHtml(images[0])}" alt="${escapeHtml(product.name)}"><div class="detail-thumbs" ${images.length > 1 ? '' : 'hidden'}>${images.map((image, index) => `<img src="${escapeHtml(image)}" data-action="gallery" alt="Foto ${index + 1} ${escapeHtml(product.name)}" loading="lazy">`).join('')}</div><section class="panel" style="margin-top:20px"><h2>Yang termasuk dalam paket</h2><div class="stack">${(product.accessories || []).map((item) => `<div class="price-line"><span>${icon('check_circle')} ${escapeHtml(item)}</span><span>Termasuk</span></div>`).join('') || '<p class="muted small">Tidak ada aksesori tambahan.</p>'}</div></section><section class="panel" id="size-guide" style="margin-top:16px;scroll-margin-top:100px"><h2>Panduan ukuran</h2><p class="muted small">Ukuran menggunakan standar badan Indonesia. Pilih ukuran yang biasa kamu gunakan; tim kami akan mengonfirmasi sebelum dikirim.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Ukuran</th><th>Lingkar dada</th><th>Panjang</th></tr></thead><tbody><tr><td>XS</td><td>74–81 cm</td><td>130 cm</td></tr><tr><td>S</td><td>82–88 cm</td><td>135 cm</td></tr><tr><td>M</td><td>89–96 cm</td><td>140 cm</td></tr><tr><td>L</td><td>97–104 cm</td><td>145 cm</td></tr><tr><td>XL</td><td>105–114 cm</td><td>150 cm</td></tr></tbody></table></div></section></div>
        <div class="detail-content"><span class="eyebrow">${escapeHtml(product.series)}</span><h1>${escapeHtml(product.name)}</h1><div class="product-meta"><span>${escapeHtml(product.category)} · ${product.reviews ? `${product.reviews} ulasan` : 'Belum ada ulasan'}</span><span class="rating">${product.reviews ? `${icon('star')} ${product.rating}` : 'Baru'}</span></div><p class="detail-blurb">${escapeHtml(product.description)}</p><div class="detail-price">${money(product.price)} <small>/ hari</small></div><div class="field"><span class="field-label">Pilih ukuran</span><div class="size-row">${product.size.map((size) => `<button class="size-option ${state.size === size ? 'selected' : ''}" data-size="${size}" type="button">${size}</button>`).join('')}<button class="text-button small" data-scroll="size-guide" type="button">Panduan ukuran</button></div></div><div class="field" style="margin-top:17px"><label for="rental-days">Lama sewa</label><select class="select" id="rental-days" data-action="days">${[1, 2, 3, 4, 5, 6, 7].map((days) => `<option value="${days}" ${state.days === days ? 'selected' : ''}>${days} hari</option>`).join('')}</select></div><div class="field" style="margin-top:17px"><label for="rental-date">Tanggal mulai sewa</label><input class="input" id="rental-date" type="date" min="${toDateValue(new Date())}" value="${state.rentalDate}" data-action="start-date" required><small class="muted">Pilih tanggal kostum akan mulai digunakan.</small></div><div class="field" style="margin-top:17px"><span class="field-label">Aksesori tambahan</span><div class="addon-list"><label class="addon-option"><span><input type="checkbox" data-addon="wig" ${state.addons.includes('wig') ? 'checked' : ''}> Styling wig premium</span><strong>+ Rp35.000 / hari</strong></label><label class="addon-option"><span><input type="checkbox" data-addon="care" ${state.addons.includes('care') ? 'checked' : ''}> Paket perawatan kostum</span><strong>+ Rp15.000 / hari</strong></label></div></div><div class="price-box"><div class="price-line"><span>Sewa (${state.days} hari)</span><strong>${money(subtotal)}</strong></div><div class="price-line"><span>Estimasi pengiriman</span><strong>${money(ship)}</strong></div><div class="price-line"><span>Deposit refundable</span><strong>${money(deposit)}</strong></div><div class="price-line total"><span>Estimasi total</span><strong>${money(total)}</strong></div><p class="muted small">Deposit dikembalikan setelah kostum diterima dan kondisinya diperiksa.</p></div>${product.stock > 0 ? `<button class="button button-primary" style="width:100%" type="button" data-action="checkout">Lanjut ke pemesanan ${icon('arrow_forward')}</button>` : `<button class="button button-primary" style="width:100%" type="button" disabled>Sedang disewa · stok habis</button>`}<button class="button button-secondary" style="width:100%;margin-top:8px" type="button" data-go="rules">Baca aturan rental</button></div></div></div>`;
};

const rulesPage = () => `<div class="container page-wrap"><div class="page-intro"><div><span class="eyebrow">Sebelum menyewa</span><h1 class="page-title">Aturan rental</h1><p>Supaya pengalaman rental nyaman dan kostum tetap terawat, baca ketentuan berikut sebelum memesan.</p></div><button class="button button-primary" data-go="catalog" type="button">Pilih kostum ${icon('arrow_forward')}</button></div><div class="rules-grid"><nav class="rules-nav"><a href="#rules" data-scroll="renter">Persyaratan penyewa</a><a href="#rules" data-scroll="payment">Pembayaran & deposit</a><a href="#rules" data-scroll="care">Perawatan kostum</a><a href="#rules" data-scroll="shipping">Pengiriman & retur</a><a href="#rules" data-scroll="late">Keterlambatan</a></nav><div class="rules-content"><section id="renter"><h2>Persyaratan penyewa</h2><ul><li>Penyewa berusia minimal 17 tahun dan memberikan identitas yang valid untuk verifikasi.</li><li>Nomor telepon aktif dan nomor penjamin wajib dapat dihubungi selama masa sewa.</li><li>Alamat pengiriman harus lengkap, termasuk kecamatan, kota, kode pos, dan petunjuk rumah.</li><li>Data digunakan hanya untuk proses verifikasi dan pemenuhan pesananmu.</li></ul></section><section id="payment"><h2>Pembayaran & deposit</h2><ul><li>Pesanan dikonfirmasi setelah pembayaran uang muka minimal 50% dari total estimasi.</li><li>Sisa pembayaran harus diterima paling lambat H-1 sebelum kostum dikirim.</li><li>Deposit bersifat refundable dan dikembalikan maksimal 3 hari kerja setelah pemeriksaan retur.</li><li>Biaya pengiriman dihitung terpisah dari harga sewa dan deposit.</li></ul></section><section id="care"><h2>Perawatan kostum</h2><ul><li>Gunakan kostum dengan tangan bersih dan hindari makanan/minuman di area kostum.</li><li>Jangan mencuci, menyetrika, mengelem, atau mengubah kostum tanpa persetujuan tim.</li><li>Simpan aksesori dalam kantong masing-masing dan gunakan kemasan pelindung saat retur.</li><li>Kerusakan atau kehilangan komponen dapat mengurangi nilai deposit sesuai hasil pemeriksaan.</li></ul></section><section id="shipping"><h2>Pengiriman & retur</h2><ul><li>Kostum dikirim melalui JNE Express dengan nomor resi yang dibagikan di halaman Pesanan saya.</li><li>Paket dijadwalkan tiba sebelum tanggal penggunaan; sampaikan kebutuhan khusus saat checkout.</li><li>Kirim kembali kostum pada hari terakhir sewa menggunakan label retur yang disertakan.</li><li>Foto kondisi paket sebelum dikirim sebagai dokumentasi bersama.</li></ul></section><section id="late"><h2>Keterlambatan & pembatalan</h2><ul><li>Keterlambatan pengembalian dikenakan biaya 25% harga sewa per hari.</li><li>Pembatalan sebelum kostum disiapkan dapat memperoleh pengembalian DP penuh.</li><li>Setelah paket dikirim, biaya pengiriman tidak dapat dikembalikan.</li></ul></section><label class="checkline"><input type="checkbox" data-action="rules-accept"> Saya sudah membaca dan memahami aturan rental.</label></div></div></div>`;

const howToPage = () => `<div class="container page-wrap"><div class="page-intro"><div><span class="eyebrow">Panduan penyewa</span><h1 class="page-title">Cara sewa kostum</h1><p>Alur rental yang jelas dari pilih karakter sampai pengembalian kostum.</p></div><button class="button button-primary" data-go="catalog">Mulai pilih kostum ${icon('arrow_forward')}</button></div><div class="steps-grid">${[['01', 'Pilih kostum dan tanggal', 'Cari karakter, cek ukuran yang tersedia, tentukan durasi dan tanggal mulai sewa.'], ['02', 'Lengkapi profil penyewa', 'Isi kontak, alamat, penjamin, dan unggah selfie identitas untuk simulasi pemeriksaan.'], ['03', 'Bayar DP minimal 50%', 'Unggah bukti transfer. Sisa pembayaran diselesaikan paling lambat H-1 pengiriman.'], ['04', 'Terima, gunakan, kembalikan', 'Pantau resi JNE dan status pesanan. Kembalikan kostum sesuai tanggal akhir sewa.']].map(([number, title, copy]) => `<article class="step-item"><span class="step-number">${number}</span><h3>${title}</h3><p>${copy}</p></article>`).join('')}</div><div class="notice">Deposit refundable setelah kostum diterima kembali dan pemeriksaan kondisi selesai. <button class="text-button" data-go="rules">Baca Rules Rental</button></div></div>`;

const renterSection = () => {
    const me = state.session || {};
    const locked = (id, label, value) => `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" value="${escapeHtml(value)}" readonly tabindex="-1" style="opacity:.85;cursor:not-allowed"></div>`;
    const missingProfile = !me.phone || !me.socialPlatform || !me.socialHandle || !me.guarantor || !me.hasIdSelfie;
    return `<section class="form-section"><h2><span class="section-index">2</span> Data penyewa</h2><div class="notice" style="margin-bottom:14px">Data diri otomatis diambil dari akunmu. ${missingProfile ? 'Akunmu belum lengkap — lengkapi kolom kosong di bawah (hanya sekali).' : 'Kamu hanya perlu memastikan <strong>alamat pengiriman</strong>.'}</div><div class="form-grid">
        ${locked('renter-name', 'Nama lengkap', me.name || '')}
        ${me.phone ? locked('renter-phone', 'Nomor telepon aktif', me.phone) : '<div class="field"><label for="renter-phone">Nomor telepon aktif *</label><input class="input" id="renter-phone" name="phone" required type="tel" placeholder="08xx xxxx xxxx"></div>'}
        ${me.socialPlatform ? locked('social-platform', 'Media sosial', me.socialPlatform) : '<div class="field"><label for="social-platform">Media sosial *</label><select class="select" id="social-platform" name="socialPlatform" required><option value="">Pilih platform</option><option>Instagram</option><option>TikTok</option><option>X</option><option>Lainnya</option></select></div>'}
        ${me.socialHandle ? locked('social-handle', 'Username akun', me.socialHandle) : '<div class="field"><label for="social-handle">Username akun *</label><input class="input" id="social-handle" name="socialHandle" required placeholder="@username"></div>'}
        ${me.guarantor ? locked('guarantor-phone', 'Nomor telepon penjamin', me.guarantor) : '<div class="field"><label for="guarantor-phone">Nomor telepon penjamin *</label><input class="input" id="guarantor-phone" name="guarantor" required type="tel" placeholder="Nomor keluarga/kerabat"></div>'}
        ${me.hasIdSelfie ? locked('id-selfie-ok', 'Foto selfie identitas', 'Sudah terverifikasi di akun') : '<div class="field"><label for="id-selfie">Foto selfie memegang identitas *</label><input class="input" id="id-selfie" name="idSelfie" type="file" accept="image/*" required></div>'}
        <div class="field span-2"><label for="renter-address">Alamat lengkap pengiriman *</label><textarea class="textarea" id="renter-address" name="address" required minlength="10" autocomplete="street-address" placeholder="Jalan, nomor rumah, RT/RW, kecamatan, kota, kode pos">${escapeHtml(me.address || '')}</textarea><small class="muted">Terisi dari alamat akunmu. Ubah jika kostum dikirim ke tempat lain — hanya untuk pesanan ini.</small></div>
    </div></section>`;
};

const checkoutPage = () => {
    const product = productById(state.productId);
    const addOnTotal = state.addons.reduce((total, addon) => total + (addon === 'wig' ? 35000 : 15000), 0);
    const subtotal = (product.price + addOnTotal) * state.days;
    const shipping = 18000;
    const total = subtotal + shipping + product.deposit;
    const minimumDp = Math.ceil(total * 0.5);
    const balance = total - minimumDp;
    return `<div class="container page-wrap"><div class="breadcrumb"><a href="#catalog" data-go="catalog">Katalog kostum</a><span>/</span><span>Checkout</span></div><div class="page-intro"><div><span class="eyebrow">Satu langkah lagi</span><h1 class="page-title">Formulir pemesanan</h1><p>Lengkapi data dengan benar agar proses verifikasi dan pengiriman berjalan lancar.</p></div></div><form id="checkout-form"><div class="checkout-layout"><div class="checkout-sections">
        <section class="form-section"><h2><span class="section-index">1</span> Kostum yang dipesan</h2><div class="readonly-product"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(product.name)}</h3><span class="muted small">Ukuran ${escapeHtml(state.size)} · ${state.days} hari · mulai ${escapeHtml(formatDate(state.rentalDate))} · ${state.addons.length} aksesori tambahan</span><p class="small"><button type="button" class="text-button" data-go="detail" data-id="${escapeHtml(product.id)}">Ubah pilihan</button></p></div></div></section>
        ${renterSection()}
        <section class="form-section"><h2><span class="section-index">3</span> Rincian pembayaran</h2><div class="price-line"><span>Subtotal sewa dan aksesori</span><strong>${money(subtotal)}</strong></div><div class="price-line"><span>Pengiriman</span><strong>${money(shipping)}</strong></div><div class="price-line"><span>Deposit refundable</span><strong>${money(product.deposit)}</strong></div><div class="price-line total"><span>Total estimasi</span><strong>${money(total)}</strong></div><div class="notice" style="margin-top:14px">Minimum DP 50%: <strong>${money(minimumDp)}</strong>. Sisa <strong>${money(balance)}</strong> dibayarkan paling lambat H-1 sebelum pengiriman.</div><div class="field" style="margin-top:14px"><label for="payment-amount">Jumlah DP yang dibayar *</label><input class="input" id="payment-amount" name="paymentAmount" type="number" min="${minimumDp}" max="${total}" step="1000" value="${minimumDp}" required><small class="muted">Minimal ${money(minimumDp)} · maksimal ${money(total)}</small></div></section>
        <section class="form-section"><h2><span class="section-index">4</span> Bukti pembayaran</h2><div class="payment-choice"><label><input type="radio" name="paymentMethod" value="Transfer bank" required> Transfer bank<br><small class="muted">BCA · BNI · Mandiri</small></label><label><input type="radio" name="paymentMethod" value="E-wallet" required> E-wallet<br><small class="muted">GoPay · OVO · DANA</small></label></div><div class="field" style="margin-top:14px"><label for="payment-proof">Unggah bukti transfer *</label><input class="input" id="payment-proof" name="paymentProof" type="file" accept="image/*" required><small class="muted">JPG atau PNG, maksimal 5 MB.</small></div></section>
        <section class="form-section"><h2><span class="section-index">5</span> Persetujuan</h2><label class="checkline"><input type="checkbox" name="agree" required> Saya menyetujui <a class="text-button" href="#rules" data-go="rules">Aturan rental</a>, penggunaan deposit, dan jadwal pengembalian kostum.</label><div class="notice" style="margin-top:13px">Dokumen identitas dan bukti pembayaran hanya dilihat admin untuk keperluan verifikasi pesanan ini.</div></section>
    </div><aside class="sticky-summary"><h2>Ringkasan pesanan</h2><div class="price-line"><span>Kostum</span><strong>${money(product.price * state.days)}</strong></div>${addOnTotal ? `<div class="price-line"><span>Aksesori tambahan</span><strong>${money(addOnTotal * state.days)}</strong></div>` : ''}<div class="price-line"><span>Pengiriman</span><strong>${money(shipping)}</strong></div><div class="price-line"><span>Deposit</span><strong>${money(product.deposit)}</strong></div><div class="price-line total"><span>Total</span><strong>${money(total)}</strong></div><div class="deposit-note">${icon('verified_user')} Deposit refundable setelah kostum retur dan lolos pemeriksaan.</div><button class="button button-primary" type="submit" style="width:100%;margin-top:16px">Kirim pesanan ${icon('arrow_forward')}</button><p class="muted small">Pesanan tersimpan di akunmu dan bisa dilacak di menu Pesanan saya.</p></aside></div></form></div>`;
};

const stageForOrder = (order) => order.stage ?? 0;
const orderProduct = (order) => state.inventory.find((item) => String(item.id) === String(order.productId))
    || { id: order.productId, name: order.productName || 'Kostum', image: order.productImage || '', price: 0, deposit: 0, size: [order.size], category: '', series: '', accessories: [], rating: 5, reviews: 0 };
const ordersPage = () => {
    const tabs = ['Semua', 'Menunggu verifikasi', 'Diproses', 'Disewa', 'Selesai'];
    const customerOrders = state.orders.filter((order) => order.customerEmail === state.session?.email);
    const visibleOrders = customerOrders.filter((order) => state.orderFilter === 'Semua' || order.bucket === state.orderFilter);
    return `<div class="container page-wrap"><div class="page-intro"><div><span class="eyebrow">Pantau perjalanan paketmu</span><h1 class="page-title">Pesanan saya</h1><p>Semua status dan detail rental tersimpan di sini.</p></div><button class="button button-primary" data-go="catalog" type="button">Cari kostum ${icon('arrow_forward')}</button></div><div class="orders-tabs">${tabs.map((tab) => `<button class="orders-tab ${state.orderFilter === tab ? 'active' : ''}" data-order-filter="${tab}" type="button">${tab}</button>`).join('')}</div>${visibleOrders.length ? visibleOrders.map((order) => {
        const product = orderProduct(order);
        const stage = stageForOrder(order);
        return `<article class="order-card"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(product.name)}</h3><p class="muted small">Kode ${escapeHtml(order.id)} · Ukuran ${escapeHtml(order.size)} · ${order.days} hari</p><span class="status-pill ${stage > 5 ? 'success' : ''}">${escapeHtml(orderStages[stage])}</span><div class="small" style="margin-top:8px"><strong>${money(order.total)}</strong> <span class="muted">· ${escapeHtml(order.customerName || 'Penyewa')}</span></div></div><button class="button button-secondary button-small" data-go="tracking" data-id="${escapeHtml(order.id)}" type="button">Lacak pesanan</button></article>`;
    }).join('') : '<div class="empty-state">Belum ada pesanan di kategori ini. Kostum pilihanmu menunggu.</div>'}</div>`;
};

const trackingPage = () => {
    const order = state.orders.find((item) => item.id === state.param && item.customerEmail === state.session?.email);
    if (!order) return `<div class="container page-wrap"><div class="empty-state">Pesanan tidak ditemukan. <button class="button button-primary" data-go="catalog">Pilih kostum</button></div></div>`;
    const product = orderProduct(order);
    const stage = stageForOrder(order);
    return `<div class="container page-wrap"><div class="breadcrumb"><button class="text-button" data-go="orders">Pesanan saya</button><span>/</span><span>${escapeHtml(order.id)}</span></div><section class="success-panel"><span class="success-icon">${icon(stage >= 7 ? 'check' : 'package_2')}</span><span class="eyebrow">${stage >= 7 ? 'Rental selesai' : 'Status pesanan'}</span><h1>${escapeHtml(orderStages[stage])}</h1><p class="muted">Kode pesanan <strong>${escapeHtml(order.id)}</strong> · dibuat ${escapeHtml(order.createdAt)}</p><div class="tracking-list">${orderStages.map((label, index) => `<div class="tracking-step ${index < stage ? 'done' : ''} ${index === stage ? 'current' : ''}"><span class="tracking-dot">${index < stage ? '✓' : index + 1}</span><div><strong>${label}</strong><small>${index < stage ? 'Selesai' : index === stage ? 'Sedang berlangsung' : 'Menunggu tahap sebelumnya'}</small></div></div>`).join('')}</div><div class="panel" style="text-align:left"><div class="readonly-product"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(product.name)}</h3><span class="muted small">Ukuran ${escapeHtml(order.size)} · ${order.days} hari</span><p class="small"><strong>Total ${money(order.total)}</strong></p></div></div>${order.trackingNumber ? `<p class="small">Resi JNE Express: <strong>${escapeHtml(order.trackingNumber)}</strong></p>` : ''}</div><button class="button button-secondary" style="margin-top:18px" data-go="orders">Kembali ke pesanan</button></section></div>`;
};

const registerProfileFields = () => `<fieldset class="profile-fields" data-customer-only style="border:0;padding:0;margin:0;display:grid;gap:14px"><div class="field"><label for="reg-phone">Nomor telepon aktif *</label><input class="input" id="reg-phone" name="phone" type="tel" required autocomplete="tel" placeholder="08xx xxxx xxxx"></div><div class="field"><label for="reg-address">Alamat lengkap (alamat utama) *</label><textarea class="textarea" id="reg-address" name="address" required minlength="10" autocomplete="street-address" placeholder="Jalan, nomor rumah, RT/RW, kecamatan, kota, kode pos"></textarea><small class="muted">Jadi alamat pengiriman bawaan. Saat checkout kamu tetap bisa menggantinya.</small></div><div class="form-grid"><div class="field"><label for="reg-social">Media sosial *</label><select class="select" id="reg-social" name="socialPlatform" required><option value="">Pilih platform</option><option>Instagram</option><option>TikTok</option><option>X</option><option>Lainnya</option></select></div><div class="field"><label for="reg-handle">Username akun *</label><input class="input" id="reg-handle" name="socialHandle" required placeholder="@username"></div></div><div class="field"><label for="reg-guarantor">Nomor telepon penjamin *</label><input class="input" id="reg-guarantor" name="guarantor" type="tel" required placeholder="Nomor keluarga/kerabat"></div><div class="field"><label for="id-selfie">Foto selfie memegang identitas *</label><input class="input" id="id-selfie" name="idSelfie" type="file" accept="image/*" required><small class="muted">JPG/PNG, maks. 8 MB. Hanya dilihat admin untuk verifikasi.</small></div><div class="field"><span class="field-label">Pernah menyewa kostum sebelumnya? *</span><div class="quantity-row"><label class="filter-label"><input type="radio" name="previousRental" value="yes" required data-previous-rental> Ya</label><label class="filter-label"><input type="radio" name="previousRental" value="no" required data-previous-rental> Belum</label></div></div><div class="field" id="previous-store-wrap" hidden><label for="previous-store">Nama toko rental sebelumnya *</label><input class="input" id="previous-store" name="previousStore" placeholder="Nama toko / akun rental"></div></fieldset>`;

const accountAuthPage = (register = false, adminOnly = false) => `<div class="container page-wrap"><div class="auth-layout"><div class="auth-art"><div class="auth-art-content"><span class="eyebrow">Akun Let'sCosplay</span><h2>${register ? 'Mulai cerita cosplay-mu.' : 'Masuk dan lanjutkan petualanganmu.'}</h2><p>Data dirimu cukup diisi sekali; saat menyewa tinggal pilih alamat pengiriman.</p></div></div><div class="auth-form-wrap"><span class="eyebrow">${register ? 'Pendaftaran akun' : 'Akses aman'}</span><h1>${register ? 'Buat akun' : adminOnly ? 'Masuk admin rental' : 'Masuk ke akunmu'}</h1><p class="muted small">${register ? 'Penyewa dapat mendaftar kapan saja. Akun admin hanya satu.' : 'Gunakan email dan kata sandi yang terdaftar.'}</p><form class="auth-form" id="role-auth-form" data-mode="${register ? 'register' : 'login'}" data-admin-only="${adminOnly ? 'true' : 'false'}">${register ? '<div class="field"><label for="auth-name">Nama lengkap sesuai identitas</label><input class="input" id="auth-name" name="name" minlength="3" required autocomplete="name"></div><div class="field"><label for="auth-role">Jenis akun</label><select class="select" id="auth-role" name="role" required><option value="customer">Penyewa</option><option value="admin">Admin Rental</option></select></div>' : ''}<div class="field"><label for="auth-email">Email</label><input class="input" type="email" id="auth-email" name="email" required autocomplete="email" placeholder="nama@email.com" value="${adminOnly ? 'adminrental123@gmail.com' : ''}"></div><div class="field"><label for="auth-password">Kata sandi</label><input class="input" type="password" id="auth-password" name="password" required minlength="8" autocomplete="${register ? 'new-password' : 'current-password'}" placeholder="Masukkan kata sandi"></div>${register ? registerProfileFields() : ''}<p class="small" data-auth-error role="alert" hidden></p>${register ? '<label class="checkline"><input type="checkbox" name="terms" required> Saya menyetujui syarat penggunaan dan kebijakan privasi.</label>' : ''}<button class="button button-primary" type="submit">${register ? 'Daftar sekarang' : 'Masuk'} ${icon('arrow_forward')}</button></form><p class="auth-switch">${register ? 'Sudah memiliki akun?' : 'Belum memiliki akun?'} <button class="text-button" type="button" data-go="${register ? 'login' : 'register'}">${register ? 'Masuk' : 'Daftar penyewa'}</button></p></div></div></div>`;

const eventMatchDetails = (event, preferences) => {
    const terms = preferences.query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
    const eventText = `${event.title} ${event.theme} ${event.category} ${event.description}`.toLowerCase();
    const costumes = matchingProducts(`${event.theme} ${event.title}`);
    const costumeText = costumes.map((product) => `${product.name} ${product.themes.join(' ')}`).join(' ').toLowerCase();
    const matchedTerms = terms.filter((term) => eventText.includes(term) || costumeText.includes(term));
    const locationMatched = preferences.location && event.location.toLowerCase().includes(preferences.location.toLowerCase());
    const reasons = [];
    if (matchedTerms.length) reasons.push(`Tema cocok: ${matchedTerms.join(', ')}`);
    if (locationMatched) reasons.push(`Lokasi cocok: ${event.location}`);
    if (preferences.tier) reasons.push(`Tier ${event.tier} sesuai`);
    return { matchedTerms, locationMatched, reasons, costumes: costumes.map((product) => product.name) };
};

const eventsPage = () => {
    const publicEvents = state.events.filter((event) => event.status === 'Disetujui');
    const preferences = state.eventSearch;
    const recommendations = preferences.active
        ? publicEvents.map((event) => ({ event, match: eventMatchDetails(event, preferences) }))
            .filter(({ event, match }) => (!preferences.tier || event.tier === preferences.tier)
                && (!preferences.location || match.locationMatched)
                && (!preferences.query || match.matchedTerms.length))
            .sort((a, b) => b.match.matchedTerms.length - a.match.matchedTerms.length || Number(b.match.locationMatched) - Number(a.match.locationMatched))
        : publicEvents.map((event) => ({ event, match: null }));
    return `<div class="container page-wrap"><div class="page-intro"><div><span class="eyebrow">Komunitas, fandom, dan cerita</span><h1 class="page-title">Telusuri event bersama AI</h1><p>Temukan event cosplay dan rekomendasi kostum yang cocok dengan tema acaranya.</p></div><button class="button button-primary" data-go="organizer" type="button">${icon('campaign')} Pasang iklan event</button></div><section class="panel event-ai-panel"><div class="event-ai-heading"><div><span class="eyebrow">Pencari event personal</span><h2>Acara seperti apa yang kamu cari?</h2></div><span class="status-pill">Pencocokan AI lokal</span></div><form id="event-ai-form" class="event-ai-form"><label class="field"><span>Tema, karakter, atau fandom</span><input class="input" name="query" value="${escapeHtml(preferences.query)}" placeholder="Contoh: Genshin, anime, kimono"></label><label class="field"><span>Kota</span><input class="input" name="location" value="${escapeHtml(preferences.location)}" placeholder="Contoh: Jakarta"></label><label class="field"><span>Tipe event</span><select class="select" name="tier"><option value="" ${!preferences.tier ? 'selected' : ''}>Semua tier</option><option value="Gratis" ${preferences.tier === 'Gratis' ? 'selected' : ''}>Gratis</option><option value="Prabayar" ${preferences.tier === 'Prabayar' ? 'selected' : ''}>Prabayar</option></select></label><div class="event-ai-actions"><button class="button button-primary" type="submit">${icon('auto_awesome')} Cari kecocokan</button>${preferences.active ? '<button class="button button-quiet button-small" type="button" data-action="reset-event-search">Hapus filter</button>' : ''}</div></form><div class="event-ai-prompts"><span class="muted small">Tema cepat</span>${['Anime', 'Genshin', 'Game', 'Kimono'].map((theme) => `<button class="chip-button" type="button" data-event-prompt="${theme}">${theme}</button>`).join('')}</div><p class="muted small event-ai-note">Hasil dicocokkan dari tema event, lokasi, dan koleksi kostum demo; bukan layanan AI eksternal.</p></section><div class="section-heading"><div><span class="eyebrow">Kalender komunitas</span><h2>${preferences.active ? 'Rekomendasi untukmu' : 'Event mendatang'}</h2></div><span class="muted small">${recommendations.length} event ${preferences.active ? 'cocok' : 'aktif'}</span></div><div class="stack">${recommendations.map(({ event, match }) => eventCard(event, false, match)).join('') || '<div class="empty-state">Belum ada event yang cocok. Coba tema atau kota lain.</div>'}</div></div>`;
};

const eventDetailPage = () => {
    const event = state.events.find((item) => item.id === state.param) || state.events[0];
    if (!event) return eventsPage();
    const keywords = String(event.theme || event.title).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);
    const matches = state.inventory.map((product) => ({ product, score: product.themes.filter((themeWord) => keywords.some((keyword) => keyword.includes(themeWord) || themeWord.includes(keyword))).length })).sort((a, b) => b.score - a.score).slice(0, 3);
    return `<div class="container page-wrap"><div class="breadcrumb"><button class="text-button" data-go="events">Event komunitas</button><span>/</span><span>${escapeHtml(event.title)}</span></div><div class="detail-layout"><img class="detail-main-image" src="${escapeHtml(event.image)}" alt="Poster ${escapeHtml(event.title)}"><div class="detail-content"><span class="eyebrow">${escapeHtml(event.tier)}${event.featured ? ' · Unggulan' : ''}</span><h1>${escapeHtml(event.title)}</h1><p class="detail-blurb">${escapeHtml(event.description)}</p><div class="spec-row"><span class="spec-chip">${icon('calendar_month')} ${escapeHtml(event.date)}</span><span class="spec-chip">${icon('location_on')} ${escapeHtml(event.location)}</span></div><div class="notice">${icon('auto_awesome')} Rekomendasi kostum dicocokkan dengan tema: <strong>${escapeHtml(event.theme || event.category)}</strong>.</div><div style="margin-top:22px"><button class="button button-primary" data-go="catalog" data-query="${escapeHtml(keywords[0] || '')}" type="button">Lihat semua kostum</button></div></div></div><div class="section-heading"><div><span class="eyebrow">Smart pairing</span><h2>Kostum untuk event ini</h2></div></div><div class="product-grid">${matches.map(({ product }) => productCard(product)).join('')}</div></div>`;
};

const organizerPage = () => {
    const mine = mySubmissionIds();
    const pending = state.events.filter((event) => mine.includes(String(event.id)) && event.status !== 'Disetujui');
    return `<div class="container page-wrap"><section class="organizer-hero"><div><span class="eyebrow" style="color:#ffb8d2">Portal komunitas & organizer</span><h1>Acara seru dimulai dari ditemukan.</h1><p>Pasang event, jangkau penyewa yang tepat, dan hubungkan pengunjung dengan kostum pilihan.</p><button class="button button-primary" data-action="scroll-submit" type="button">Pasang iklan event ${icon('arrow_forward')}</button></div><div class="organizer-hero-art" role="img" aria-label="Festival komunitas"></div></section><div class="organizer-grid"><section class="panel" id="organizer-submit"><h2>Pasang iklan event</h2><form id="organizer-form" class="stack"><div class="field"><label for="event-poster">Poster event *</label><input class="input" id="event-poster" type="file" name="poster" accept="image/*" required><div class="poster-preview" id="poster-preview">${icon('add_photo_alternate')}<span class="small">Pratinjau poster muncul di sini</span></div></div><div class="field"><label for="event-title">Nama event *</label><input class="input" id="event-title" name="title" required placeholder="Contoh: Jakarta Anime Gathering"></div><div class="form-grid"><div class="field"><label for="event-date">Tanggal *</label><input class="input" id="event-date" name="date" type="date" required></div><div class="field"><label for="event-location">Lokasi *</label><input class="input" id="event-location" name="location" required placeholder="Venue, kota"></div></div><div class="field"><label for="event-theme">Tema / fandom *</label><input class="input" id="event-theme" name="theme" required placeholder="Anime, fantasy, game, kimono..."></div><fieldset class="field" style="border:0;padding:0;margin:0"><legend class="field-label">Pilih tier promosi *</legend><div class="tier-options"><label class="tier-card"><input type="radio" name="tier" value="Gratis" checked><strong>Gratis</strong><small>Untuk event lokal dan komunitas non-profit.</small></label><label class="tier-card"><input type="radio" name="tier" value="Prabayar"><strong>Prabayar · Featured</strong><small>Diprioritaskan di slot unggulan. Biaya demo Rp250.000.</small></label></div></fieldset><div class="notice">${icon('info')} Simulasi AI OCR akan menampilkan hasil ekstraksi berdasarkan data yang kamu isi. Poster dikirim ke admin untuk ditinjau.</div><button class="button button-primary" type="submit">Kirim untuk ditinjau ${icon('arrow_forward')}</button></form></section><div class="stack"><section class="panel"><h2>Simulasi AI OCR & parser</h2><p class="muted small">Informasi event dicocokkan dengan input untuk menampilkan preview hasil ekstraksi.</p><div class="ai-result" id="ai-result"><div><small>Nama event</small><strong>Menunggu input</strong></div><div><small>Tanggal</small><strong>Menunggu input</strong></div><div><small>Lokasi</small><strong>Menunggu input</strong></div><div><small>Tema terdeteksi</small><strong>Menunggu input</strong></div></div><div class="section-heading" style="margin:20px 0 12px"><div><span class="eyebrow">Smart pairing</span><h2 style="font-size:1rem">Kostum terkait</h2></div></div><div id="organizer-matches" class="stack"><p class="muted small">Isi tema event untuk melihat pasangan kostum.</p></div></section><section class="panel"><h2>Status pengajuanmu</h2>${pending.length ? pending.map((event) => `<div class="admin-item"><img src="${escapeHtml(event.image)}" alt="Poster"><div class="admin-item-main"><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.date)} · ${escapeHtml(event.status)}</small></div><span class="status-pill ${event.status === 'Ditolak' ? 'danger' : ''}">${escapeHtml(event.status)}</span></div>`).join('') : '<p class="muted small">Belum ada pengajuan dari perangkat ini.</p>'}</section></div></div></div>`;
};

const adminMenu = [['overview', 'Dashboard Admin', 'dashboard'], ['inventory', 'Kelola Katalog', 'checkroom'], ['orders', 'Verifikasi Pesanan Masuk', 'fact_check'], ['events', 'Kurasi Iklan Event', 'campaign'], ['qr', 'Generator QR Code Event', 'qr_code_2']];
const adminShell = (content) => `<div class="admin-shell"><aside class="admin-sidebar"><div class="admin-label">Manajemen rental</div><nav class="admin-nav">${adminMenu.map(([section, label, symbol]) => `<a href="#admin/${section}" data-admin-section="${section}" class="${state.adminSection === section ? 'active' : ''}">${icon(symbol)} ${label}</a>`).join('')}<a href="#home" data-go="home">${icon('storefront')} Lihat toko</a></nav><div class="notice" style="margin:25px 3px 0">Perubahan katalog, pesanan, dan event tersimpan langsung ke database.</div></aside><section class="admin-content">${content}</section></div>`;

const adminOverview = () => {
    const pending = state.orders.filter((order) => order.stage < 3).length;
    const active = state.orders.filter((order) => order.stage >= 3 && order.stage < 7).length;
    const revenue = state.orders.reduce((sum, order) => sum + Number(order.dp || 0), 0);
    const adRevenue = state.events.filter((event) => event.tier === 'Prabayar' && event.status === 'Disetujui').length * 250000;
    const featuredCount = state.events.filter((event) => event.featured && event.status === 'Disetujui').length;
    return `<div class="admin-content-header"><div><span class="eyebrow">Ringkasan toko</span><h1>Selamat datang, Admin</h1></div><button class="button button-primary" data-action="add-product" type="button">${icon('add')} Tambah kostum</button></div><div class="stat-grid">${[['checkroom', 'Rental aktif', active, `${state.orders.length} pesanan total`], ['pending_actions', 'Verifikasi menunggu', pending, pending ? 'Perlu ditinjau' : 'Semua sudah diproses'], ['campaign', 'Pendapatan iklan event', money(adRevenue), `${featuredCount} iklan unggulan tayang`], ['payments', 'DP & pembayaran masuk', money(revenue), 'Dari pesanan penyewa']].map(([symbol, label, value, change]) => `<article class="stat-card"><div class="stat-card-top"><span>${label}</span><span class="stat-icon">${icon(symbol)}</span></div><strong>${value}</strong><span class="stat-change">${change}</span></article>`).join('')}</div><div class="admin-two-col"><section class="panel"><div class="admin-content-header" style="margin-bottom:10px"><h2>Pesanan terbaru</h2><button class="text-button" data-admin-section="orders">Semua pesanan</button></div>${state.orders.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Penyewa</th><th>Kostum</th><th>Status</th></tr></thead><tbody>${state.orders.slice(-5).reverse().map((order) => `<tr><td>${escapeHtml(order.customerName)}</td><td>${escapeHtml(orderProduct(order).name)}</td><td><span class="status-pill">${escapeHtml(orderStages[order.stage])}</span></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Pesanan terbaru akan muncul di sini.</p>'}</section><section class="panel"><div class="admin-content-header" style="margin-bottom:10px"><h2>Perlu perhatian</h2></div><div class="admin-list"><div class="admin-item"><span class="stat-icon">${icon('fact_check')}</span><div class="admin-item-main"><strong>${pending} verifikasi pesanan</strong><small>Periksa data penyewa dan bukti DP</small></div></div><div class="admin-item"><span class="stat-icon">${icon('campaign')}</span><div class="admin-item-main"><strong>${state.events.filter((event) => event.status === 'Menunggu review').length} iklan event menunggu</strong><small>Tinjau poster dan hasil simulasi OCR</small></div></div></div></section></div><section class="panel" style="margin-top:16px"><div class="admin-content-header" style="margin-bottom:10px"><h2>Ringkasan stok kostum</h2><button class="text-button" data-admin-section="inventory">Kelola katalog</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Kostum</th><th>Kategori</th><th>Stok</th><th>Harga / hari</th><th>Status</th></tr></thead><tbody>${state.inventory.slice(0, 5).map((product) => `<tr><td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.category)}</td><td>${product.stock}</td><td>${money(product.price)}</td><td>${product.stock ? 'Tersedia' : 'Disewa'}</td></tr>`).join('')}</tbody></table></div></section>`;
};

const adminInventory = () => `<div class="admin-content-header"><div><span class="eyebrow">Produk & ketersediaan</span><h1>Manajemen katalog</h1></div><button class="button button-primary" data-action="add-product">${icon('add')} Tambah kostum</button></div><section class="panel"><div class="admin-toolbar"><span class="muted small">${state.inventory.length} item di katalog</span><input class="input" data-admin-search placeholder="Cari nama kostum" aria-label="Cari kostum"></div><div class="inventory-row inventory-header"><span></span><span>Kostum</span><span>Harga / hari</span><span>Stok</span><span>Deposit</span><span>Aksi</span></div>${state.inventory.map((product) => `<div class="inventory-row" data-inventory-row="${escapeHtml(product.name.toLowerCase())}"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)} · ${escapeHtml(product.series)}</small></span><span>${money(product.price)}</span><span>${product.stock}</span><span>${money(product.deposit)}</span><span><button class="button button-secondary button-small" data-action="edit-product" data-id="${escapeHtml(product.id)}">Edit</button><button class="button button-danger button-small" data-action="delete-product" data-id="${escapeHtml(product.id)}" aria-label="Hapus ${escapeHtml(product.name)}">${icon('delete')}</button></span></div>`).join('')}</section>`;

const adminOrders = () => `<div class="admin-content-header"><div><span class="eyebrow">Verifikasi penyewa & pembayaran</span><h1>Verifikasi pesanan</h1></div><span class="status-pill">${state.orders.filter((order) => order.stage < 3).length} menunggu</span></div>${state.orders.length ? state.orders.map((order) => { const product = orderProduct(order); const aiValid = Boolean(order.idSelfieImage && order.paymentProofImage); return `<article class="order-admin-card"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(order.customerName)} · ${escapeHtml(order.id)}</h3><p class="muted small">${escapeHtml(product.name)} · ${order.size} · ${order.days} hari</p><p class="small">${escapeHtml(order.socialPlatform || '')} ${escapeHtml(order.socialHandle || '')} · Penjamin: ${escapeHtml(order.guarantor || '-')}</p><span class="status-pill">${escapeHtml(orderStages[order.stage])}</span><p class="small">DP ${money(order.dp)} · Bukti: ${escapeHtml(order.paymentProofName || 'unggahan demo')}</p><span class="status-pill ${aiValid ? 'success' : 'danger'}">${icon(aiValid ? 'verified_user' : 'warning')} AI ${aiValid ? 'Dokumen & bukti valid' : 'Perlu pemeriksaan manual'}</span></div><div class="order-admin-actions"><button class="button button-secondary button-small" data-action="inspect-order" data-id="${escapeHtml(order.id)}">Detail penyewa</button><button class="button button-primary button-small" data-action="advance-order" data-id="${escapeHtml(order.id)}">${order.stage < 2 ? 'Setujui verifikasi' : order.stage < 7 ? 'Tahap berikutnya' : 'Selesai'}</button><button class="button button-danger button-small" data-action="reject-order" data-id="${escapeHtml(order.id)}">Tolak</button></div></article>`; }).join('') : '<div class="empty-state">Belum ada pesanan penyewa.</div>'}`;

const adminShipping = () => `<div class="admin-content-header"><div><span class="eyebrow">Fulfillment</span><h1>Pengiriman & retur</h1></div></div>${state.orders.length ? state.orders.map((order) => { const product = orderProduct(order); return `<article class="order-admin-card"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(order.id)} · ${escapeHtml(order.customerName)}</h3><p class="muted small">${escapeHtml(product.name)} · Jadwal sewa: ${escapeHtml(order.rentalDate || 'Belum diatur')}</p><span class="status-pill ${order.stage >= 5 ? 'success' : ''}">${escapeHtml(orderStages[order.stage])}</span><p class="small">${order.trackingNumber ? `JNE Express · Resi ${escapeHtml(order.trackingNumber)}` : 'Nomor resi belum ditambahkan'}</p></div><div class="order-admin-actions"><button class="button button-secondary button-small" data-action="shipping-order" data-id="${escapeHtml(order.id)}">${order.trackingNumber ? 'Ubah resi' : 'Tambah resi'}</button><button class="button button-primary button-small" data-action="advance-order" data-id="${escapeHtml(order.id)}">${order.stage < 7 ? 'Update status' : 'Selesai'}</button><button class="button button-soft button-small" data-action="refund-deposit" data-id="${escapeHtml(order.id)}">Refund deposit</button></div></article>`; }).join('') : '<div class="empty-state">Belum ada pesanan untuk diproses.</div>'}`;

const adminEvents = () => {
    const submissions = state.events;
    return `<div class="admin-content-header"><div><span class="eyebrow">Kurasi promosi komunitas</span><h1>Manajemen iklan event</h1></div><button class="button button-secondary" data-go="organizer">Lihat portal organizer</button></div>${submissions.length ? submissions.map((event) => {
        const matches = matchingProducts(`${event.theme} ${event.title}`);
        return `<article class="order-admin-card"><img src="${escapeHtml(event.image)}" alt="Poster ${escapeHtml(event.title)}"><div><h3>${escapeHtml(event.title)}</h3><p class="muted small">${escapeHtml(event.date)} · ${escapeHtml(event.location)}</p><p class="small">Simulasi OCR · Tema: ${escapeHtml(event.theme)} · Tier ${escapeHtml(event.tier)}</p><span class="status-pill ${event.status === 'Disetujui' ? 'success' : event.status === 'Ditolak' ? 'danger' : ''}">${escapeHtml(event.status)}</span><div class="ai-pairing-preview"><strong>${icon('auto_awesome')} Rekomendasi kostum sebelum tayang</strong><span>${matches.map((product) => escapeHtml(product.name)).join(' · ') || 'Belum ada kostum yang cocok'}</span></div>${event.paymentProofImage ? `<button class="text-button small" type="button" data-action="view-proof" data-id="${escapeHtml(event.id)}">Lihat bukti bayar · ${escapeHtml(event.paymentProofName || 'unggahan')}</button>` : ''}</div><div class="order-admin-actions">${event.status === 'Menunggu review' ? `<button class="button button-primary button-small" data-action="approve-event" data-id="${escapeHtml(event.id)}">ACC & Tayangkan</button><button class="button button-danger button-small" data-action="reject-event" data-id="${escapeHtml(event.id)}">Tolak</button>` : `<button class="button button-secondary button-small" data-action="event-pairing" data-id="${escapeHtml(event.id)}">Lihat pairing AI</button><button class="button button-danger button-small" data-action="delete-event" data-id="${escapeHtml(event.id)}" aria-label="Hapus ${escapeHtml(event.title)}">${icon('delete')}</button>`}</div></article>`;
    }).join('') : '<div class="empty-state">Belum ada pengajuan iklan event.</div>'}`;
};

const adminQrCodes = () => `<div class="admin-content-header"><div><span class="eyebrow">Akses organizer tanpa akun</span><h1>Generator QR iklan event</h1></div></div><p class="muted">Bagikan QR sesuai paket promosi. Organizer akan langsung masuk ke formulir yang sesuai.</p><div class="qr-grid"><section class="panel qr-card"><span class="status-pill success">Komunitas lokal</span><h2>QR Iklan Gratis</h2><p class="muted small">Form poster, nama event, tanggal, lokasi, dan tema.</p><canvas id="qr-free" aria-label="Kode QR iklan gratis"></canvas><p class="small qr-url" id="qr-free-url"></p><a class="button button-primary" id="qr-free-download" download="letscosplay-iklan-gratis.png">${icon('download')} Unduh QR gratis</a></section><section class="panel qr-card"><span class="status-pill">Featured promotion</span><h2>QR Iklan Prabayar</h2><p class="muted small">Termasuk unggah bukti pembayaran promosi.</p><canvas id="qr-paid" aria-label="Kode QR iklan prabayar"></canvas><p class="small qr-url" id="qr-paid-url"></p><a class="button button-primary" id="qr-paid-download" download="letscosplay-iklan-prabayar.png">${icon('download')} Unduh QR prabayar</a></section></div>`;

const renderAdminQRCodes = async () => {
    const base = `${location.origin}${location.pathname}`;
    const codes = [
        { tier: 'free', canvas: '#qr-free', link: '#qr-free-download', label: '#qr-free-url', color: '#239b68' },
        { tier: 'paid', canvas: '#qr-paid', link: '#qr-paid-download', label: '#qr-paid-url', color: '#f45193' },
    ];
    for (const code of codes) {
        const url = `${base}#organizer/${code.tier}`;
        const canvas = app.querySelector(code.canvas);
        const download = app.querySelector(code.link);
        if (!canvas || !download) continue;
        await QRCode.toCanvas(canvas, url, { width: 190, margin: 2, color: { dark: code.color, light: '#ffffff' } });
        download.href = await QRCode.toDataURL(url, { width: 500, margin: 2, color: { dark: code.color, light: '#ffffff' } });
        app.querySelector(code.label).textContent = url;
    }
};

const adminPage = () => {
    if (state.session?.role !== 'admin') return accountAuthPage(false, true);
    const content = ({ overview: adminOverview, inventory: adminInventory, orders: adminOrders, shipping: adminShipping, events: adminEvents, qr: adminQrCodes }[state.adminSection] || adminOverview)();
    return adminShell(content);
};

const chatSuggestions = ['Gimana cara sewa?', 'Ada kostum ukuran M?', 'Berapa deposit & DP-nya?', 'Event cosplay terdekat'];

// Format aman: escape dulu, lalu dukung **tebal**, daftar "- item", dan baris baru.
const formatChat = (text) => {
    const lines = escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').split('\n');
    let html = '';
    let inList = false;
    for (const raw of lines) {
        const item = raw.match(/^\s*(?:[-•*])\s+(.*)$/);
        if (item) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${item[1]}</li>`; continue; }
        if (inList) { html += '</ul>'; inList = false; }
        if (raw.trim()) html += `<p>${raw}</p>`;
    }
    return html + (inList ? '</ul>' : '');
};

const chatMessagesMarkup = () => {
    const greeting = state.session?.name ? `Halo ${escapeHtml(state.session.name.split(' ')[0])}! ` : 'Halo! ';
    const intro = `<div class="chat-message bot"><p>${greeting}Aku asisten Let'sCosplay. Tanya apa saja soal kostum, stok &amp; ukuran, aturan sewa, atau event cosplay ya.</p></div>`;
    const list = state.chatMessages.map((message) => `<div class="chat-message ${message.role}">${message.role === 'bot' ? formatChat(message.text) : `<p>${escapeHtml(message.text)}</p>`}</div>`).join('');
    const chips = state.chatMessages.length ? '' : `<div class="chat-suggestions">${chatSuggestions.map((text) => `<button type="button" class="chip-button" data-chat-suggest="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join('')}</div>`;
    const typing = state.chatLoading ? '<div class="chat-message bot chat-typing" aria-label="Asisten sedang mengetik"><span></span><span></span><span></span></div>' : '';
    return intro + list + chips + typing;
};

const chatWidget = () => `<section class="chat-widget ${state.chatOpen ? 'chat-open' : ''}" aria-label="Asisten AI Let'sCosplay"><div class="chat-panel" ${state.chatOpen ? '' : 'hidden'}><header><div><strong>Asisten Let'sCosplay</strong><small>Kostum, aturan sewa, dan event</small></div><div><button class="icon-button" type="button" data-action="chat-reset" title="Mulai obrolan baru" aria-label="Mulai obrolan baru">${icon('refresh')}</button><button class="icon-button" type="button" data-action="chat-close" aria-label="Tutup chatbot">${icon('close')}</button></div></header><div class="chat-messages" id="chat-messages" aria-live="polite">${chatMessagesMarkup()}</div><form id="chat-form" autocomplete="off"><input class="input" name="message" placeholder="Tulis pertanyaan..." aria-label="Pertanyaan untuk chatbot" maxlength="500" required ${state.chatLoading ? 'disabled' : ''}><button class="button button-primary" type="submit" aria-label="Kirim pertanyaan" ${state.chatLoading ? 'disabled' : ''}>${icon('send')}</button></form></div><button class="chat-launcher" type="button" data-action="chat-toggle" aria-label="Buka Asisten AI">${icon(state.chatOpen ? 'close' : 'smart_toy')}<span>${state.chatOpen ? 'Tutup' : 'Tanya AI'}</span></button></section>`;

const focusChat = () => requestAnimationFrame(() => {
    const box = document.querySelector('#chat-messages');
    if (box) box.scrollTop = box.scrollHeight;
    const input = document.querySelector('#chat-form input[name="message"]');
    if (input && !input.disabled) input.focus();
});

// Perbarui hanya isi chat (bukan seluruh halaman) agar ketikan & fokus tidak hilang.
const refreshChat = () => {
    const box = document.querySelector('#chat-messages');
    if (box) box.innerHTML = chatMessagesMarkup();
    const form = document.querySelector('#chat-form');
    form?.querySelectorAll('input, button').forEach((el) => { el.disabled = state.chatLoading; });
    focusChat();
};

const chatSessionId = () => {
    try {
        let id = sessionStorage.getItem(STORAGE_KEYS.chatSession);
        if (!id) { id = (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2)).slice(0, 60); sessionStorage.setItem(STORAGE_KEYS.chatSession, id); }
        return id;
    } catch { return 'anon'; }
};

const sendChat = async (rawQuestion) => {
    const question = String(rawQuestion || '').trim();
    if (!question || state.chatLoading) return;
    const requestId = ++state.chatRequestId;
    const history = state.chatMessages.slice(-10).map((message) => ({ role: message.role, text: message.text }));
    state.chatMessages.push({ role: 'user', text: question });
    state.chatLoading = true;
    if (!state.chatOpen) { state.chatOpen = true; render(); } else refreshChat();
    const input = document.querySelector('#chat-form input[name="message"]');
    if (input) input.value = '';

    let reply;
    try {
        const data = await api('/chat', { method: 'POST', body: { message: question, history, sessionId: chatSessionId() } });
        reply = String(data.reply || '').trim();
        if (!reply) throw new Error('Balasan kosong');
    } catch (error) {
        console.warn(`Chatbot AI tidak tersedia (${error.message}); memakai jawaban lokal.`);
        reply = answerChatQuestion(question);
    }
    if (requestId !== state.chatRequestId) return; // obrolan di-reset saat menunggu
    state.chatMessages.push({ role: 'bot', text: reply });
    state.chatLoading = false;
    refreshChat();
};

const render = () => {
    if (state.session?.role === 'admin' && state.page !== 'admin') {
        state.page = 'admin';
        state.param = state.adminSection;
        history.replaceState({ page: 'admin', param: state.adminSection }, '', `#admin/${state.adminSection}`);
    } else if (state.session?.role === 'customer' && state.page === 'admin') {
        state.page = 'home';
        state.param = null;
        history.replaceState({ page: 'home' }, '', '#home');
    } else if (['checkout', 'orders', 'tracking'].includes(state.page) && state.session?.role !== 'customer') {
        state.page = 'login';
        state.param = null;
        history.replaceState({ page: 'login' }, '', '#login');
    }
    const pages = {
        home: homePage, catalog: catalogPage, detail: detailPage, rules: rulesPage, howto: howToPage,
        checkout: checkoutPage, orders: ordersPage, tracking: trackingPage,
        login: () => accountAuthPage(false), register: () => accountAuthPage(true),
        events: eventsPage, event: eventDetailPage, organizer: organizerPage, admin: adminPage,
    };
    document.title = `Let'sCosplay — ${({ home: 'Rental Kostum Cosplay', catalog: 'Katalog Kostum', detail: 'Detail Kostum', rules: 'Rules Rental', howto: 'Cara Sewa', checkout: 'Checkout', orders: 'Pesanan Saya', tracking: 'Lacak Pesanan', login: 'Masuk', register: 'Daftar', events: 'Event Komunitas', event: 'Detail Event', organizer: 'Portal Organizer', admin: 'Dashboard Admin' }[state.page] || 'Rental Kostum')}`;
    const pageView = localizeCopy((pages[state.page] || homePage)().replaceAll('pattern="[0-9+() -]{9,18}"', ''));
    app.innerHTML = `${topHeader()}<main>${pageView}</main>${state.session?.role === 'admin' ? '' : localizeCopy(footer())}${state.modal || ''}${chatWidget()}`;
    if (state.page === 'detail') app.querySelector('.detail-main-image')?.insertAdjacentHTML('afterend', photoCreditMarkup(productById(state.param || state.productId)));
    if (state.page === 'organizer') configureOrganizerForm();
    if (state.page === 'admin' && state.adminSection === 'qr') renderAdminQRCodes().catch(() => showToast('Kode QR tidak dapat dibuat. Coba muat ulang halaman.'));
    if (state.page === 'checkout') {
        app.querySelector('.checkout-sections > .form-section:nth-child(3)')?.insertAdjacentHTML('beforebegin', checkoutAssistant());
        updateAIAssistant();
    }
    if (state.page === 'catalog') {
        const cards = [...app.querySelectorAll('.product-card')];
        const pageCount = Math.max(1, Math.ceil(cards.length / 6));
        state.catalogPage = Math.min(state.catalogPage, pageCount);
        cards.forEach((card, index) => { card.hidden = index < (state.catalogPage - 1) * 6 || index >= state.catalogPage * 6; });
        const count = app.querySelector('.catalog-toolbar .muted.small');
        if (count) count.textContent = `${cards.length} kostum ditemukan`;
        const pagination = app.querySelector('.pagination');
        if (pagination) pagination.innerHTML = `<button data-page="${Math.max(1, state.catalogPage - 1)}" aria-label="Halaman sebelumnya" ${state.catalogPage === 1 ? 'disabled' : ''}>‹</button>${Array.from({ length: pageCount }, (_, index) => `<button data-page="${index + 1}" class="${state.catalogPage === index + 1 ? 'active' : ''}" aria-label="Halaman ${index + 1}">${index + 1}</button>`).join('')}<button data-page="${Math.min(pageCount, state.catalogPage + 1)}" aria-label="Halaman berikutnya" ${state.catalogPage === pageCount ? 'disabled' : ''}>›</button>`;
    }
    document.documentElement.dataset.theme = theme();
};


const checkoutTotals = () => {
    const product = { ...productById(state.productId) };
    product.deposit = depositForProduct(product);
    const addons = state.addons.reduce((total, addon) => total + (addon === 'wig' ? 35000 : 15000), 0);
    return { product, total: (product.price + addons) * state.days + 18000 + product.deposit };
};

const checkoutAssistant = () => `<section class="form-section ai-checkout-panel"><h2><span class="section-index">AI</span> Asisten pintar pemesanan</h2><div class="form-grid"><div class="field"><label for="fit-height">Tinggi badan (cm) · opsional</label><input class="input" id="fit-height" type="number" min="100" max="230" placeholder="Contoh: 165"></div><div class="field"><label for="fit-weight">Berat badan (kg) · opsional</label><input class="input" id="fit-weight" type="number" min="25" max="250" placeholder="Contoh: 58"></div><div class="field span-2"><label for="fit-notes">Catatan kecocokan kostum</label><input class="input" id="fit-notes" placeholder="Contoh: ingin lebih longgar di bagian bahu"></div></div><div class="ai-result" style="margin-top:14px"><div><small>Rekomendasi ukuran AI</small><strong id="ai-fit-recommendation">Lengkapi ukuran badan untuk rekomendasi.</strong></div><div><small>Skor kepercayaan demo</small><strong id="ai-risk-score">Skor awal: 55/100</strong></div></div><div id="ai-deposit-advice" class="notice" style="margin-top:12px">Deposit standar berlaku sampai riwayat rental diverifikasi.</div><div id="ai-document-scan" class="deposit-note" style="margin-top:12px">${icon('document_scanner')} Verifikasi dokumen mengikuti foto identitas di akunmu.</div><p class="muted small" style="margin-bottom:0">Pemindaian wajah, kejelasan dokumen, dan skor risiko di sini adalah simulasi lokal, bukan verifikasi identitas nyata.</p></section>`;

const updateCheckoutSummary = () => {
    const { product, total } = checkoutTotals();
    const addonTotal = state.addons.reduce((sum, addon) => sum + (addon === 'wig' ? 35000 : 15000), 0);
    const subtotal = (product.price + addonTotal) * state.days;
    const minimumDp = Math.ceil(total * 0.5);
    for (const row of app.querySelectorAll('.price-line')) {
        const label = row.querySelector('span')?.textContent?.trim();
        const amount = row.querySelector('strong');
        if (!amount) continue;
        if (label === 'Deposit refundable' || label === 'Deposit') amount.textContent = money(product.deposit);
        if (label === 'Total estimasi' || label === 'Total') amount.textContent = money(total);
        if (label === 'Subtotal sewa dan aksesori') amount.textContent = money(subtotal);
    }
    const paymentAmount = app.querySelector('#payment-amount');
    if (paymentAmount) {
        paymentAmount.min = String(minimumDp);
        paymentAmount.max = String(total);
        if (Number(paymentAmount.value) < minimumDp) paymentAmount.value = String(minimumDp);
        const note = paymentAmount.nextElementSibling;
        if (note) note.textContent = `Minimal ${money(minimumDp)} · maksimal ${money(total)}`;
    }
    const notice = app.querySelector('#checkout-form .checkout-sections > .form-section:nth-child(4) .notice');
    if (notice) notice.innerHTML = `Minimum DP 50%: <strong>${money(minimumDp)}</strong>. Sisa <strong>${money(total - minimumDp)}</strong> dibayarkan paling lambat H-1 sebelum pengiriman.`;
};

const updateAIAssistant = () => {
    if (state.page !== 'checkout') return;
    const height = Number(app.querySelector('#fit-height')?.value || 0);
    const weight = Number(app.querySelector('#fit-weight')?.value || 0);
    const note = String(app.querySelector('#fit-notes')?.value || '').toLowerCase();
    let recommended = height >= 183 ? 'XL' : height >= 172 ? 'L' : height >= 160 ? 'M' : height > 0 ? 'S' : state.size;
    if (weight >= 85 && recommended !== 'XL') recommended = recommended === 'S' ? 'M' : recommended === 'M' ? 'L' : 'XL';
    if (/longgar|oversize|lebih besar/.test(note)) recommended = recommended === 'S' ? 'M' : recommended === 'M' ? 'L' : 'XL';
    const fit = app.querySelector('#ai-fit-recommendation');
    if (fit) fit.textContent = height || weight ? `Disarankan ${recommended} · pilihan saat ini ${state.size}` : `Pilihan saat ini ${state.size} · isi tinggi/berat untuk saran AI`;

    state.trustScore = state.session?.trustScore ?? 55;
    const risk = app.querySelector('#ai-risk-score');
    if (risk) risk.textContent = `Skor kepercayaan: ${state.trustScore}/100`;
    const advice = app.querySelector('#ai-deposit-advice');
    if (advice) advice.textContent = state.trustScore >= 85 ? `Riwayat terindikasi baik. Deposit demo diringankan 50% menjadi ${money(depositForProduct(productById(state.productId)))}.` : 'Deposit 50% wajib digunakan pada pesanan ini sampai riwayat rental terverifikasi.';

    const file = app.querySelector('#id-selfie')?.files?.[0];
    const scanner = app.querySelector('#ai-document-scan');
    if (scanner && !file && state.session?.hasIdSelfie) {
        scanner.className = 'deposit-note';
        scanner.innerHTML = `${icon('verified_user')} Foto identitas dari akunmu sudah tersimpan dan akan diperiksa admin.`;
    }
    if (scanner && file) {
        const valid = file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024;
        scanner.className = valid ? 'deposit-note' : 'notice';
        scanner.innerHTML = valid ? `${icon('verified_user')} Verifikasi AI: Dokumen Valid & Sesuai · kecocokan wajah demo 96% · kejelasan ${file.size > 20000 ? 'baik' : 'cukup'}.` : 'Foto harus berupa gambar dan berukuran maksimal 5 MB.';
    }
    updateCheckoutSummary();
};

const configureOrganizerForm = () => {
    const form = app.querySelector('#organizer-form');
    if (!form) return;
    const requestedTier = state.param === 'free' ? 'Gratis' : state.param === 'paid' ? 'Prabayar' : null;
    const tierFieldset = form.querySelector('fieldset');
    const proofMarkup = `<div class="field" id="event-payment-proof-wrap" hidden><label for="event-payment-proof">Bukti pembayaran paket promosi *</label><input class="input" id="event-payment-proof" type="file" name="paymentProof" accept="image/*"><small class="muted">Wajib untuk QR prabayar. JPG/PNG, bukti dikirim ke admin untuk verifikasi.</small></div>`;
    tierFieldset?.insertAdjacentHTML('afterend', proofMarkup);
    form.querySelector('button[type="submit"]')?.insertAdjacentHTML('beforebegin', `<label class="checkline"><input type="checkbox" name="promotionTerms" required> <span id="promotion-terms-copy"></span></label>`);
    if (requestedTier) {
        if (tierFieldset) { tierFieldset.hidden = true; tierFieldset.disabled = true; }
        form.insertAdjacentHTML('beforeend', `<input type="hidden" name="tier" value="${requestedTier}"><div class="notice">Formulir dibuka dari QR iklan ${requestedTier.toLowerCase()}.</div>`);
    }
    const updatePaymentProof = () => {
        const tier = requestedTier || form.querySelector('[name="tier"]:checked')?.value || 'Gratis';
        const wrapper = form.querySelector('#event-payment-proof-wrap');
        const input = form.querySelector('#event-payment-proof');
        form.querySelector('#promotion-terms-copy').textContent = tier === 'Prabayar'
            ? 'Saya memahami biaya promosi demo Rp250.000 per pengajuan, wajib mengunggah bukti transfer, dan event hanya tayang setelah disetujui admin.'
            : 'Saya menyatakan event ini untuk komunitas lokal/non-komersial dan memahami event hanya tayang setelah disetujui admin.';
        wrapper.hidden = tier !== 'Prabayar';
        input.required = tier === 'Prabayar';
    };
    form.addEventListener('change', (event) => {
        if (event.target.matches('[name="tier"]')) updatePaymentProof();
    });
    updatePaymentProof();
};

const updateOrder = async (id, changes, successMessage) => {
    try {
        const { order: updated } = await api(`/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes });
        state.orders = state.orders.map((item) => (item.id === id ? updated : item));
        if ('stage' in changes) await loadCatalog(); // stok bisa kembali saat pesanan selesai
        render();
        if (successMessage) showToast(successMessage);
    } catch (error) {
        showToast(error.message || 'Gagal memperbarui pesanan.');
    }
};
const setOrderStage = (id, delta = 1, exact = null) => {
    const order = state.orders.find((item) => item.id === id);
    if (!order) return;
    const stage = exact === null ? Math.min(7, Math.max(0, order.stage + delta)) : exact;
    return updateOrder(id, { stage });
};

const matchingProducts = (text) => {
    const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);
    return state.inventory.map((product) => ({ product, score: (Array.isArray(product.themes) ? product.themes : []).filter((themeWord) => words.some((word) => word.includes(themeWord) || themeWord.includes(word))).length })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 2).map(({ product }) => product);
};

const answerChatQuestion = (question) => {
    const text = question.toLowerCase().trim();
    
    // 1. Deteksi Ukuran (XL, L, M, S, XS) - Didahulukan!
    const sizeMatch = text.match(/\b(xs|s|m|l|xl)\b/i);
    if (sizeMatch) {
        const matchedSize = sizeMatch[1].toUpperCase();
        const filteredBySize = state.inventory.filter((p) => {
            const sizes = Array.isArray(p.size) ? p.size : [p.size];
            return sizes.map(s => s.toUpperCase()).includes(matchedSize);
        });

        if (filteredBySize.length > 0) {
            return `Berikut pilihan kostum berukuran ${matchedSize}:\n` + 
                filteredBySize.map((p) => `• ${p.name} (${money(p.price)}/hari)`).join('\n');
        } else {
            return `Maaf, saat ini belum ada kostum yang tersedia untuk ukuran ${matchedSize}.`;
        }
    }

    // 2. Cara / Alur Sewa
    if (/(cara|langkah|gimana|bagaimana|alur|prosedur|pesan|order).*(sewa|rental|kostum)|(cara sewa)/.test(text)) {
        return 'Alur sewa kostum di Let\'sCosplay:\n' +
            '1. Pilih kostum & tanggal sewa di Katalog.\n' +
            '2. Lengkapi formulir data penyewa & unggah identitas.\n' +
            '3. Bayar DP minimal 50% untuk konfirmasi pesanan.\n' +
            '4. Kostum dikirim via JNE, tampil percaya diri, lalu kembalikan sesuai jadwal!';
    }

    // 3. Aturan & Syarat Rental
    if (/aturan|rule|rules|syarat|ketentuan|deposit|dp|denda|keterlambatan|perawatan/.test(text)) {
        return 'Aturan & Ketentuan Rental:\n' +
            '• Penyewa minimal berusia 17 tahun & memiliki KTP.\n' +
            '• DP minimal 50% untuk mengamankan pesanan.\n' +
            '• Deposit bersifat refundable & dikembalikan max 3 hari kerja setelah kostum dicek.\n' +
            '• Dilarang mencuci/menyetrika/mengubah kostum tanpa izin.';
    }

    // 4. Informasi Event
    if (/event|jadwal|acara|komunitas/.test(text)) {
        const events = state.events.filter((event) => event.status === 'Disetujui').slice(0, 3);
        return events.length 
            ? `Event mendatang: ${events.map((e) => `${e.title} (${e.date})`).join('; ')}.` 
            : 'Belum ada event komunitas yang tayang saat ini.';
    }

    // 5. Rekomendasi Simpel / Pemula
    if (/simple|simpel|pemula|mudah|murah|rekomendasi|saran/.test(text)) {
        const simpleCostumes = state.inventory.slice(0, 3);
        if (simpleCostumes.length > 0) {
            return `Rekomendasi kostum simpel untuk pemula:\n` +
                simpleCostumes.map((p) => `• ${p.name} (${money(p.price)}/hari)`).join('\n') +
                `\nCek menu Katalog Kostum untuk detail selengkapnya!`;
        }
    }

    // 6. Buang Kata Imbuhan & Partikel (kah, sih, dong, ada, yang, dll)
    const stopWords = ['apa', 'saj', 'saja', 'kah', 'tah', 'sih', 'dong', 'ya', 'gak', 'gak', 'ada', 'yang', 'kostum', 'berukuran', 'ukuran', 'stok', 'size', 'tolong', 'cari'];
    const cleanWords = text.split(' ').filter(word => !stopWords.includes(word));
    const cleanText = cleanWords.join(' ');

    if (cleanText.length > 1) {
        const matchedProducts = state.inventory.filter((product) => {
            const pName = product.name.toLowerCase();
            const pSeries = (product.series || '').toLowerCase();
            return cleanText.includes(pName) || pName.includes(cleanText) || (pSeries && cleanText.includes(pSeries));
        });

        if (matchedProducts.length > 0) {
            return matchedProducts.map((p) => 
                `📌 ${p.name}: ${p.stock > 0 ? `Tersedia (${p.stock} pcs), ukuran ${Array.isArray(p.size) ? p.size.join(', ') : p.size}` : 'Sedang disewa'} — ${money(p.price)}/hari.`
            ).join('\n');
        }
    }

    // 7. Stok Umum
    if (/stok|katalog|daftar|ada apa aja/.test(text)) {
        const available = state.inventory.filter(p => p.stock > 0).slice(0, 4);
        if (available.length) {
            return `Beberapa kostum yang siap disewa saat ini:\n` + 
                available.map(p => `• ${p.name} (${money(p.price)}/hari)`).join('\n') +
                '\nCek menu Katalog Kostum untuk pilihan lengkapnya!';
        }
    }

    return 'Saya Asisten Let\'sCosplay! Kamu bisa menanyakan cara sewa, aturan rental, stok ukuran tertentu (misal: "ukuran XL"), atau jadwal event.';
};

const openProductModal = (product = null) => {
    const editing = Boolean(product);
    const item = product || { name: '', series: '', category: 'Anime', price: 80000, deposit: 250000, stock: 1, size: ['S', 'M', 'L'], image: '', description: '' };
    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><div class="admin-content-header"><h2 id="product-modal-title">${editing ? 'Edit kostum' : 'Tambah kostum'}</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><form id="product-form" class="stack"><input type="hidden" name="id" value="${escapeHtml(item.id || '')}"><div class="field"><label>Nama kostum</label><input class="input" name="name" required value="${escapeHtml(item.name)}"></div><div class="form-grid"><div class="field"><label>Serial / fandom</label><input class="input" name="series" required value="${escapeHtml(item.series)}"></div><div class="field"><label>Kategori</label><select class="select" name="category">${categories.map((category) => `<option ${category.name === item.category ? 'selected' : ''}>${category.name}</option>`).join('')}</select></div><div class="field"><label>Harga sewa / hari</label><input class="input" name="price" type="number" min="1000" required value="${item.price}"></div><div class="field"><label>Deposit</label><input class="input" name="deposit" type="number" min="0" required value="${item.deposit}"></div><div class="field"><label>Jumlah stok</label><input class="input" name="stock" type="number" min="0" required value="${item.stock}"></div><div class="field"><label>Ukuran tersedia</label><input class="input" name="size" required value="${escapeHtml(Array.isArray(item.size) ? item.size.join(', ') : item.size)}" placeholder="S, M, L"></div></div><div class="field"><label for="product-image-file">Foto kostum</label><div class="image-upload"><img id="product-image-preview" class="image-upload-preview" src="${escapeHtml(item.image || '')}" alt="Pratinjau foto kostum" ${item.image ? '' : 'hidden'}><div class="stack" style="gap:8px"><input class="input" id="product-image-file" name="imageFile" type="file" accept="image/*"><input class="input" name="image" type="url" value="${escapeHtml(String(item.image || '').startsWith('data:') ? '' : (item.image || ''))}" placeholder="…atau tempel URL foto (https://...)"><small class="muted">${editing ? 'Kosongkan keduanya untuk mempertahankan foto saat ini.' : 'Unggah JPG/PNG, otomatis dikecilkan. Jika kosong, dipakai gambar placeholder.'}</small></div></div></div><div class="field"><label>Deskripsi</label><textarea class="textarea" name="description">${escapeHtml(item.description)}</textarea></div><button class="button button-primary" type="submit">${editing ? 'Simpan perubahan' : 'Tambah ke katalog'}</button></form></section></div>`;
    render();
};

app.addEventListener('click', (event) => {
    const scrollTo = event.target.closest('[data-scroll]');
    if (scrollTo) {
        event.preventDefault();
        const target = document.getElementById(scrollTo.dataset.scroll);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.querySelectorAll('.rules-nav a').forEach((link) => link.classList.toggle('active', link === scrollTo));
        }
        return;
    }

    const suggestion = event.target.closest('[data-chat-suggest]');
    if (suggestion) { sendChat(suggestion.dataset.chatSuggest); return; }

    const go = event.target.closest('[data-go]');
    if (go) {
        event.preventDefault();
        const target = go.dataset.go;
        if (target === 'admin' && state.session?.role !== 'admin') return navigate('admin');
        if (target === 'detail') state.productId = go.dataset.id;
        if (target === 'event') state.selectedEvent = go.dataset.id;
        if (target === 'catalog' && go.dataset.query) state.search = go.dataset.query;
        if (target === 'catalog' && !go.dataset.query) state.search = '';
        navigate(target, go.dataset.id || null);
        return;
    }

    const section = event.target.closest('[data-admin-section]');
    if (section) {
        event.preventDefault();
        state.adminSection = section.dataset.adminSection;
        state.page = 'admin';
        history.pushState({ page: 'admin' }, '', `#admin/${state.adminSection}`);
        render();
        return;
    }

    const action = event.target.closest('[data-action]');
    if (action) {
        const id = action.dataset.id;
        switch (action.dataset.action) {
            case 'theme': toggleTheme(); break;
            case 'logout':
                api('/logout', { method: 'POST' }).catch(() => {});
                clearSession();
                loadEvents().finally(() => { navigate('home'); showToast('Kamu sudah keluar dari akun.'); });
                break;
            case 'favorite': {
                const key = String(id);
                state.favorites = state.favorites.includes(key) ? state.favorites.filter((item) => item !== key) : [...state.favorites, key];
                writeStorage(STORAGE_KEYS.favorites, state.favorites);
                const on = state.favorites.includes(key);
                action.classList.toggle('is-favorite', on);
                action.setAttribute('aria-pressed', String(on));
                action.innerHTML = icon('favorite', on ? 'filled' : '');
                showToast(on ? 'Ditambahkan ke favorit.' : 'Dihapus dari favorit.');
                break;
            }
            case 'checkout': navigate('checkout'); break;
            case 'clear-search': state.search = ''; state.catalogPage = 1; render(); break;
            case 'reset-filters': state.category = ''; state.search = ''; state.maxPrice = null; state.sizeFilters = []; state.onlyAvailable = true; state.catalogPage = 1; render(); break;
            case 'mobile-filters': document.querySelector('#filter-panel')?.classList.toggle('collapsed'); break;
            case 'scroll-submit': document.querySelector('#organizer-submit')?.scrollIntoView({ behavior: 'smooth' }); break;
            case 'reset-event-search': state.eventSearch = { query: '', location: '', tier: '', active: false }; render(); break;
            case 'add-product': openProductModal(); break;
            case 'edit-product': openProductModal(productById(id)); break;
            case 'delete-product':
                if (confirm('Hapus kostum ini dari katalog?')) {
                    api(`/costumes/${encodeURIComponent(id)}`, { method: 'DELETE' })
                        .then(() => { state.inventory = state.inventory.filter((product) => String(product.id) !== String(id)); render(); showToast('Kostum dihapus dari katalog.'); })
                        .catch((error) => showToast(error.message));
                }
                break;
            case 'advance-order': setOrderStage(id); break;
            case 'reject-order': updateOrder(id, { stage: 0 }, 'Pesanan dikembalikan ke tahap verifikasi.'); break;
            case 'inspect-order': {
                const order = state.orders.find((item) => item.id === id);
                if (order) {
                    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="renter-modal-title"><div class="admin-content-header"><h2 id="renter-modal-title">Verifikasi penyewa</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><div class="stack"><div><strong>${escapeHtml(order.customerName)}</strong><p class="muted small">${escapeHtml(order.phone)} · Penjamin ${escapeHtml(order.guarantor)}</p><p class="small">Skor kepercayaan AI: ${Number(order.trustScore || 55)}/100 · Deposit ${money(order.deposit || 0)}</p><p class="small">${escapeHtml(order.socialPlatform)} ${escapeHtml(order.socialHandle)}</p><p class="small">${escapeHtml(order.address)}</p></div><div class="form-grid"><div><strong class="small">Selfie identitas</strong><p class="muted small">${escapeHtml(order.idSelfieName || 'Tidak tersedia')}</p>${order.idSelfieImage ? `<img class="upload-preview" src="${escapeHtml(order.idSelfieImage)}" alt="Selfie identitas penyewa">` : ''}</div><div><strong class="small">Bukti pembayaran · ${escapeHtml(order.paymentMethod || '')}</strong><p class="muted small">${escapeHtml(order.paymentProofName || 'Tidak tersedia')}</p>${order.paymentProofImage ? `<img class="upload-preview" src="${escapeHtml(order.paymentProofImage)}" alt="Bukti pembayaran penyewa">` : ''}</div></div></div></section></div>`;
                    render();
                }
                break;
            }
            case 'shipping-order': {
                const order = state.orders.find((item) => item.id === id);
                const tracking = prompt('Masukkan nomor resi JNE Express:', order?.trackingNumber || '');
                if (order && tracking !== null) updateOrder(id, { trackingNumber: tracking.trim() }, 'Nomor resi tersimpan.');
                break;
            }
            case 'refund-deposit': updateOrder(id, { stage: 7 }, 'Deposit ditandai sudah dikembalikan.'); break;
            case 'approve-event':
            case 'reject-event': {
                const approve = action.dataset.action === 'approve-event';
                api(`/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status: approve ? 'Disetujui' : 'Ditolak' } })
                    .then(({ event: updated }) => {
                        state.events = state.events.map((item) => (String(item.id) === String(id) ? normalizeEvent(updated) : item));
                        render();
                        showToast(approve ? 'Event disetujui dan dipublikasikan.' : 'Pengajuan event ditolak.');
                    })
                    .catch((error) => showToast(error.message));
                break;
            }
            case 'delete-event':
                if (confirm('Hapus event ini secara permanen?')) {
                    api(`/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
                        .then(() => { state.events = state.events.filter((item) => String(item.id) !== String(id)); render(); showToast('Event dihapus.'); })
                        .catch((error) => showToast(error.message));
                }
                break;
            case 'view-proof': {
                const item = state.events.find((candidate) => String(candidate.id) === String(id));
                if (item?.paymentProofImage) {
                    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true"><div class="admin-content-header"><h2>Bukti pembayaran</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><p class="muted small">${escapeHtml(item.paymentProofName || '')}</p><img class="upload-preview" src="${escapeHtml(item.paymentProofImage)}" alt="Bukti pembayaran promosi"></section></div>`;
                    render();
                }
                break;
            }
            case 'event-pairing': navigate('event', id); break;
            case 'close-modal': if (!action.classList.contains('modal-backdrop') || event.target === action) { state.modal = null; render(); } break;
            case 'forgot': showToast('Demo: silakan hubungi admin untuk reset kata sandi.'); break;
            case 'menu': document.querySelector('.main-nav')?.classList.toggle('menu-open'); break;
            case 'chat-toggle': state.chatOpen = !state.chatOpen; render(); if (state.chatOpen) focusChat(); break;
            case 'chat-close': state.chatOpen = false; render(); break;
            case 'chat-reset':
                state.chatRequestId += 1;
                state.chatLoading = false;
                state.chatMessages = [];
                try { sessionStorage.removeItem(STORAGE_KEYS.chatSession); } catch {}
                render();
                focusChat();
                showToast('Obrolan telah dibersihkan.');
                break;
            case 'gallery': { const mainImage = document.querySelector('.detail-main-image'); if (mainImage) mainImage.src = action.src; break; }
        }
        return;
    }

    const eventPrompt = event.target.closest('[data-event-prompt]');
    if (eventPrompt) {
        state.eventSearch = { ...state.eventSearch, query: eventPrompt.dataset.eventPrompt, active: true };
        render();
        return;
    }

    const category = event.target.closest('[data-category]');
    if (category) { state.category = category.dataset.category; state.search = ''; navigate('catalog'); return; }
    const size = event.target.closest('[data-size]');
    if (size) { state.size = size.dataset.size; render(); return; }
    const orderTab = event.target.closest('[data-order-filter]');
    if (orderTab) { state.orderFilter = orderTab.dataset.orderFilter; render(); return; }
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) { state.catalogPage = Number(pageButton.dataset.page); render(); return; }
});

app.addEventListener('input', (event) => {
    if (event.target.matches('#fit-height, #fit-weight, #fit-notes, #previous-store')) updateAIAssistant();
    if (event.target.matches('[data-action="price-range"]')) {
        state.maxPrice = Number(event.target.value);
        event.target.nextElementSibling.textContent = `Maks. ${money(state.maxPrice)}`;
    }
    if (event.target.matches('[data-admin-search]')) {
        const query = event.target.value.toLowerCase();
        document.querySelectorAll('[data-inventory-row]').forEach((row) => { row.hidden = !row.dataset.inventoryRow.includes(query); });
    }
    if (event.target.matches('#organizer-form input, #organizer-form select')) updateOrganizerPreview();
    if (event.target.matches('#event-poster')) {
        const file = event.target.files?.[0];
        if (file) {
            const preview = document.querySelector('#poster-preview');
            const url = URL.createObjectURL(file);
            preview.innerHTML = `<img src="${url}" alt="Pratinjau poster event">`;
        }
    }
});

app.addEventListener('change', (event) => {
    if (event.target.matches('[name="catalog-category"]')) { state.category = event.target.value; state.catalogPage = 1; render(); }
    if (event.target.matches('[data-size-filter]')) {
        const size = event.target.dataset.sizeFilter;
        state.sizeFilters = event.target.checked ? [...new Set([...state.sizeFilters, size])] : state.sizeFilters.filter((value) => value !== size);
        state.catalogPage = 1;
        render();
    }
    if (event.target.matches('[data-availability-filter]')) { state.onlyAvailable = event.target.checked; state.catalogPage = 1; render(); }
    if (event.target.matches('[data-action="sort"]')) { state.sort = event.target.value; state.catalogPage = 1; render(); }
    if (event.target.matches('[data-action="days"]')) { state.days = Number(event.target.value); render(); }
    if (event.target.matches('[data-action="start-date"]')) { state.rentalDate = event.target.value; render(); }
    if (event.target.matches('[data-addon]')) {
        const addon = event.target.dataset.addon;
        state.addons = event.target.checked ? [...new Set([...state.addons, addon])] : state.addons.filter((item) => item !== addon);
        render();
    }
    if (event.target.matches('[data-previous-rental]')) {
        const wrap = document.querySelector('#previous-store-wrap');
        const input = document.querySelector('#previous-store');
        const show = event.target.value === 'yes';
        if (wrap) wrap.hidden = !show;
        if (input) input.required = show;
        updateAIAssistant();
    }
    if (event.target.matches('#id-selfie')) updateAIAssistant();
    if (event.target.matches('#product-image-file')) {
        const file = event.target.files?.[0];
        const preview = document.querySelector('#product-image-preview');
        if (file && preview) { preview.src = URL.createObjectURL(file); preview.hidden = false; }
    }
    if (event.target.matches('#auth-role')) {
        const isCustomer = event.target.value === 'customer';
        const fields = document.querySelector('[data-customer-only]');
        if (fields) { fields.hidden = !isCustomer; fields.disabled = !isCustomer; }
    }
    if (event.target.matches('[data-action="price-range"]')) { state.maxPrice = Number(event.target.value); state.catalogPage = 1; render(); }
});

app.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const formId = form.getAttribute('id');
    form.querySelectorAll('input[type="tel"]').forEach((input) => { input.pattern = '\\+?[0-9]{9,15}'; });
    if (!form.reportValidity()) return;

    if (formId === 'chat-form') {
        sendChat(form.querySelector('input[name="message"]')?.value);
        return;
    }

    if (formId === 'home-search') {
        const values = new FormData(form);
        state.search = String(values.get('query') || '').trim();
        state.category = String(values.get('category') || '');
        state.sizeFilters = values.get('size') ? [String(values.get('size'))] : [];
        state.catalogPage = 1;
        navigate('catalog');
    }

    if (formId === 'event-ai-form') {
        const values = new FormData(form);
        const preferences = {
            query: String(values.get('query') || '').trim(),
            location: String(values.get('location') || '').trim(),
            tier: String(values.get('tier') || ''),
            active: true,
        };
        if (!preferences.query && !preferences.location && !preferences.tier) {
            showToast('Isi tema, kota, atau tier untuk mencari event.');
            return;
        }
        state.eventSearch = preferences;
        render();
        return;
    }

    if (formId === 'checkout-form') {
        const values = new FormData(form);
        const { product, total } = checkoutTotals();
        const dp = Number(values.get('paymentAmount'));
        const minimum = Math.ceil(total * 0.5);
        if (dp < minimum || dp > total) { showToast(`DP harus antara ${money(minimum)} dan ${money(total)}.`); return; }

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        try {
            const proofFile = form.elements.paymentProof?.files?.[0];
            const selfieFile = form.elements.idSelfie?.files?.[0];
            const payload = {
                productId: Number(product.id),
                size: state.size,
                days: state.days,
                rentalDate: state.rentalDate,
                addons: state.addons,
                dp,
                paymentMethod: String(values.get('paymentMethod')),
                address: String(values.get('address') || '').trim(),
                paymentProofName: proofFile?.name || '',
                paymentProofImage: await imageToDataUrl(proofFile),
            };
            for (const field of ['phone', 'socialPlatform', 'socialHandle', 'guarantor']) {
                if (values.get(field)) payload[field] = String(values.get(field)).trim();
            }
            if (selfieFile) { payload.idSelfie = await imageToDataUrl(selfieFile); payload.idSelfieName = selfieFile.name; }

            await api('/orders', { method: 'POST', body: payload });
            showToast('Pesanan berhasil dibuat! Admin akan memverifikasi pembayaranmu.');
            state.addons = [];
            try { const me = await api('/me'); setSession(me.user); } catch { /* abaikan */ }
            await Promise.all([loadOrders(), loadCatalog()]);
            navigate('orders');
        } catch (error) {
            showToast(error.message || 'Gagal memproses pesanan.');
            if (submitButton) submitButton.disabled = false;
        }
        return;
    }

    if (formId === 'role-auth-form') {
        const values = new FormData(form);
        const errorElement = form.querySelector('[data-auth-error]');
        const showAuthError = (message) => {
            if (!errorElement) return showToast(message);
            errorElement.textContent = message;
            errorElement.hidden = false;
            errorElement.className = 'small auth-error';
        };
        const isRegister = form.dataset.mode === 'register';
        const role = String(values.get('role') || 'customer');
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        if (errorElement) errorElement.hidden = true;

        try {
            const payload = { email: String(values.get('email') || '').trim().toLowerCase(), password: String(values.get('password')) };
            if (isRegister) {
                payload.name = String(values.get('name') || '').trim();
                payload.role = role;
                if (role === 'customer') {
                    const selfie = form.elements.idSelfie?.files?.[0];
                    Object.assign(payload, {
                        phone: String(values.get('phone') || '').trim(),
                        address: String(values.get('address') || '').trim(),
                        socialPlatform: String(values.get('socialPlatform') || ''),
                        socialHandle: String(values.get('socialHandle') || '').trim(),
                        guarantor: String(values.get('guarantor') || '').trim(),
                        previousRental: String(values.get('previousRental') || ''),
                        previousStore: String(values.get('previousStore') || '').trim(),
                        idSelfie: await imageToDataUrl(selfie, 1000, 0.78),
                        idSelfieName: selfie?.name || '',
                    });
                }
            }
            const body = await api(isRegister ? '/register' : '/login', { method: 'POST', body: payload });
            setSession(body.user, body.token);
            await Promise.all([loadEvents(), loadOrders()]);
            if (body.user.role === 'admin') {
                state.adminSection = 'overview';
                navigate('admin', 'overview');
                showToast('Berhasil masuk sebagai Admin Rental.');
            } else {
                navigate('home');
                showToast(isRegister ? 'Akun berhasil dibuat! Data dirimu tersimpan.' : 'Berhasil masuk sebagai Penyewa.');
            }
        } catch (error) {
            showAuthError(error.message || 'Gagal terhubung ke server.');
            if (submitButton) submitButton.disabled = false;
        }
        return;
    }

    if (formId === 'organizer-form') {
        const values = new FormData(form);
        const themeText = String(values.get('theme')).trim();
        const dateValue = String(values.get('date'));
        const poster = form.elements.poster.files?.[0];
        const paymentProof = form.elements.paymentProof?.files?.[0];
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        try {
            const result = await api('/events', {
                method: 'POST',
                body: {
                    title: String(values.get('title')).trim(),
                    date: dateValue ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${dateValue}T00:00:00`)) : 'Tanggal belum ditentukan',
                    location: String(values.get('location')).trim(),
                    theme: themeText,
                    tier: String(values.get('tier')),
                    image: poster ? await imageToDataUrl(poster) : undefined,
                    paymentProofName: paymentProof?.name || undefined,
                    paymentProofImage: paymentProof ? await imageToDataUrl(paymentProof) : undefined,
                    termsAccepted: values.get('promotionTerms') === 'on',
                },
            });
            writeStorage(STORAGE_KEYS.submissions, [...new Set([...mySubmissionIds(), String(result.event.id)])]);
            await loadEvents();
            render();
            showToast('Pengajuan terkirim! Event tayang setelah disetujui admin.');
        } catch (error) {
            showToast(error.message || 'Pengajuan gagal dikirim.');
            if (submitButton) submitButton.disabled = false;
        }
    }

    if (formId === 'product-form') {
        const values = new FormData(form);
        const payload = Object.fromEntries(values);
        const id = String(payload.id || '');
        delete payload.id;
        const imageFile = form.elements.imageFile?.files?.[0];
        delete payload.imageFile;
        try {
            if (imageFile) payload.image = await imageToDataUrl(imageFile, 720, 0.72);
            const response = await api(id ? `/costumes/${encodeURIComponent(id)}` : '/costumes', { method: id ? 'PUT' : 'POST', body: payload });
            showToast(response.message || 'Kostum tersimpan.');
            state.modal = null;
            state.adminSection = 'inventory';
            await loadCatalog();
            render();
        } catch (error) {
            showToast(error.message || 'Gagal menyimpan kostum.');
        }
    }
});

const updateOrganizerPreview = () => {
    const form = document.querySelector('#organizer-form');
    const result = document.querySelector('#ai-result');
    if (!form || !result) return;
    const values = new FormData(form);
    const title = String(values.get('title') || '').trim();
    const date = String(values.get('date') || '');
    const location = String(values.get('location') || '').trim();
    const themeText = String(values.get('theme') || '').trim();
    const formattedDate = date ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${date}T00:00:00`)) : 'Menunggu input';
    result.innerHTML = `<div><small>Nama event</small><strong>${escapeHtml(title || 'Menunggu input')}</strong></div><div><small>Tanggal</small><strong>${escapeHtml(formattedDate)}</strong></div><div><small>Lokasi</small><strong>${escapeHtml(location || 'Menunggu input')}</strong></div><div><small>Tema terdeteksi · simulasi OCR</small><strong>${escapeHtml(themeText || 'Menunggu input')}</strong></div>`;
    const matches = matchingProducts(`${themeText} ${title}`);
    const target = document.querySelector('#organizer-matches');
    if (target) target.innerHTML = matches.length ? matches.map((product) => `<div class="admin-item"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div class="admin-item-main"><strong>${escapeHtml(product.name)}</strong><small>${money(product.price)} / hari</small></div></div>`).join('') : '<p class="muted small">Belum ada kostum yang cocok dengan tema ini.</p>';
};

window.addEventListener('popstate', () => {
    const [page, param] = location.hash.slice(1).split('/');
    state.page = page || 'home';
    state.param = param ? decodeURIComponent(param) : null;
    if (state.page === 'admin' && state.param && adminMenu.some(([section]) => section === state.param)) state.adminSection = state.param;
    render();
});

let savedTheme = 'light';
try { savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'light'; } catch {}
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light';
const [initialPage, initialParam] = location.hash.slice(1).split('/');
if (initialPage && ['home', 'catalog', 'detail', 'rules', 'howto', 'checkout', 'orders', 'tracking', 'login', 'register', 'events', 'event', 'organizer', 'admin'].includes(initialPage)) {
    state.page = initialPage;
    state.param = initialParam ? decodeURIComponent(initialParam) : null;
    if (initialPage === 'admin' && initialParam && adminMenu.some(([section]) => section === initialParam)) state.adminSection = initialParam;
}

render();
(async () => {
    // Sesi lama (tanpa token) tidak bisa dipakai untuk API terlindungi → minta masuk ulang.
    if (state.session && !state.session.token) clearSession();
    if (state.session?.token) {
        try {
            const me = await api('/me');
            setSession(me.user);
        } catch { /* api() sudah membersihkan sesi bila 401 */ }
    }
    await refreshAll();
    state.loaded = true;
    render();
})();
