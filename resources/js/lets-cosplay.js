import QRCode from 'qrcode';

const STORAGE_KEYS = {
    theme: 'letscosplay-theme',
    orders: 'letscosplay-demo-orders',
    inventory: 'letscosplay-demo-inventory-v2',
    events: 'letscosplay-demo-events',
    admin: 'letscosplay-demo-admin',
    accounts: 'letscosplay-demo-accounts',
    session: 'letscosplay-demo-session',
};

const defaultAccounts = [
    { email: 'barbarapavin3099@gmail.com', password: '12345678', name: 'Barbara Pavin', role: 'customer' },
    { email: 'adminrental123@gmail.com', password: '12345678910', name: 'Admin Rental', role: 'admin' },
];

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

const loadAccounts = () => {
    const accounts = readStorage(STORAGE_KEYS.accounts, []);
    for (const account of defaultAccounts) {
        if (!accounts.some((saved) => saved.email.toLowerCase() === account.email)) accounts.push(account);
    }
    writeStorage(STORAGE_KEYS.accounts, accounts);
    return accounts;
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
const compressImage = (file) => new Promise((resolve) => {
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
        const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(source);
        try { resolve(canvas.toDataURL('image/jpeg', 0.72)); } catch { resolve(seedEvents[0].image); }
    };
    image.onerror = () => { URL.revokeObjectURL(source); resolve(seedEvents[0].image); };
    image.src = source;
});
const app = document.querySelector('#app');

const initialEvents = Array.isArray(window.letsCosplayEvents) ? window.letsCosplayEvents.map((event) => ({
    id: `db-${event.id}`,
    title: event.title,
    date: event.date,
    location: event.location,
    theme: event.description || event.category,
    category: event.category,
    tier: event.category === 'Paid Promotion' ? 'Prabayar' : 'Gratis',
    status: 'Disetujui',
    image: event.media_url || 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85',
    description: event.description || 'Temukan komunitas dan teman cosplay baru di acara ini.',
    featured: event.category === 'Paid Promotion',
    databaseId: event.id,
})) : [];

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
    maxPrice: 200000,
    sizeFilters: [],
    onlyAvailable: true,
    catalogPage: 1,
    orderFilter: 'Semua',
    adminSection: 'overview',
    trustScore: 55,
    accounts: loadAccounts(),
    session: readStorage(STORAGE_KEYS.session, null),
    inventory:[],
    orders: readStorage(STORAGE_KEYS.orders, []),
    events: [...initialEvents, ...readStorage(STORAGE_KEYS.events, seedEvents)],
    eventSearch: { query: '', location: '', tier: '', active: false },
    selectedEvent: null,
    modal: null,
    chatOpen: false,
    chatMessages: [],
};

const productById = (id) => state.inventory.find((product) => product.id === id) || state.inventory[0] || {
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
                <div><h4>Bantuan</h4><div class="footer-links">${state.session?.role === 'customer' ? '<a href="#orders" data-go="orders">Pesanan saya</a>' : ''}<a href="#login" data-go="login">Masuk akun</a><a href="#organizer" data-go="organizer">Pasang iklan event</a></div></div>
                <div><h4>Jam layanan</h4><div class="footer-links"><span>Senin–Sabtu</span><span>09.00–18.00 WIB</span><span>Jakarta, Indonesia</span></div></div>
            </div>
            <div class="footer-bottom"><span>© 2026 Let'sCosplay. Prototype UI/UX untuk keperluan akademik.</span><span>Data pesanan demo tersimpan hanya di perangkat ini.</span></div>
        </div>
    </footer>`;

const productCard = (product) => `
    <article class="product-card reveal">
        <div class="product-photo">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
            ${product.tag ? `<span class="product-tag">${escapeHtml(product.tag)}</span>` : ''}
            <button type="button" class="favorite-button" data-action="favorite" aria-label="Simpan ${escapeHtml(product.name)}">${icon('favorite')}</button>
        </div>
        <div class="product-info">
            <div class="product-meta"><span>${escapeHtml(product.category)} · ${escapeHtml(product.series)}${product.origin ? ` · ${escapeHtml(product.origin)}` : ''}</span><span class="availability">${product.stock > 0 ? 'Tersedia' : 'Disewa'}</span></div>
            <h3 class="product-name">${escapeHtml(product.name)}</h3>
            <div class="card-bottom"><div><div class="product-price">${money(product.price)} <small>/ hari</small></div><div class="rating">${icon('star')} ${product.rating} <span class="muted small">(${product.reviews})</span></div></div><button class="button button-soft button-small" type="button" data-go="detail" data-id="${escapeHtml(product.id)}">Lihat detail</button></div>
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
        <div class="hero-content"><div class="hero-copy reveal"><span class="eyebrow">Sewa kostum. Jadi karakter favoritmu.</span><h1 class="display">Panggung cerita<br>ada di tanganmu.</h1><p>Kostum cosplay terkurasi, siap dikirim ke rumah. Pilih karakter, tentukan tanggal, dan mulai petualanganmu.</p><div class="hero-actions"><button class="button button-primary" data-go="catalog" type="button">Jelajahi kostum ${icon('arrow_forward')}</button><button class="button button-secondary" data-go="events" type="button">Telusuri event bersama AI</button></div><div class="hero-meta"><div><strong>120+</strong>Kostum pilihan</div><div><strong>4,9/5</strong>Rating penyewa</div><div><strong>1.200+</strong>Rental selesai</div></div></div></div>
    </section>
    <div class="container"><form class="search-panel" id="home-search"><label class="search-control">${icon('search')}<input name="query" placeholder="Cari karakter atau serial" aria-label="Cari karakter atau serial"></label><label class="search-control">${icon('category')}<select name="category" aria-label="Kategori"><option value="">Semua kategori</option>${categories.map((category) => `<option>${category.name}</option>`).join('')}</select></label><label class="search-control">${icon('straighten')}<select name="size" aria-label="Ukuran"><option value="">Semua ukuran</option>${['XS', 'S', 'M', 'L', 'XL'].map((size) => `<option>${size}</option>`).join('')}</select></label><button class="button button-primary" type="submit">Cari kostum</button></form></div>
    <div class="container content-section">
        <div class="section-heading"><div><span class="eyebrow">Temukan duniamu</span><h2>Jelajahi kategori</h2></div><button class="button button-quiet" data-go="catalog" type="button">Semua kostum ${icon('arrow_forward')}</button></div>
        <div class="category-row">${categories.map((category) => `<button class="category-tile" type="button" data-category="${category.name}"><span class="category-icon">${icon(category.icon)}</span>${category.name}</button>`).join('')}</div>
        <div class="section-heading"><div><span class="eyebrow">Kurasi minggu ini</span><h2>Kostum yang lagi ramai</h2></div><button class="button button-quiet" data-go="catalog" type="button">Lihat katalog ${icon('arrow_forward')}</button></div>
        <div class="product-grid">${state.inventory.slice(0, 4).map(productCard).join('')}</div>
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
            && product.price <= state.maxPrice
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
                <div class="filter-group"><h4>Rentang harga per hari</h4><div class="filter-range"><input type="range" min="50000" max="200000" step="5000" value="${state.maxPrice}" data-action="price-range"><span class="muted small">Maks. ${money(state.maxPrice)}</span></div></div>
                <div class="filter-group"><h4>Ketersediaan</h4><label class="filter-label"><input type="checkbox" data-availability-filter ${state.onlyAvailable ? 'checked' : ''}> Siap disewa</label></div>
            </div></aside>
            <section><div class="catalog-toolbar"><span class="muted small">${sorted.length} kostum ditemukan</span><div class="quantity-row"><button class="button button-secondary button-small" data-action="mobile-filters" type="button">${icon('tune')} Filter</button><select class="select" data-action="sort" aria-label="Urutkan katalog"><option value="popular" ${state.sort === 'popular' ? 'selected' : ''}>Paling populer</option><option value="price-low" ${state.sort === 'price-low' ? 'selected' : ''}>Harga terendah</option><option value="price-high" ${state.sort === 'price-high' ? 'selected' : ''}>Harga tertinggi</option></select></div></div>
                <div class="filter-chips">${state.search ? `<span class="chip">${escapeHtml(state.search)} ×</span>` : ''}<span class="chip">Deposit refundable</span><span class="chip">Kondisi terverifikasi</span></div><div class="product-grid">${sorted.length ? sorted.map(productCard).join('') : '<div class="empty-state">Belum ada kostum yang sesuai. Coba ubah kategori atau harga.</div>'}</div><div class="pagination"><button aria-label="Halaman sebelumnya">‹</button><button class="active">1</button><button>2</button><button>3</button><button aria-label="Halaman berikutnya">›</button></div>
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
    const total = subtotal + ship + product.deposit;
    const images = [product.image, product.image, product.image, product.image];
    return `<div class="container page-wrap"><div class="breadcrumb"><a href="#home" data-go="home">Beranda</a><span>/</span><a href="#catalog" data-go="catalog">Katalog</a><span>/</span><span>${escapeHtml(product.name)}</span></div>
        <div class="detail-layout"><div><img class="detail-main-image" src="${escapeHtml(images[0])}" alt="${escapeHtml(product.name)}"><div class="detail-thumbs">${images.map((image, index) => `<img src="${escapeHtml(image)}" data-action="gallery" alt="Foto ${index + 1} ${escapeHtml(product.name)}" loading="lazy">`).join('')}</div><section class="panel" style="margin-top:20px"><h2>Yang termasuk dalam paket</h2><div class="stack">${product.accessories.map((item) => `<div class="price-line"><span>${icon('check_circle')} ${escapeHtml(item)}</span><span>Termasuk</span></div>`).join('')}</div></section><section class="panel" style="margin-top:16px"><h2>Panduan ukuran</h2><p class="muted small">Ukuran menggunakan standar badan Indonesia. Pilih ukuran yang biasa kamu gunakan; tim kami akan mengonfirmasi sebelum dikirim.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Ukuran</th><th>Lingkar dada</th><th>Panjang</th></tr></thead><tbody><tr><td>S</td><td>82–88 cm</td><td>135 cm</td></tr><tr><td>M</td><td>89–96 cm</td><td>140 cm</td></tr><tr><td>L</td><td>97–104 cm</td><td>145 cm</td></tr></tbody></table></div></section></div>
        <div class="detail-content"><span class="eyebrow">${escapeHtml(product.series)}</span><h1>${escapeHtml(product.name)}</h1><div class="product-meta"><span>${escapeHtml(product.category)} · ${product.reviews} ulasan</span><span class="rating">${icon('star')} ${product.rating}</span></div><p class="detail-blurb">${escapeHtml(product.description)}</p><div class="detail-price">${money(product.price)} <small>/ hari</small></div><div class="field"><span class="field-label">Pilih ukuran</span><div class="size-row">${product.size.map((size) => `<button class="size-option ${state.size === size ? 'selected' : ''}" data-size="${size}" type="button">${size}</button>`).join('')}<button class="text-button small" data-go="rules" type="button">Panduan ukuran</button></div></div><div class="field" style="margin-top:17px"><label for="rental-days">Lama sewa</label><select class="select" id="rental-days" data-action="days">${[1, 2, 3, 4, 5, 6, 7].map((days) => `<option value="${days}" ${state.days === days ? 'selected' : ''}>${days} hari</option>`).join('')}</select></div><div class="field" style="margin-top:17px"><label for="rental-date">Tanggal mulai sewa</label><input class="input" id="rental-date" type="date" min="${toDateValue(new Date())}" value="${state.rentalDate}" data-action="start-date" required><small class="muted">Pilih tanggal kostum akan mulai digunakan.</small></div><div class="field" style="margin-top:17px"><span class="field-label">Aksesori tambahan</span><div class="addon-list"><label class="addon-option"><span><input type="checkbox" data-addon="wig" ${state.addons.includes('wig') ? 'checked' : ''}> Styling wig premium</span><strong>+ Rp35.000 / hari</strong></label><label class="addon-option"><span><input type="checkbox" data-addon="care" ${state.addons.includes('care') ? 'checked' : ''}> Paket perawatan kostum</span><strong>+ Rp15.000 / hari</strong></label></div></div><div class="price-box"><div class="price-line"><span>Sewa (${state.days} hari)</span><strong>${money(subtotal)}</strong></div><div class="price-line"><span>Estimasi pengiriman</span><strong>${money(ship)}</strong></div><div class="price-line"><span>Deposit refundable</span><strong>${money(product.deposit)}</strong></div><div class="price-line total"><span>Estimasi total</span><strong>${money(total)}</strong></div><p class="muted small">Deposit dikembalikan setelah kostum diterima dan kondisinya diperiksa.</p></div><button class="button button-primary" style="width:100%" type="button" data-action="checkout">Lanjut ke pemesanan ${icon('arrow_forward')}</button><button class="button button-secondary" style="width:100%;margin-top:8px" type="button" data-go="rules">Baca aturan rental</button></div></div></div>`;
};

const rulesPage = () => `<div class="container page-wrap"><div class="page-intro"><div><span class="eyebrow">Sebelum menyewa</span><h1 class="page-title">Aturan rental</h1><p>Supaya pengalaman rental nyaman dan kostum tetap terawat, baca ketentuan berikut sebelum memesan.</p></div><button class="button button-primary" data-go="catalog" type="button">Pilih kostum ${icon('arrow_forward')}</button></div><div class="rules-grid"><nav class="rules-nav"><a href="#renter">Persyaratan penyewa</a><a href="#payment">Pembayaran & deposit</a><a href="#care">Perawatan kostum</a><a href="#shipping">Pengiriman & retur</a><a href="#late">Keterlambatan</a></nav><div class="rules-content"><section id="renter"><h2>Persyaratan penyewa</h2><ul><li>Penyewa berusia minimal 17 tahun dan memberikan identitas yang valid untuk verifikasi.</li><li>Nomor telepon aktif dan nomor penjamin wajib dapat dihubungi selama masa sewa.</li><li>Alamat pengiriman harus lengkap, termasuk kecamatan, kota, kode pos, dan petunjuk rumah.</li><li>Data digunakan hanya untuk proses verifikasi dan pemenuhan pesanan demo ini.</li></ul></section><section id="payment"><h2>Pembayaran & deposit</h2><ul><li>Pesanan dikonfirmasi setelah pembayaran uang muka minimal 50% dari total estimasi.</li><li>Sisa pembayaran harus diterima paling lambat H-1 sebelum kostum dikirim.</li><li>Deposit bersifat refundable dan dikembalikan maksimal 3 hari kerja setelah pemeriksaan retur.</li><li>Biaya pengiriman dihitung terpisah dari harga sewa dan deposit.</li></ul></section><section id="care"><h2>Perawatan kostum</h2><ul><li>Gunakan kostum dengan tangan bersih dan hindari makanan/minuman di area kostum.</li><li>Jangan mencuci, menyetrika, mengelem, atau mengubah kostum tanpa persetujuan tim.</li><li>Simpan aksesori dalam kantong masing-masing dan gunakan kemasan pelindung saat retur.</li><li>Kerusakan atau kehilangan komponen dapat mengurangi nilai deposit sesuai hasil pemeriksaan.</li></ul></section><section id="shipping"><h2>Pengiriman & retur</h2><ul><li>Kostum dikirim melalui JNE Express dengan nomor resi yang dibagikan di halaman Pesanan saya.</li><li>Paket dijadwalkan tiba sebelum tanggal penggunaan; sampaikan kebutuhan khusus saat checkout.</li><li>Kirim kembali kostum pada hari terakhir sewa menggunakan label retur yang disertakan.</li><li>Foto kondisi paket sebelum dikirim sebagai dokumentasi bersama.</li></ul></section><section id="late"><h2>Keterlambatan & pembatalan</h2><ul><li>Keterlambatan pengembalian dikenakan biaya 25% harga sewa per hari.</li><li>Pembatalan sebelum kostum disiapkan dapat memperoleh pengembalian DP penuh.</li><li>Setelah paket dikirim, biaya pengiriman tidak dapat dikembalikan.</li></ul></section><label class="checkline"><input type="checkbox" data-action="rules-accept"> Saya sudah membaca dan memahami aturan rental.</label></div></div></div>`;

const howToPage = () => `<div class="container page-wrap"><div class="page-intro"><div><span class="eyebrow">Panduan penyewa</span><h1 class="page-title">Cara sewa kostum</h1><p>Alur rental yang jelas dari pilih karakter sampai pengembalian kostum.</p></div><button class="button button-primary" data-go="catalog">Mulai pilih kostum ${icon('arrow_forward')}</button></div><div class="steps-grid">${[['01', 'Pilih kostum dan tanggal', 'Cari karakter, cek ukuran yang tersedia, tentukan durasi dan tanggal mulai sewa.'], ['02', 'Lengkapi profil penyewa', 'Isi kontak, alamat, penjamin, dan unggah selfie identitas untuk simulasi pemeriksaan.'], ['03', 'Bayar DP minimal 50%', 'Unggah bukti transfer. Sisa pembayaran diselesaikan paling lambat H-1 pengiriman.'], ['04', 'Terima, gunakan, kembalikan', 'Pantau resi JNE dan status pesanan. Kembalikan kostum sesuai tanggal akhir sewa.']].map(([number, title, copy]) => `<article class="step-item"><span class="step-number">${number}</span><h3>${title}</h3><p>${copy}</p></article>`).join('')}</div><div class="notice">Deposit refundable setelah kostum diterima kembali dan pemeriksaan kondisi selesai. <button class="text-button" data-go="rules">Baca Rules Rental</button></div></div>`;

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
        <section class="form-section"><h2><span class="section-index">2</span> Data penyewa</h2><div class="form-grid"><div class="field"><label for="renter-name">Nama lengkap sesuai identitas *</label><input class="input" id="renter-name" name="name" required autocomplete="name" placeholder="Nama lengkap"></div><div class="field"><label for="renter-phone">Nomor telepon aktif *</label><input class="input" id="renter-phone" name="phone" required type="tel" pattern="[0-9+() -]{9,18}" autocomplete="tel" placeholder="08xx xxxx xxxx"></div><div class="field"><label for="social-platform">Media sosial *</label><select class="select" id="social-platform" name="socialPlatform" required><option value="">Pilih platform</option><option>Instagram</option><option>TikTok</option><option>X</option><option>Lainnya</option></select></div><div class="field"><label for="social-handle">Username akun *</label><input class="input" id="social-handle" name="socialHandle" required placeholder="@username"></div><div class="field span-2"><label for="renter-address">Alamat lengkap pengiriman *</label><textarea class="textarea" id="renter-address" name="address" required autocomplete="street-address" placeholder="Jalan, nomor rumah, RT/RW, kecamatan, kota, kode pos"></textarea></div><div class="field"><label for="guarantor-phone">Nomor telepon penjamin *</label><input class="input" id="guarantor-phone" name="guarantor" required type="tel" pattern="[0-9+() -]{9,18}" placeholder="Nomor keluarga/kerabat"></div><div class="field"><label for="id-selfie">Foto selfie memegang identitas *</label><input class="input" id="id-selfie" name="idSelfie" type="file" accept="image/*" required><small class="muted">Untuk prototype, file tidak dikirim ke server.</small></div><div class="field span-2"><span class="field-label">Pernah menyewa kostum sebelumnya? *</span><div class="quantity-row"><label class="filter-label"><input type="radio" name="previousRental" value="yes" required data-previous-rental> Ya</label><label class="filter-label"><input type="radio" name="previousRental" value="no" required data-previous-rental> Belum</label></div></div><div class="field span-2" id="previous-store-wrap" hidden><label for="previous-store">Nama toko rental sebelumnya *</label><input class="input" id="previous-store" name="previousStore" placeholder="Nama toko / akun rental"></div></div></section>
        <section class="form-section"><h2><span class="section-index">3</span> Rincian pembayaran</h2><div class="price-line"><span>Subtotal sewa dan aksesori</span><strong>${money(subtotal)}</strong></div><div class="price-line"><span>Pengiriman</span><strong>${money(shipping)}</strong></div><div class="price-line"><span>Deposit refundable</span><strong>${money(product.deposit)}</strong></div><div class="price-line total"><span>Total estimasi</span><strong>${money(total)}</strong></div><div class="notice" style="margin-top:14px">Minimum DP 50%: <strong>${money(minimumDp)}</strong>. Sisa <strong>${money(balance)}</strong> dibayarkan paling lambat H-1 sebelum pengiriman.</div><div class="field" style="margin-top:14px"><label for="payment-amount">Jumlah DP yang dibayar *</label><input class="input" id="payment-amount" name="paymentAmount" type="number" min="${minimumDp}" max="${total}" step="1000" value="${minimumDp}" required><small class="muted">Minimal ${money(minimumDp)} · maksimal ${money(total)}</small></div></section>
        <section class="form-section"><h2><span class="section-index">4</span> Bukti pembayaran</h2><div class="payment-choice"><label><input type="radio" name="paymentMethod" value="Transfer bank" required> Transfer bank<br><small class="muted">BCA · BNI · Mandiri</small></label><label><input type="radio" name="paymentMethod" value="E-wallet" required> E-wallet<br><small class="muted">GoPay · OVO · DANA</small></label></div><div class="field" style="margin-top:14px"><label for="payment-proof">Unggah bukti transfer *</label><input class="input" id="payment-proof" name="paymentProof" type="file" accept="image/*" required><small class="muted">JPG atau PNG, maksimal 5 MB. File hanya simulasi dalam prototype.</small></div></section>
        <section class="form-section"><h2><span class="section-index">5</span> Persetujuan</h2><label class="checkline"><input type="checkbox" name="agree" required> Saya menyetujui <a class="text-button" href="#rules" data-go="rules">Aturan rental</a>, penggunaan deposit, dan jadwal pengembalian kostum.</label><div class="notice" style="margin-top:13px">Prototype akademik: dokumen identitas dan bukti pembayaran tidak diunggah atau diverifikasi secara nyata.</div></section>
    </div><aside class="sticky-summary"><h2>Ringkasan pesanan</h2><div class="price-line"><span>Kostum</span><strong>${money(product.price * state.days)}</strong></div>${addOnTotal ? `<div class="price-line"><span>Aksesori tambahan</span><strong>${money(addOnTotal * state.days)}</strong></div>` : ''}<div class="price-line"><span>Pengiriman</span><strong>${money(shipping)}</strong></div><div class="price-line"><span>Deposit</span><strong>${money(product.deposit)}</strong></div><div class="price-line total"><span>Total</span><strong>${money(total)}</strong></div><div class="deposit-note">${icon('verified_user')} Deposit refundable setelah kostum retur dan lolos pemeriksaan.</div><button class="button button-primary" type="submit" style="width:100%;margin-top:16px">Kirim pesanan ${icon('arrow_forward')}</button><p class="muted small">Pesanan demo akan tersimpan di perangkat ini.</p></aside></div></form></div>`;
};

const stageForOrder = (order) => order.stage ?? 0;
const ordersPage = () => {
    const tabs = ['Semua', 'Menunggu verifikasi', 'Diproses', 'Disewa', 'Selesai'];
    const customerOrders = state.orders.filter((order) => order.customerEmail === state.session?.email);
    const visibleOrders = customerOrders.filter((order) => state.orderFilter === 'Semua' || order.bucket === state.orderFilter);
    return `<div class="container page-wrap"><div class="page-intro"><div><span class="eyebrow">Pantau perjalanan paketmu</span><h1 class="page-title">Pesanan saya</h1><p>Semua status dan detail rental tersimpan di sini.</p></div><button class="button button-primary" data-go="catalog" type="button">Cari kostum ${icon('arrow_forward')}</button></div><div class="orders-tabs">${tabs.map((tab) => `<button class="orders-tab ${state.orderFilter === tab ? 'active' : ''}" data-order-filter="${tab}" type="button">${tab}</button>`).join('')}</div>${visibleOrders.length ? visibleOrders.map((order) => {
        const product = productById(order.productId);
        const stage = stageForOrder(order);
        return `<article class="order-card"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(product.name)}</h3><p class="muted small">Kode ${escapeHtml(order.id)} · Ukuran ${escapeHtml(order.size)} · ${order.days} hari</p><span class="status-pill ${stage > 5 ? 'success' : ''}">${escapeHtml(orderStages[stage])}</span><div class="small" style="margin-top:8px"><strong>${money(order.total)}</strong> <span class="muted">· ${escapeHtml(order.customerName || 'Penyewa')}</span></div></div><button class="button button-secondary button-small" data-go="tracking" data-id="${escapeHtml(order.id)}" type="button">Lacak pesanan</button></article>`;
    }).join('') : '<div class="empty-state">Belum ada pesanan di kategori ini. Kostum pilihanmu menunggu.</div>'}</div>`;
};

const trackingPage = () => {
    const order = state.orders.find((item) => item.id === state.param && item.customerEmail === state.session?.email);
    if (!order) return `<div class="container page-wrap"><div class="empty-state">Pesanan tidak ditemukan. <button class="button button-primary" data-go="catalog">Pilih kostum</button></div></div>`;
    const product = productById(order.productId);
    const stage = stageForOrder(order);
    return `<div class="container page-wrap"><div class="breadcrumb"><button class="text-button" data-go="orders">Pesanan saya</button><span>/</span><span>${escapeHtml(order.id)}</span></div><section class="success-panel"><span class="success-icon">${icon(stage >= 7 ? 'check' : 'package_2')}</span><span class="eyebrow">${stage >= 7 ? 'Rental selesai' : 'Status pesanan'}</span><h1>${escapeHtml(orderStages[stage])}</h1><p class="muted">Kode pesanan <strong>${escapeHtml(order.id)}</strong> · dibuat ${escapeHtml(order.createdAt)}</p><div class="tracking-list">${orderStages.map((label, index) => `<div class="tracking-step ${index < stage ? 'done' : ''} ${index === stage ? 'current' : ''}"><span class="tracking-dot">${index < stage ? '✓' : index + 1}</span><div><strong>${label}</strong><small>${index < stage ? 'Selesai' : index === stage ? 'Sedang berlangsung' : 'Menunggu tahap sebelumnya'}</small></div></div>`).join('')}</div><div class="panel" style="text-align:left"><div class="readonly-product"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(product.name)}</h3><span class="muted small">Ukuran ${escapeHtml(order.size)} · ${order.days} hari</span><p class="small"><strong>Total ${money(order.total)}</strong></p></div></div>${order.trackingNumber ? `<p class="small">Resi JNE Express: <strong>${escapeHtml(order.trackingNumber)}</strong></p>` : ''}</div><button class="button button-secondary" style="margin-top:18px" data-go="orders">Kembali ke pesanan</button></section></div>`;
};

const authPage = (register = false) => `<div class="container page-wrap"><div class="auth-layout"><div class="auth-art"><div class="auth-art-content"><span class="eyebrow">Let'sCosplay community</span><h2>Jadilah karakter yang selalu kamu ingat.</h2><p>Temukan kostum dan teman satu fandom.</p></div></div><div class="auth-form-wrap"><span class="eyebrow">${register ? 'Buat akun baru' : 'Selamat datang kembali'}</span><h1>${register ? 'Daftar penyewa' : 'Masuk ke akunmu'}</h1><p class="muted small">${register ? 'Simpan pesanan dan temukan event favoritmu.' : 'Lanjutkan petualangan cosplay-mu.'}</p><form class="auth-form" id="auth-form">${register ? '<div class="field"><label for="auth-name">Nama lengkap</label><input class="input" id="auth-name" name="name" required minlength="3" autocomplete="name"></div>' : ''}<div class="field"><label for="auth-email">Email</label><input class="input" type="email" id="auth-email" name="email" required autocomplete="email" placeholder="nama@email.com"></div><div class="field"><label for="auth-password">Kata sandi</label><input class="input" type="password" id="auth-password" name="password" required minlength="8" autocomplete="${register ? 'new-password' : 'current-password'}" placeholder="Minimal 8 karakter"></div>${register ? '<label class="checkline"><input type="checkbox" required> Saya menyetujui syarat penggunaan dan kebijakan privasi.</label>' : '<button type="button" class="text-button small" data-action="forgot">Lupa kata sandi?</button>'}<button class="button button-primary" type="submit">${register ? 'Buat akun' : 'Masuk'} ${icon('arrow_forward')}</button></form><p class="auth-switch">${register ? 'Sudah punya akun?' : 'Belum punya akun?'} <button class="text-button" type="button" data-go="${register ? 'login' : 'register'}">${register ? 'Masuk' : 'Daftar sekarang'}</button></p><div class="notice" style="margin-top:20px">Mode demo: autentikasi ini hanya simulasi, bukan akun produksi.</div></div></div></div>`;

const accountAuthPage = (register = false, adminOnly = false) => `<div class="container page-wrap"><div class="auth-layout"><div class="auth-art"><div class="auth-art-content"><span class="eyebrow">Akun Let'sCosplay</span><h2>${register ? 'Mulai cerita cosplay-mu.' : 'Masuk dan lanjutkan petualanganmu.'}</h2><p>Akun demo disimpan di browser ini untuk prototipe.</p></div></div><div class="auth-form-wrap"><span class="eyebrow">${register ? 'Pendaftaran akun' : 'Akses aman'}</span><h1>${register ? 'Buat akun' : adminOnly ? 'Masuk admin rental' : 'Masuk ke akunmu'}</h1><p class="muted small">${register ? 'Penyewa dapat mendaftar kapan saja. Akun admin hanya satu.' : 'Gunakan email dan kata sandi yang terdaftar.'}</p><form class="auth-form" id="role-auth-form" data-mode="${register ? 'register' : 'login'}" data-admin-only="${adminOnly ? 'true' : 'false'}">${register ? '<div class="field"><label for="auth-name">Nama lengkap</label><input class="input" id="auth-name" name="name" minlength="3" required autocomplete="name"></div><div class="field"><label for="auth-role">Jenis akun</label><select class="select" id="auth-role" name="role" required><option value="customer">Penyewa</option><option value="admin">Admin Rental</option></select></div>' : ''}<div class="field"><label for="auth-email">Email</label><input class="input" type="email" id="auth-email" name="email" required autocomplete="email" placeholder="nama@email.com" value="${adminOnly ? 'adminrental123@gmail.com' : ''}"></div><div class="field"><label for="auth-password">Kata sandi</label><input class="input" type="password" id="auth-password" name="password" required minlength="8" autocomplete="${register ? 'new-password' : 'current-password'}" placeholder="Masukkan kata sandi"></div><p class="small" data-auth-error role="alert" hidden></p>${register ? '<label class="checkline"><input type="checkbox" name="terms" required> Saya menyetujui syarat penggunaan dan kebijakan privasi.</label>' : ''}<button class="button button-primary" type="submit">${register ? 'Daftar sekarang' : 'Masuk'} ${icon('arrow_forward')}</button></form><p class="auth-switch">${register ? 'Sudah memiliki akun?' : 'Belum memiliki akun?'} <button class="text-button" type="button" data-go="${register ? 'login' : 'register'}">${register ? 'Masuk' : 'Daftar penyewa'}</button></p><div class="notice" style="margin-top:20px">Demo penyewa: barbarapavin3099@gmail.com · 12345678<br>Demo admin: adminrental123@gmail.com · 12345678910</div></div></div></div>`;

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
    const pending = state.events.filter((event) => event.status === 'Menunggu review');
    return `<div class="container page-wrap"><section class="organizer-hero"><div><span class="eyebrow" style="color:#ffb8d2">Portal komunitas & organizer</span><h1>Acara seru dimulai dari ditemukan.</h1><p>Pasang event, jangkau penyewa yang tepat, dan hubungkan pengunjung dengan kostum pilihan.</p><button class="button button-primary" data-action="scroll-submit" type="button">Pasang iklan event ${icon('arrow_forward')}</button></div><div class="organizer-hero-art" role="img" aria-label="Festival komunitas"></div></section><div class="organizer-grid"><section class="panel" id="organizer-submit"><h2>Pasang iklan event</h2><form id="organizer-form" class="stack"><div class="field"><label for="event-poster">Poster event *</label><input class="input" id="event-poster" type="file" name="poster" accept="image/*" required><div class="poster-preview" id="poster-preview">${icon('add_photo_alternate')}<span class="small">Pratinjau poster muncul di sini</span></div></div><div class="field"><label for="event-title">Nama event *</label><input class="input" id="event-title" name="title" required placeholder="Contoh: Jakarta Anime Gathering"></div><div class="form-grid"><div class="field"><label for="event-date">Tanggal *</label><input class="input" id="event-date" name="date" type="date" required></div><div class="field"><label for="event-location">Lokasi *</label><input class="input" id="event-location" name="location" required placeholder="Venue, kota"></div></div><div class="field"><label for="event-theme">Tema / fandom *</label><input class="input" id="event-theme" name="theme" required placeholder="Anime, fantasy, game, kimono..."></div><fieldset class="field" style="border:0;padding:0;margin:0"><legend class="field-label">Pilih tier promosi *</legend><div class="tier-options"><label class="tier-card"><input type="radio" name="tier" value="Gratis" checked><strong>Gratis</strong><small>Untuk event lokal dan komunitas non-profit.</small></label><label class="tier-card"><input type="radio" name="tier" value="Prabayar"><strong>Prabayar · Featured</strong><small>Diprioritaskan di slot unggulan. Biaya demo Rp250.000.</small></label></div></fieldset><div class="notice">${icon('info')} Simulasi AI OCR akan menampilkan hasil ekstraksi berdasarkan data yang kamu isi. Poster tidak dikirim ke server.</div><button class="button button-primary" type="submit">Kirim untuk ditinjau ${icon('arrow_forward')}</button></form></section><div class="stack"><section class="panel"><h2>Simulasi AI OCR & parser</h2><p class="muted small">Informasi event dicocokkan dengan input untuk menampilkan preview hasil ekstraksi.</p><div class="ai-result" id="ai-result"><div><small>Nama event</small><strong>Menunggu input</strong></div><div><small>Tanggal</small><strong>Menunggu input</strong></div><div><small>Lokasi</small><strong>Menunggu input</strong></div><div><small>Tema terdeteksi</small><strong>Menunggu input</strong></div></div><div class="section-heading" style="margin:20px 0 12px"><div><span class="eyebrow">Smart pairing</span><h2 style="font-size:1rem">Kostum terkait</h2></div></div><div id="organizer-matches" class="stack"><p class="muted small">Isi tema event untuk melihat pasangan kostum.</p></div></section><section class="panel"><h2>Status pengajuanmu</h2>${pending.length ? pending.map((event) => `<div class="admin-item"><img src="${escapeHtml(event.image)}" alt="Poster"><div class="admin-item-main"><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.date)} · ${escapeHtml(event.status)}</small></div><span class="status-pill">Menunggu</span></div>`).join('') : '<p class="muted small">Belum ada pengajuan yang menunggu review.</p>'}</section></div></div></div>`;
};

const adminMenu = [['overview', 'Dashboard Admin', 'dashboard'], ['inventory', 'Kelola Katalog', 'checkroom'], ['orders', 'Verifikasi Pesanan Masuk', 'fact_check'], ['events', 'Kurasi Iklan Event', 'campaign'], ['qr', 'Generator QR Code Event', 'qr_code_2']];
const adminShell = (content) => `<div class="admin-shell"><aside class="admin-sidebar"><div class="admin-label">Manajemen rental</div><nav class="admin-nav">${adminMenu.map(([section, label, symbol]) => `<a href="#admin/${section}" data-admin-section="${section}" class="${state.adminSection === section ? 'active' : ''}">${icon(symbol)} ${label}</a>`).join('')}<a href="#home" data-go="home">${icon('storefront')} Lihat toko</a></nav><div class="notice" style="margin:25px 3px 0">Mode demonstrasi admin. Data hanya tersimpan di browser ini.</div></aside><section class="admin-content">${content}</section></div>`;

const adminOverview = () => {
    const pending = state.orders.filter((order) => order.stage < 3).length;
    const active = state.orders.filter((order) => order.stage >= 3 && order.stage < 7).length;
    const revenue = state.orders.reduce((sum, order) => sum + Number(order.dp || 0), 0) + 12850000;
    return `<div class="admin-content-header"><div><span class="eyebrow">Ringkasan toko</span><h1>Selamat datang, Admin</h1></div><button class="button button-primary" data-action="add-product" type="button">${icon('add')} Tambah kostum</button></div><div class="stat-grid">${[['checkroom', 'Rental aktif', active + 12, '+8,2% bulan ini'], ['pending_actions', 'Verifikasi menunggu', pending + 4, 'Perlu ditinjau'], ['campaign', 'Pendapatan iklan event', money(3250000), '3 iklan unggulan'], ['payments', 'Total pendapatan', money(revenue), '+12,4% bulan ini']].map(([symbol, label, value, change]) => `<article class="stat-card"><div class="stat-card-top"><span>${label}</span><span class="stat-icon">${icon(symbol)}</span></div><strong>${value}</strong><span class="stat-change">${change}</span></article>`).join('')}</div><div class="admin-two-col"><section class="panel"><div class="admin-content-header" style="margin-bottom:10px"><h2>Pesanan terbaru</h2><button class="text-button" data-admin-section="orders">Semua pesanan</button></div>${state.orders.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Penyewa</th><th>Kostum</th><th>Status</th></tr></thead><tbody>${state.orders.slice(-5).reverse().map((order) => `<tr><td>${escapeHtml(order.customerName)}</td><td>${escapeHtml(productById(order.productId).name)}</td><td><span class="status-pill">${escapeHtml(orderStages[order.stage])}</span></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Pesanan terbaru akan muncul di sini.</p>'}</section><section class="panel"><div class="admin-content-header" style="margin-bottom:10px"><h2>Perlu perhatian</h2></div><div class="admin-list"><div class="admin-item"><span class="stat-icon">${icon('fact_check')}</span><div class="admin-item-main"><strong>${pending + 4} verifikasi pesanan</strong><small>Periksa data penyewa dan bukti DP</small></div></div><div class="admin-item"><span class="stat-icon">${icon('campaign')}</span><div class="admin-item-main"><strong>${state.events.filter((event) => event.status === 'Menunggu review').length} iklan event menunggu</strong><small>Tinjau poster dan hasil simulasi OCR</small></div></div></div></section></div><section class="panel" style="margin-top:16px"><div class="admin-content-header" style="margin-bottom:10px"><h2>Ringkasan stok kostum</h2><button class="text-button" data-admin-section="inventory">Kelola katalog</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Kostum</th><th>Kategori</th><th>Stok</th><th>Harga / hari</th><th>Status</th></tr></thead><tbody>${state.inventory.slice(0, 5).map((product) => `<tr><td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.category)}</td><td>${product.stock}</td><td>${money(product.price)}</td><td>${product.stock ? 'Tersedia' : 'Disewa'}</td></tr>`).join('')}</tbody></table></div></section>`;
};

const adminInventory = () => `<div class="admin-content-header"><div><span class="eyebrow">Produk & ketersediaan</span><h1>Manajemen katalog</h1></div><button class="button button-primary" data-action="add-product">${icon('add')} Tambah kostum</button></div><section class="panel"><div class="admin-toolbar"><span class="muted small">${state.inventory.length} item di katalog</span><input class="input" data-admin-search placeholder="Cari nama kostum" aria-label="Cari kostum"></div><div class="inventory-row inventory-header"><span></span><span>Kostum</span><span>Harga / hari</span><span>Stok</span><span>Deposit</span><span>Aksi</span></div>${state.inventory.map((product) => `<div class="inventory-row" data-inventory-row="${escapeHtml(product.name.toLowerCase())}"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)} · ${escapeHtml(product.series)}</small></span><span>${money(product.price)}</span><span>${product.stock}</span><span>${money(product.deposit)}</span><span><button class="button button-secondary button-small" data-action="edit-product" data-id="${escapeHtml(product.id)}">Edit</button><button class="button button-danger button-small" data-action="delete-product" data-id="${escapeHtml(product.id)}" aria-label="Hapus ${escapeHtml(product.name)}">${icon('delete')}</button></span></div>`).join('')}</section>`;

const adminOrders = () => `<div class="admin-content-header"><div><span class="eyebrow">Verifikasi penyewa & pembayaran</span><h1>Verifikasi pesanan</h1></div><span class="status-pill">${state.orders.filter((order) => order.stage < 3).length} menunggu</span></div>${state.orders.length ? state.orders.map((order) => { const product = productById(order.productId); const aiValid = Boolean(order.idSelfieImage && order.paymentProofImage); return `<article class="order-admin-card"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(order.customerName)} · ${escapeHtml(order.id)}</h3><p class="muted small">${escapeHtml(product.name)} · ${order.size} · ${order.days} hari</p><p class="small">${escapeHtml(order.socialPlatform || '')} ${escapeHtml(order.socialHandle || '')} · Penjamin: ${escapeHtml(order.guarantor || '-')}</p><span class="status-pill">${escapeHtml(orderStages[order.stage])}</span><p class="small">DP ${money(order.dp)} · Bukti: ${escapeHtml(order.paymentProofName || 'unggahan demo')}</p><span class="status-pill ${aiValid ? 'success' : 'danger'}">${icon(aiValid ? 'verified_user' : 'warning')} AI ${aiValid ? 'Dokumen & bukti valid' : 'Perlu pemeriksaan manual'}</span></div><div class="order-admin-actions"><button class="button button-secondary button-small" data-action="inspect-order" data-id="${escapeHtml(order.id)}">Detail penyewa</button><button class="button button-primary button-small" data-action="advance-order" data-id="${escapeHtml(order.id)}">${order.stage < 2 ? 'Setujui verifikasi' : order.stage < 7 ? 'Tahap berikutnya' : 'Selesai'}</button><button class="button button-danger button-small" data-action="reject-order" data-id="${escapeHtml(order.id)}">Tolak</button></div></article>`; }).join('') : '<div class="empty-state">Belum ada pesanan penyewa.</div>'}`;

const adminShipping = () => `<div class="admin-content-header"><div><span class="eyebrow">Fulfillment</span><h1>Pengiriman & retur</h1></div></div>${state.orders.length ? state.orders.map((order) => { const product = productById(order.productId); return `<article class="order-admin-card"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(order.id)} · ${escapeHtml(order.customerName)}</h3><p class="muted small">${escapeHtml(product.name)} · Jadwal sewa: ${escapeHtml(order.rentalDate || 'Belum diatur')}</p><span class="status-pill ${order.stage >= 5 ? 'success' : ''}">${escapeHtml(orderStages[order.stage])}</span><p class="small">${order.trackingNumber ? `JNE Express · Resi ${escapeHtml(order.trackingNumber)}` : 'Nomor resi belum ditambahkan'}</p></div><div class="order-admin-actions"><button class="button button-secondary button-small" data-action="shipping-order" data-id="${escapeHtml(order.id)}">${order.trackingNumber ? 'Ubah resi' : 'Tambah resi'}</button><button class="button button-primary button-small" data-action="advance-order" data-id="${escapeHtml(order.id)}">${order.stage < 7 ? 'Update status' : 'Selesai'}</button><button class="button button-soft button-small" data-action="refund-deposit" data-id="${escapeHtml(order.id)}">Refund deposit</button></div></article>`; }).join('') : '<div class="empty-state">Belum ada pesanan untuk diproses.</div>'}`;

const adminEvents = () => {
    const submissions = state.events.filter((event) => event.status !== 'Disetujui' || event.databaseId);
    return `<div class="admin-content-header"><div><span class="eyebrow">Kurasi promosi komunitas</span><h1>Manajemen iklan event</h1></div><button class="button button-secondary" data-go="organizer">Lihat portal organizer</button></div>${submissions.length ? submissions.map((event) => {
        const matches = matchingProducts(`${event.theme} ${event.title}`);
        return `<article class="order-admin-card"><img src="${escapeHtml(event.image)}" alt="Poster ${escapeHtml(event.title)}"><div><h3>${escapeHtml(event.title)}</h3><p class="muted small">${escapeHtml(event.date)} · ${escapeHtml(event.location)}</p><p class="small">Simulasi OCR · Tema: ${escapeHtml(event.theme)} · Tier ${escapeHtml(event.tier)}</p><span class="status-pill ${event.status === 'Disetujui' ? 'success' : ''}">${escapeHtml(event.status)}</span><div class="ai-pairing-preview"><strong>${icon('auto_awesome')} Rekomendasi kostum sebelum tayang</strong><span>${matches.map((product) => escapeHtml(product.name)).join(' · ') || 'Belum ada kostum yang cocok'}</span></div>${event.paymentProofImage ? `<a class="text-button small" href="${escapeHtml(event.paymentProofImage)}" target="_blank" rel="noreferrer">Lihat bukti bayar · ${escapeHtml(event.paymentProofName)}</a>` : ''}</div><div class="order-admin-actions">${event.status === 'Menunggu review' ? `<button class="button button-primary button-small" data-action="approve-event" data-id="${escapeHtml(event.id)}">ACC & Tayangkan</button><button class="button button-danger button-small" data-action="reject-event" data-id="${escapeHtml(event.id)}">Tolak</button>` : `<button class="button button-secondary button-small" data-action="event-pairing" data-id="${escapeHtml(event.id)}">Lihat pairing AI</button>`}</div></article>`;
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

const chatWidget = () => `<section class="chat-widget ${state.chatOpen ? 'chat-open' : ''}" aria-label="Asisten AI Let'sCosplay"><div class="chat-panel" ${state.chatOpen ? '' : 'hidden'}><header><div><strong>Asisten AI Let'sCosplay</strong><small>Aturan, stok kostum, dan jadwal event</small></div><button class="icon-button" type="button" data-action="chat-close" aria-label="Tutup chatbot">${icon('close')}</button></header><div class="chat-messages" id="chat-messages">${state.chatMessages.length ? state.chatMessages.map((message) => `<p class="chat-message ${message.role}">${escapeHtml(message.text)}</p>`).join('') : '<p class="chat-message bot">Halo! Tanyakan aturan rental, ketersediaan kostum, atau jadwal event.</p>'}</div><form id="chat-form"><input class="input" name="message" placeholder="Tulis pertanyaan..." aria-label="Pertanyaan untuk chatbot" required><button class="button button-primary" type="submit" aria-label="Kirim pertanyaan">${icon('send')}</button></form></div><button class="chat-launcher" type="button" data-action="chat-toggle" aria-label="Buka Asisten AI">${icon(state.chatOpen ? 'close' : 'smart_toy')}<span>${state.chatOpen ? 'Tutup' : 'Tanya AI'}</span></button></section>`;

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

const persistOrders = () => writeStorage(STORAGE_KEYS.orders, state.orders);
const persistInventory = () => writeStorage(STORAGE_KEYS.inventory, state.inventory);
const persistEvents = () => writeStorage(STORAGE_KEYS.events, state.events.filter((event) => !event.databaseId));

const checkoutTotals = () => {
    const product = { ...productById(state.productId) };
    product.deposit = depositForProduct(product);
    const addons = state.addons.reduce((total, addon) => total + (addon === 'wig' ? 35000 : 15000), 0);
    return { product, total: (product.price + addons) * state.days + 18000 + product.deposit };
};

const checkoutAssistant = () => `<section class="form-section ai-checkout-panel"><h2><span class="section-index">AI</span> Asisten pintar pemesanan</h2><div class="form-grid"><div class="field"><label for="fit-height">Tinggi badan (cm) · opsional</label><input class="input" id="fit-height" type="number" min="100" max="230" placeholder="Contoh: 165"></div><div class="field"><label for="fit-weight">Berat badan (kg) · opsional</label><input class="input" id="fit-weight" type="number" min="25" max="250" placeholder="Contoh: 58"></div><div class="field span-2"><label for="fit-notes">Catatan kecocokan kostum</label><input class="input" id="fit-notes" placeholder="Contoh: ingin lebih longgar di bagian bahu"></div></div><div class="ai-result" style="margin-top:14px"><div><small>Rekomendasi ukuran AI</small><strong id="ai-fit-recommendation">Lengkapi ukuran badan untuk rekomendasi.</strong></div><div><small>Skor kepercayaan demo</small><strong id="ai-risk-score">Skor awal: 55/100</strong></div></div><div id="ai-deposit-advice" class="notice" style="margin-top:12px">Deposit standar berlaku sampai riwayat rental diverifikasi.</div><div id="ai-document-scan" class="deposit-note" style="margin-top:12px">${icon('document_scanner')} Verifikasi AI menunggu unggahan selfie dan KTP.</div><p class="muted small" style="margin-bottom:0">Pemindaian wajah, kejelasan dokumen, dan skor risiko di sini adalah simulasi lokal, bukan verifikasi identitas nyata.</p></section>`;

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

    const previousRental = app.querySelector('[data-previous-rental]:checked')?.value;
    const previousStore = String(app.querySelector('#previous-store')?.value || '').trim();
    const completedOrders = state.orders.filter((order) => order.stage >= 7).length;
    state.trustScore = previousRental === 'yes' && previousStore.length > 2 ? Math.min(98, 88 + completedOrders * 2) : previousRental === 'yes' ? 74 : previousRental === 'no' ? 58 : 55;
    const risk = app.querySelector('#ai-risk-score');
    if (risk) risk.textContent = `Skor kepercayaan: ${state.trustScore}/100`;
    const advice = app.querySelector('#ai-deposit-advice');
    if (advice) advice.textContent = state.trustScore >= 85 ? `Riwayat terindikasi baik. Deposit demo diringankan 50% menjadi ${money(depositForProduct(productById(state.productId)))}.` : 'Deposit 50% wajib digunakan pada pesanan ini sampai riwayat rental terverifikasi.';

    const file = app.querySelector('#id-selfie')?.files?.[0];
    const scanner = app.querySelector('#ai-document-scan');
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
    const proofMarkup = `<div class="field" id="event-payment-proof-wrap" hidden><label for="event-payment-proof">Bukti pembayaran paket promosi *</label><input class="input" id="event-payment-proof" type="file" name="paymentProof" accept="image/*"><small class="muted">Wajib untuk QR prabayar. File diproses lokal dalam demo.</small></div>`;
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

const setOrderStage = (id, delta = 1, exact = null) => {
    const order = state.orders.find((item) => item.id === id);
    if (!order) return;
    order.stage = exact === null ? Math.min(7, Math.max(0, order.stage + delta)) : exact;
    if (order.stage >= 7) order.bucket = 'Selesai';
    else if (order.stage >= 5) order.bucket = 'Disewa';
    else if (order.stage >= 2) order.bucket = 'Diproses';
    else order.bucket = 'Menunggu verifikasi';
    persistOrders();
    render();
};

const matchingProducts = (text) => {
    const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);
    return state.inventory.map((product) => ({ product, score: product.themes.filter((themeWord) => words.some((word) => word.includes(themeWord) || themeWord.includes(word))).length })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 2).map(({ product }) => product);
};

const answerChatQuestion = (question) => {
    const text = question.toLowerCase();
    if (/aturan|dp|deposit|bayar|pembayaran|retur|sewa/.test(text)) return 'DP minimal 50% dari total pesanan. Sisa pembayaran dilunasi paling lambat H-1. Deposit dikembalikan setelah kostum retur dan lolos pemeriksaan. Detail ada di halaman Rules Rental.';
    if (/event|jadwal|acara|komunitas/.test(text)) {
        const events = state.events.filter((event) => event.status === 'Disetujui').slice(0, 3);
        return events.length ? `Event mendatang: ${events.map((event) => `${event.title} — ${event.date} (${event.location})`).join('; ')}.` : 'Belum ada event komunitas yang tayang.';
    }
    const matches = matchingProducts(text).filter((product) => product.name.toLowerCase().includes(text) || product.series.toLowerCase().includes(text) || product.origin?.toLowerCase().includes(text));
    if (matches.length) return matches.map((product) => `${product.name}: ${product.stock > 0 ? `tersedia, ukuran ${product.size.join(', ')}` : 'sedang disewa'}, ${money(product.price)}/hari.`).join(' ');
    if (/stok|tersedia|ukuran|kostum|harga|raiden|nezuko|gojo|miku|anya|alhaitham/.test(text)) {
        const products = state.inventory.filter((product) => product.stock > 0).slice(0, 4);
        return `Kostum yang tersedia: ${products.map((product) => `${product.name} (${product.size.join('/')}, ${money(product.price)}/hari)`).join('; ')}.`;
    }
    return 'Saya bisa membantu soal Rules Rental, harga dan ukuran kostum, ketersediaan, serta jadwal event komunitas.';
};

const openProductModal = (product = null) => {
    const editing = Boolean(product);
    const item = product || { name: '', series: '', category: 'Anime', price: 80000, deposit: 250000, stock: 1, size: ['S', 'M', 'L'], image: '', description: '' };
    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><div class="admin-content-header"><h2 id="product-modal-title">${editing ? 'Edit kostum' : 'Tambah kostum'}</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><form id="product-form" class="stack"><input type="hidden" name="id" value="${escapeHtml(item.id || '')}"><div class="field"><label>Nama kostum</label><input class="input" name="name" required value="${escapeHtml(item.name)}"></div><div class="form-grid"><div class="field"><label>Serial / fandom</label><input class="input" name="series" required value="${escapeHtml(item.series)}"></div><div class="field"><label>Kategori</label><select class="select" name="category">${categories.map((category) => `<option ${category.name === item.category ? 'selected' : ''}>${category.name}</option>`).join('')}</select></div><div class="field"><label>Harga sewa / hari</label><input class="input" name="price" type="number" min="1000" required value="${item.price}"></div><div class="field"><label>Deposit</label><input class="input" name="deposit" type="number" min="0" required value="${item.deposit}"></div><div class="field"><label>Jumlah stok</label><input class="input" name="stock" type="number" min="0" required value="${item.stock}"></div><div class="field"><label>Ukuran tersedia</label><input class="input" name="size" required value="${escapeHtml(item.size.join(', '))}" placeholder="S, M, L"></div></div><div class="field"><label>URL foto produk</label><input class="input" name="image" type="url" value="${escapeHtml(item.image)}" placeholder="https://..."></div><div class="field"><label>Deskripsi</label><textarea class="textarea" name="description">${escapeHtml(item.description)}</textarea></div><button class="button button-primary" type="submit">${editing ? 'Simpan perubahan' : 'Tambah ke katalog'}</button></form></section></div>`;
    render();
};

app.addEventListener('click', (event) => {
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
                state.session = null;
                localStorage.removeItem(STORAGE_KEYS.session);
                navigate('home');
                showToast('Kamu sudah keluar dari akun.');
                break;
            case 'favorite': action.classList.toggle('is-favorite'); action.innerHTML = icon(action.classList.contains('is-favorite') ? 'favorite' : 'favorite'); showToast('Kostum disimpan ke favorit demo.'); break;
            case 'checkout': navigate('checkout'); break;
            case 'reset-filters': state.category = ''; state.search = ''; state.maxPrice = 200000; state.sizeFilters = []; state.onlyAvailable = true; state.catalogPage = 1; render(); break;
            case 'mobile-filters': document.querySelector('#filter-panel')?.classList.toggle('collapsed'); break;
            case 'scroll-submit': document.querySelector('#organizer-submit')?.scrollIntoView({ behavior: 'smooth' }); break;
            case 'reset-event-search': state.eventSearch = { query: '', location: '', tier: '', active: false }; render(); break;
            case 'add-product': openProductModal(); break;
            case 'edit-product': openProductModal(productById(id)); break;
            case 'delete-product':
                if (confirm('Hapus kostum ini dari katalog demo?')) { state.inventory = state.inventory.filter((product) => product.id !== id); persistInventory(); render(); showToast('Kostum dihapus dari katalog.'); }
                break;
            case 'advance-order': setOrderStage(id); break;
            case 'reject-order': setOrderStage(id, 0, 0); showToast('Pesanan dikembalikan ke tahap verifikasi.'); break;
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
                if (order && tracking !== null) { order.trackingNumber = tracking; order.stage = Math.max(order.stage, 4); order.bucket = 'Diproses'; persistOrders(); render(); showToast('Nomor resi tersimpan.'); }
                break;
            }
            case 'refund-deposit': setOrderStage(id, 0, 7); showToast('Deposit ditandai sudah dikembalikan.'); break;
            case 'approve-event': {
                const item = state.events.find((candidate) => candidate.id === id);
                if (item?.tier === 'Prabayar' && !item.paymentProofImage) { showToast('Bukti pembayaran prabayar belum tersedia.'); break; }
                if (item) { item.status = 'Disetujui'; item.featured = item.tier === 'Prabayar'; persistEvents(); render(); showToast('Event disetujui dan dipublikasikan.'); }
                break;
            }
            case 'reject-event': {
                const item = state.events.find((candidate) => candidate.id === id);
                if (item) { item.status = 'Ditolak'; persistEvents(); render(); showToast('Pengajuan event ditolak.'); }
                break;
            }
            case 'event-pairing': navigate('event', id); break;
            case 'close-modal': if (!action.classList.contains('modal-backdrop') || event.target === action) { state.modal = null; render(); } break;
            case 'forgot': showToast('Demo: silakan hubungi admin untuk reset kata sandi.'); break;
            case 'menu': document.querySelector('.main-nav')?.classList.toggle('menu-open'); break;
            case 'chat-toggle': state.chatOpen = true; render(); break;
            case 'chat-close': state.chatOpen = false; render(); break;
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
        wrap.hidden = !show;
        input.required = show;
        updateAIAssistant();
    }
    if (event.target.matches('#id-selfie')) updateAIAssistant();
    if (event.target.matches('[data-action="price-range"]')) { state.maxPrice = Number(event.target.value); state.catalogPage = 1; render(); }
});

app.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const formId = form.getAttribute('id');
    form.querySelectorAll('input[type="tel"]').forEach((input) => { input.pattern = '\\+?[0-9]{9,15}'; });
    if (!form.reportValidity()) return;

    if (formId === 'chat-form') {
        const question = String(new FormData(form).get('message') || '').trim();
        state.chatMessages.push({ role: 'user', text: question }, { role: 'bot', text: answerChatQuestion(question) });
        state.chatOpen = true;
        render();
        requestAnimationFrame(() => { const messages = document.querySelector('#chat-messages'); if (messages) messages.scrollTop = messages.scrollHeight; });
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
        const minimum = Math.ceil(total * .5);
        if (dp < minimum || dp > total) { showToast(`DP harus antara ${money(minimum)} dan ${money(total)}.`); return; }
        const previousStore = String(values.get('previousStore') || '');
        if (values.get('previousRental') === 'yes' && !previousStore.trim()) { document.querySelector('#previous-store').focus(); return; }
        const order = {
            id: `LC-${Date.now().toString().slice(-8)}`,
            customerEmail: state.session.email,
            productId: product.id,
            size: state.size,
            days: state.days,
            rentalDate: formatDate(state.rentalDate),
            deposit: product.deposit,
            total,
            dp,
            trustScore: state.trustScore,
            stage: 0,
            bucket: 'Menunggu verifikasi',
            customerName: String(values.get('name')),
            phone: String(values.get('phone')),
            address: String(values.get('address')),
            socialPlatform: String(values.get('socialPlatform')),
            socialHandle: String(values.get('socialHandle')),
            guarantor: String(values.get('guarantor')),
            idSelfieName: values.get('idSelfie')?.name || '',
            idSelfieImage: await compressImage(values.get('idSelfie')),
            paymentProofName: values.get('paymentProof')?.name || '',
            paymentProofImage: await compressImage(values.get('paymentProof')),
            paymentMethod: String(values.get('paymentMethod')),
            previousStore,
            createdAt: new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date()),
        };
        state.orders.push(order);
        persistOrders();
        navigate('tracking', order.id);
        showToast('Pesanan demo berhasil dibuat.');
    }

    if (formId === 'role-auth-form') {
        const values = new FormData(form);
        const errorElement = form.querySelector('[data-auth-error]');
        const showAuthError = (message) => {
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.hidden = false;
                errorElement.className = 'small auth-error';
            }
        };
        const email = String(values.get('email')).trim().toLowerCase();
        const password = String(values.get('password'));

        if (form.dataset.mode === 'register') {
            const role = String(values.get('role'));
            if (role === 'admin' && state.accounts.some((account) => account.role === 'admin')) {
                showAuthError('Akun Admin Rental sudah terdaftar. Kepemilikan ganda tidak diizinkan untuk keamanan sistem.');
                return;
            }
            if (state.accounts.some((account) => account.email.toLowerCase() === email)) {
                showAuthError('Email sudah terdaftar. Gunakan email lain atau masuk ke akunmu.');
                return;
            }
            const account = { email, password, name: String(values.get('name')).trim(), role };
            state.accounts.push(account);
            writeStorage(STORAGE_KEYS.accounts, state.accounts);
            state.session = { email: account.email, name: account.name, role: account.role };
            writeStorage(STORAGE_KEYS.session, state.session);
            
            if (role === 'admin') {
                state.adminSection = 'overview';
                location.hash = '#admin/overview';
                navigate('admin');
            } else {
                location.hash = '#home';
                navigate('home');
            }
            showToast(role === 'admin' ? 'Akun admin demo berhasil dibuat.' : 'Akun penyewa berhasil dibuat.');
            return;
        }

        const account = state.accounts.find((item) => item.email.toLowerCase() === email && item.password === password);
        if (!account || (form.dataset.adminOnly === 'true' && account.role !== 'admin')) {
            showAuthError('Email atau kata sandi tidak sesuai.');
            return;
        }
        
        state.session = { email: account.email, name: account.name, role: account.role };
        writeStorage(STORAGE_KEYS.session, state.session);

        if (account.role === 'admin') {
            state.adminSection = 'overview';
            location.hash = '#admin/overview';
            navigate('admin');
            showToast('Berhasil masuk sebagai Admin Rental.');
        } else {
            location.hash = '#home';
            navigate('home');
            showToast('Berhasil masuk sebagai Penyewa.');
        }
        return;
    }

    if (formId === 'organizer-form') {
        const values = new FormData(form);
        const title = String(values.get('title')).trim();
        const themeText = String(values.get('theme')).trim();
        const dateValue = String(values.get('date'));
        const poster = form.elements.poster.files?.[0];
        const paymentProof = form.elements.paymentProof?.files?.[0];
        const event = {
            id: `event-${Date.now()}`,
            title,
            date: dateValue ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${dateValue}T00:00:00`)) : 'Tanggal belum ditentukan',
            location: String(values.get('location')).trim(),
            theme: themeText,
            category: 'Komunitas',
            tier: String(values.get('tier')),
            termsAccepted: values.get('promotionTerms') === 'on',
            status: 'Menunggu review',
            image: poster ? await compressImage(poster) : seedEvents[0].image,
            paymentProofName: paymentProof?.name || '',
            paymentProofImage: paymentProof ? await compressImage(paymentProof) : '',
            description: `Event bertema ${themeText} di ${String(values.get('location')).trim()}.`,
            featured: false,
        };
        state.events.unshift(event);
        persistEvents();
        render();
        showToast('Pengajuan demo terkirim untuk ditinjau admin.');
    }

    if (formId === 'product-form') {
        const values = new FormData(form);
        const payload = Object.fromEntries(values);

        fetch('/api/costumes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(response => {
            showToast(response.message || 'Kostum berhasil disimpan ke database!');
            state.modal = null;
            // Ambil ulang data katalog terbaru dari database
            return fetch('/api/costumes');
        })
        .then(res => res.json())
        .then(data => {
            state.inventory = data;
            state.adminSection = 'inventory';
            render();
        })
        .catch(err => console.error('Gagal simpan kostum:', err));
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

// AMBIL DATA REAL DARI DATABASE LARAVEL VIA API
fetch('/api/costumes')
    .then(res => res.json())
    .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
            state.inventory = data;
            // Set productId ke id kostum pertama di DB (misal ID 1 dari MySQL)
            state.productId = data[0].id; 
        }
        render();
    })
    .catch(err => {
        console.error('Gagal mengambil data dari database:', err);
        render();
    });