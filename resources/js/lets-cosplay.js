import QRCode from 'qrcode';

const STORAGE_KEYS = {
    theme: 'letscosplay-theme',
    session: 'letscosplay-session',
    chatSession: 'letscosplay-chat-session',
    chatHistory: 'letscosplay-chat-history',
    favorites: 'letscosplay-favorites',
    qrBase: 'letscosplay-qr-base',
    submissions: 'letscosplay-my-event-submissions',
    rules: 'letscosplay-rules-accepted',
};

// Aset gambar lokal (public/images)
const IMAGE_ASSETS = {
    logo: '/images/logo.png',
    hero: '/images/event.jpeg',
    eventStrip: '/images/event.jpeg',
    organizerHero: '/images/event.jpeg',
    // Cadangan inline untuk halaman Masuk/Daftar (gambar utama diatur lewat CSS .auth-art::before)
    login: '/images/masuk.jpg',
    register: '/images/daftar.jpg',
};
// Foto kostum lokal: dipakai sebagai cadangan bila gambar produk gagal dimuat (dicocokkan dari nama/alt gambar).
const CHARACTER_IMAGES = [
    { match: /gojo/i, src: '/images/gojo.jpeg' },
    { match: /miku/i, src: '/images/miku.jpeg' },
    { match: /nezuko/i, src: '/images/nezuko.jpeg' },
    { match: /raiden|shogun/i, src: '/images/raidenshogun.jpeg' },
];
const localCharacterImage = (text) => CHARACTER_IMAGES.find((item) => item.match.test(String(text || '')))?.src || '';
const brandLogoMarkup = `<span class="brand-mark" style="display:inline-grid;place-items:center;overflow:hidden;padding:3px;box-sizing:border-box;background:#fff;border:1px solid rgba(128,128,128,.35)"><img src="${IMAGE_ASSETS.logo}" alt="Let's Cosplay" style="display:block;width:100%;height:100%;object-fit:contain"></span>`;
(() => {
    let favicon = document.querySelector('link[rel~="icon"]');
    if (!favicon) { favicon = document.createElement('link'); favicon.rel = 'icon'; document.head.appendChild(favicon); }
    favicon.type = 'image/png';
    favicon.href = IMAGE_ASSETS.logo;
})();

const seedProducts = [];

const seedEvents = [
    { id: 'e1', title: 'Jakarta Cosplay Parade 2026', date: '21 November 2026', location: 'M Bloc Space, Jakarta', theme: 'anime fantasy parade', category: 'Komunitas', tier: 'Gratis', status: 'Disetujui', image: IMAGE_ASSETS.eventStrip, description: 'Parade kostum dan panggung komunitas untuk semua fandom. Ada mini competition dan photo walk.', featured: true },
    { id: 'e2', title: 'Nusantara Pop Culture Fest', date: '5 Desember 2026', location: 'JCC Senayan, Jakarta', theme: 'game fantasy pop culture', category: 'Unggulan', tier: 'Prabayar', status: 'Disetujui', image: IMAGE_ASSETS.eventStrip, description: 'Festival pop culture, cosplay showcase, artist alley, dan meet-and-greet bersama kreator.', featured: true },
    { id: 'e3', title: 'Malam Yokai: Cosplay Photo Walk', date: '12 Desember 2026', location: 'Kota Tua, Jakarta', theme: 'japan kimono yokai', category: 'Komunitas', tier: 'Gratis', status: 'Disetujui', image: IMAGE_ASSETS.eventStrip, description: 'Jelajah malam bertema folklore Jepang dengan sesi foto bersama komunitas.', featured: false },
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
const fileToDataUrl = (file, type, maxBytes) => new Promise((resolve, reject) => {
    if (!file || file.type !== type) return reject(new Error(`File harus berformat ${type === 'application/pdf' ? 'PDF' : 'yang didukung'}.`));
    if (file.size > maxBytes) return reject(new Error(`Ukuran ${type === 'application/pdf' ? 'PDF' : 'file'} maksimal ${Math.round(maxBytes / 1024 / 1024)} MB.`));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('File tidak dapat dibaca.'));
    reader.readAsDataURL(file);
});
// Riwayat chat bertahan selama tab terbuka (sessionStorage), jadi tidak hilang saat pindah halaman / refresh.
const CHAT_HISTORY_LIMIT = 30;
const readChatHistory = () => {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.chatHistory) || '[]');
        return (Array.isArray(saved) ? saved : [])
            .filter((m) => m && (m.role === 'user' || m.role === 'bot') && typeof m.text === 'string')
            .slice(-CHAT_HISTORY_LIMIT);
    } catch { return []; }
};
const saveChatHistory = () => {
    try {
        sessionStorage.setItem(STORAGE_KEYS.chatHistory, JSON.stringify(
            state.chatMessages.slice(-CHAT_HISTORY_LIMIT).map(({ role, text, suggestions, costumeIds }) => ({ role, text, suggestions, costumeIds })),
        ));
    } catch { /* penyimpanan penuh / dinonaktifkan: abaikan */ }
};
const clearChatHistory = () => { try { sessionStorage.removeItem(STORAGE_KEYS.chatHistory); } catch {} };
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
    accountTab: 'profile',
    eventFilter: null,
    eventOptions: null,
    organizerToken: null,
    organizerTokenTier: null,
    organizerAiBusy: false,
    organizerChatMessages: [],
    organizerChatOpen: false,
    organizerFlow: null,
    favorites: readStorage(STORAGE_KEYS.favorites, []).map(String),
    sizeFilters: [],
    onlyAvailable: true,
    onlyFavorites: false,
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
    chatMessages: readChatHistory(),
    chatRequestId: 0,
    chatLoading: false,
    // Pilihan ukuran & jumlah (boleh beberapa ukuran dalam satu pesanan) + pesanan kelompok
    sizeQty: {},
    cartProductId: null,
    group: { enabled: false, name: '', members: '' },
    rulesLocal: readStorage(STORAGE_KEYS.rules, false) === true,
    rulesReturn: false,
    // Ulasan, verifikasi KTP, dan grafik admin
    reviews: {},
    reviewsLoading: {},
    adminReviews: null,
    adminReviewFilter: 'all',
    identities: null,
    identitiesLoading: false,
    ktpFilter: 'pending',
    modalImages: [],
    chartPeriod: 'all',
    chartMetric: 'units',
    // Rekening / e-wallet tujuan pembayaran toko (dikelola admin)
    paymentAccounts: { bank: [], ewallet: [], returnAddress: { recipient: '', phone: '', address: '' } },
    paymentDraft: null,
    adminOrderFilter: 'Semua',
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
const normalizeCostume = (item) => {
    const size = asList(item.size);
    const rawStock = item.size_stock && typeof item.size_stock === 'object' ? item.size_stock : null;
    const total = Number(item.stock ?? 0);
    const sizeStock = Object.fromEntries(size.map((label, index) => [label, Number(rawStock ? (rawStock[label] ?? 0) : (index === 0 ? total : 0))]));
    const gallery = asList(item.images).filter(Boolean);
    return {
        ...item, id: String(item.id), size, sizeStock, images: gallery.length ? gallery : [item.image].filter(Boolean),
        accessories: asList(item.accessories), themes: asList(item.themes), price: Number(item.price), deposit: Number(item.deposit),
        stock: Object.values(sizeStock).reduce((sum, qty) => sum + qty, 0), rating: Number(item.rating ?? 5), reviews: Number(item.reviews ?? 0),
    };
};
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
    state.chatMessages = [];
    clearChatHistory();
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
// ---- Rekening bank / e-wallet toko ----
const MAX_PAYMENT_ROWS = 5;
const normalizePaymentRows = (rows) => (Array.isArray(rows) ? rows : []).map((row) => ({
    provider: String(row?.provider ?? '').trim(),
    number: String(row?.number ?? '').trim(),
    holder: String(row?.holder ?? '').trim(),
}));
const normalizeReturnAddress = (value) => ({
    recipient: String(value?.recipient ?? '').trim(),
    phone: String(value?.phone ?? '').trim(),
    address: String(value?.address ?? '').trim(),
});
const normalizePaymentAccounts = (data) => ({ bank: normalizePaymentRows(data?.bank), ewallet: normalizePaymentRows(data?.ewallet), returnAddress: normalizeReturnAddress(data?.returnAddress) });
const copyReturnAddress = () => {
    const { recipient, phone, address } = state.paymentAccounts.returnAddress || {};
    const text = [recipient, phone, address].filter(Boolean).join('\n');
    if (!text) { showToast('Alamat retur belum diatur admin.'); return; }
    try { navigator.clipboard?.writeText(text)?.catch?.(() => {}); } catch { /* abaikan */ }
    showToast('Alamat retur disalin.');
};
const returnAddressMarkup = () => {
    const { recipient, phone, address } = state.paymentAccounts.returnAddress || {};
    if (!recipient && !phone && !address) return `<div class="deposit-note" style="margin-top:12px">${icon('warning')} Alamat tujuan retur belum diatur admin. Hubungi admin sebelum mengirim paket.</div>`;
    return `<div class="payment-account" style="margin-top:12px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 12px;border:1px solid rgba(128,128,128,.35);border-radius:12px"><div><strong class="small">${icon('location_on')} Alamat Tujuan Pengembalian</strong><div><strong>${escapeHtml(recipient)}</strong></div><div class="small">${escapeHtml(phone)}</div><div class="small" style="white-space:pre-line">${escapeHtml(address)}</div></div><button class="button button-soft button-small" type="button" data-action="copy-return-address">${icon('content_copy')} Salin Alamat</button></div>`;
};
const loadPaymentAccounts = async () => {
    try {
        state.paymentAccounts = normalizePaymentAccounts(await api('/payment-accounts'));
    } catch { /* rekening tetap seperti sebelumnya */ }
};
const refreshAll = () => Promise.all([loadCatalog(), loadEvents(), loadOrders(), loadPaymentAccounts()]);
// Nilai radio bisa "Dompet digital" karena localizeCopy() mengganti teks "E-wallet" di markup halaman.
const paymentKind = (method) => {
    const value = String(method || '').trim();
    if (value === 'Transfer bank') return 'bank';
    if (value === 'E-wallet' || value === 'Dompet digital') return 'ewallet';
    return '';
};
const paymentMethodLabel = (method) => (paymentKind(method) === 'ewallet' ? 'E-wallet' : paymentKind(method) === 'bank' ? 'Transfer bank' : String(method || ''));
const paymentDestinationMarkup = (method) => {
    const kind = paymentKind(method);
    if (!kind) return '<p class="muted small" style="margin:0">Pilih metode pembayaran untuk melihat tujuan transfer.</p>';
    const heading = kind === 'bank' ? 'Rekening bank tujuan' : 'E-wallet tujuan';
    const accounts = state.paymentAccounts[kind].filter((account) => account.provider || account.number);
    if (!accounts.length) return `<p class="muted small" style="margin:0">${heading} belum tersedia. Silakan hubungi admin sebelum membayar.</p>`;
    return `<strong class="small">${icon(kind === 'bank' ? 'account_balance' : 'account_balance_wallet')} ${heading}</strong>${accounts.map((account) => `<div class="payment-account" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 12px;border:1px solid rgba(128,128,128,.35);border-radius:12px"><div><strong>${escapeHtml(account.provider)}</strong><div class="small" style="letter-spacing:.04em">${escapeHtml(account.number)}</div><small class="muted">a.n. ${escapeHtml(account.holder)}</small></div><button class="button button-soft button-small" type="button" data-action="copy-account" data-number="${escapeHtml(account.number)}" aria-label="Salin nomor ${escapeHtml(account.provider)}">${icon('content_copy')} Salin</button></div>`).join('')}`;
};
const copyAccountNumber = (number) => {
    try { navigator.clipboard?.writeText(String(number || ''))?.catch?.(() => {}); } catch { /* abaikan */ }
    showToast('Nomor disalin.');
};
const imageStockLine = (product) => product.stock > 0 ? `Stok ${product.stock}` : 'Stok habis';

const priceCeiling = () => Math.max(200000, ...state.inventory.map((item) => Math.ceil(item.price / 5000) * 5000));
const productById = (id) => state.inventory.find((product) => String(product.id) === String(id)) || state.inventory[0] || {
    id: '', name: 'Kostum', price: 0, deposit: 0, image: '', size: ['M'], category: '', series: '', description: '', accessories: [], rating: 5, reviews: 0, stock: 0, sizeStock: {}, images: []
};
const depositForProduct = (product) => Math.ceil(product.deposit * (state.trustScore >= 85 ? 0.5 : 1));

const FALLBACK_IMG = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><rect width="600" height="800" fill="#281824"/><text x="300" y="400" fill="#ff4799" font-family="sans-serif" font-size="30" text-anchor="middle">Foto belum tersedia</text></svg>')}`;
const ADDON_PRICE = { wig: 35000, care: 15000 };
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const MAX_GALLERY = 5;
const sizeStockOf = (product, size) => Number(product.sizeStock?.[size] ?? 0);
const stockTone = (qty) => (qty < 1 ? 'out' : qty <= 2 ? 'low' : 'ok');

// Keranjang pesanan: { ukuran: jumlah }. Selalu dibatasi stok per ukuran.
const syncCart = (product) => {
    if (state.cartProductId !== String(product.id)) {
        state.cartProductId = String(product.id);
        const first = product.size.find((label) => sizeStockOf(product, label) > 0);
        state.sizeQty = first ? { [first]: 1 } : {};
    }
    for (const [label, qty] of Object.entries(state.sizeQty)) {
        const max = sizeStockOf(product, label);
        if (!product.size.includes(label) || max < 1) delete state.sizeQty[label];
        else if (qty > max) state.sizeQty[label] = max;
    }
};
const cartItems = (product) => { syncCart(product); return Object.entries(state.sizeQty).filter(([, qty]) => qty > 0).map(([size, qty]) => ({ size, qty })); };
const cartUnits = (product) => cartItems(product).reduce((sum, item) => sum + item.qty, 0);
const cartSizeLabel = (product) => cartItems(product).map((item) => `${item.size}×${item.qty}`).join(', ') || '-';
// Harga dihitung per unit kostum; rumus sama dengan server.
const shippingForAddress = (address = '') => {
    const clean = String(address || '').trim().toLowerCase();
    if (!clean) return { cost: 15000, label: 'Ongkir default (Kota Palembang)' };
    if (clean.includes('palembang')) return { cost: 15000, label: 'Ongkir Dalam Kota Palembang' };
    return { cost: 30000, label: 'Ongkir Luar Palembang (Sumbagsel & Jawa)' };
};

const orderPricing = (product, address = state.session?.address || '') => {
    const units = cartUnits(product);
    const addonPerDay = state.addons.reduce((sum, addon) => sum + (ADDON_PRICE[addon] || 0), 0);
    const rent = product.price * state.days * units;
    const addons = addonPerDay * state.days * units;
    const ship = shippingForAddress(address);
    const shipping = ship.cost;
    const depositEach = depositForProduct(product);
    const deposit = depositEach * units;
    return { units, rent, addons, subtotal: rent + addons, shipping, shippingLabel: ship.label, depositEach, deposit, total: rent + addons + shipping + deposit };
};
const rulesAccepted = () => Boolean(state.session?.rulesAcceptedAt || state.rulesLocal);
const stars = (rating) => `<span class="stars" aria-label="${rating} dari 5 bintang">${[1, 2, 3, 4, 5].map((n) => icon('star', n <= Math.round(rating) ? 'filled' : '')).join('')}</span>`;
const idStatusInfo = (status, hasPhoto = true) => {
    if (!hasPhoto || status === 'none') return { label: 'Belum diunggah', tone: 'danger', symbol: 'upload_file' };
    return ({ pending: { label: 'Menunggu verifikasi admin', tone: '', symbol: 'hourglass_top' }, verified: { label: 'KTP terverifikasi', tone: 'success', symbol: 'verified' }, rejected: { label: 'Verifikasi ditolak', tone: 'danger', symbol: 'error' } })[status] || { label: 'Menunggu verifikasi admin', tone: '', symbol: 'hourglass_top' };
};
const refreshProfile = async () => {
    if (!state.session?.token) return;
    try {
        const me = await api('/me');
        const keys = ['idStatus', 'idRejectReason', 'idReviewedAt', 'rulesAcceptedAt', 'trustScore', 'hasIdSelfie'];
        const changed = keys.some((key) => me.user[key] !== state.session?.[key]);
        setSession(me.user);
        return changed;
    } catch { return false; }
};
const adminBrowsablePages = ['admin', 'account', 'home', 'catalog', 'detail', 'rules', 'howto', 'events', 'event', 'organizer'];
const navigate = (page, param = null) => {
    if (state.session?.role === 'admin' && !adminBrowsablePages.includes(page)) { page = 'admin'; param = state.adminSection; }
    if (state.session?.role === 'customer' && page === 'admin') { page = 'home'; param = null; }
    if (['checkout', 'orders', 'tracking'].includes(page) && state.session?.role !== 'customer') { page = state.session ? 'admin' : 'login'; param = state.session ? state.adminSection : null; }
    if (page === 'account' && !state.session) { page = 'login'; param = null; }
    state.page = page;
    state.param = param;
    state.modal = null;
    const hash = `#${page}${param ? `/${encodeURIComponent(param)}` : ''}`;
    history.pushState({ page, param }, '', hash);
    window.scrollTo({ top: 0, behavior: 'instant' });
    render();
    if (state.session?.role === 'customer' && ['account', 'orders', 'tracking', 'checkout'].includes(page)) {
        // Ambil status terbaru (verifikasi KTP, tahap pesanan, balasan ulasan) yang diubah admin.
        Promise.all([refreshProfile(), page === 'checkout' || page === 'account' ? null : loadOrders()]).then(([changed]) => { if (state.page === page && (changed || page === 'orders' || page === 'tracking')) render(); });
    }
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
    toast.style.cssText = 'position:fixed !important;bottom:28px !important;left:50% !important;right:auto !important;top:auto !important;margin:0 !important;transform:translateX(-50%) !important;width:max-content !important;max-width:min(420px,90vw) !important;z-index:9999 !important;background:#1d1520 !important;color:#ffffff !important;border:2px solid #f45193 !important;padding:14px 24px !important;border-radius:14px !important;font-size:14px !important;font-weight:600 !important;text-align:center !important;box-shadow:0 12px 30px rgba(0,0,0,0.35) !important;';
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 3200);
};

const topHeader = () => {
    const adminView = state.session?.role === 'admin';
    const dashboardView = adminView && ['admin', 'account'].includes(state.page);
    const customerView = state.session?.role === 'customer';
    const links = dashboardView
        ? ''
        : [['home', 'Beranda'], ['catalog', 'Katalog Kostum'], ['rules', 'Rules Rental'], ['howto', 'Cara Sewa'], ...(customerView ? [['orders', 'Pesanan Saya']] : []), ['events', 'Telusuri Event Bersama AI']].map(([page, label]) => `<a href="#${page}" data-go="${page}" class="nav-link ${state.page === page || (state.page === 'detail' && page === 'catalog') ? 'active' : ''}">${label}</a>`).join('');
    return `
    <header class="site-header ${dashboardView ? 'admin-header' : ''}">
        <div class="container header-main">
            <a class="brand" href="${adminView ? '#admin' : '#home'}" data-go="${adminView ? 'admin' : 'home'}" aria-label="Let'sCosplay ${adminView ? 'dashboard admin' : 'beranda'}">${brandLogoMarkup}<span class="brand-name">Let's<span>Cosplay</span></span></a>
            ${dashboardView ? '<span class="header-spacer"></span>' : `<nav class="main-nav" aria-label="Navigasi ${adminView ? 'admin' : 'customer'}">${links}</nav>`}
            <div class="header-actions">
                <button class="icon-button" type="button" data-action="theme" aria-label="Ganti tema" title="Ganti tema">${icon(theme() === 'dark' ? 'light_mode' : 'dark_mode')}</button>
                ${state.session ? `${dashboardView ? `<button class="button button-secondary button-small header-store-btn" type="button" data-go="home" aria-label="Lihat toko">${icon('storefront')}<span>Lihat toko</span></button>` : adminView ? '<button class="button button-primary button-small" type="button" data-go="admin">Dashboard</button>' : ''}<button class="user-chip ${state.page === 'account' ? 'active' : ''}" type="button" data-go="account" aria-label="Pengaturan akun" title="Pengaturan akun"><span class="avatar avatar-sm">${escapeHtml(initials(state.session.name))}</span><span class="user-chip-name">${escapeHtml(String(state.session.name).split(' ')[0])}</span></button><button class="button button-secondary button-small" type="button" data-action="logout">Keluar</button>` : `<button class="button button-secondary button-small" type="button" data-go="login">Masuk</button><button class="button button-primary button-small" type="button" data-go="register">Daftar</button>`}
                <button class="icon-button mobile-menu" type="button" data-action="menu" aria-label="Buka navigasi" aria-expanded="false">${icon('menu')}</button>
            </div>
        </div>
    </header>`;
};

const footer = () => `
    <footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div><a class="brand" href="#home" data-go="home">${brandLogoMarkup}<span class="brand-name">Let's<span>Cosplay</span></span></a><p class="footer-note">Temukan karakter favoritmu. Kami siapkan kostum, kamu ciptakan ceritanya.</p></div>
                <div><h4>Jelajahi</h4><div class="footer-links"><a href="#catalog" data-go="catalog">Katalog kostum</a><a href="#events" data-go="events">Event cosplay</a><a href="#rules" data-go="rules">Aturan rental</a></div></div>
                <div><h4>Bantuan</h4><div class="footer-links">${state.session ? `${state.session.role === 'customer' ? '<a href="#orders" data-go="orders">Pesanan saya</a>' : ''}<a href="#account" data-go="account">Pengaturan akun</a>` : '<a href="#login" data-go="login">Masuk akun</a><a href="#register" data-go="register">Daftar akun</a>'}<a href="#howto" data-go="howto">Cara sewa</a><a href="#organizer" data-go="organizer">Pasang iklan event</a></div></div>
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
            <div class="product-meta"><span>${escapeHtml(product.category)} · ${escapeHtml(product.series)}${product.origin ? ` · ${escapeHtml(product.origin)}` : ''}</span><span class="availability ${product.stock > 0 ? '' : 'is-out'}">${imageStockLine(product)}</span></div>
            <h3 class="product-name">${escapeHtml(product.name)}</h3>
            <div class="size-chips" aria-label="Stok per ukuran">${product.size.map((label) => `<span class="size-chip ${stockTone(sizeStockOf(product, label))}">${escapeHtml(label)} · ${sizeStockOf(product, label)}</span>`).join('')}</div>
            <div class="card-bottom"><div><div class="product-price">${money(product.price)} <small>/ hari</small></div><div class="rating">${product.reviews ? `${icon('star')} ${product.rating} <span class="muted small">(${product.reviews})</span>` : '<span class="muted small">Baru</span>'}</div></div><button class="button button-soft button-small" type="button" data-go="detail" data-id="${escapeHtml(product.id)}">Lihat detail</button></div>
            ${photoCreditMarkup(product)}
        </div>
    </article>`;

const eventCard = (event, compact = false, aiMatch = null) => `
    <article class="event-card reveal" style="--event-accent:${escapeHtml(event.accentColor || '#f45193')}">
        <img src="${escapeHtml(event.image)}" alt="Poster ${escapeHtml(event.title)}" loading="lazy">
        <div><div class="product-meta"><span>${escapeHtml(event.category)}</span><span>${escapeHtml(event.tier)}${event.featured ? ' · Unggulan' : ''}</span></div>${event.highlightText ? `<strong class="event-card-highlight">${escapeHtml(event.highlightText)}</strong>` : ''}<h3>${escapeHtml(event.title)}</h3><p>${icon('calendar_month')} ${escapeHtml(event.date)} · ${escapeHtml(event.location)}</p>${compact ? '' : `<p>${escapeHtml(event.description)}</p>${event.copywriting ? `<p class="event-preview-copywriting">${escapeHtml(event.copywriting)}</p>` : ''}`}${aiMatch ? `<div class="event-ai-match"><strong>${escapeHtml(aiMatch.reasons.join(' · '))}</strong><small>Kostum terkait: ${escapeHtml(aiMatch.costumes.join(', ') || 'Belum ada pasangan langsung')}</small></div>` : ''}</div>
        <div class="event-card-actions"><button class="button button-primary button-small" type="button" data-go="event" data-id="${escapeHtml(event.id)}">${compact ? 'Lihat' : 'Kostum cocok'}</button></div>
    </article>`;

const homePage = () => `
    <section class="home-hero">
        <img class="hero-image" src="${IMAGE_ASSETS.hero}" alt="Cosplay dan acara komunitas" fetchpriority="high" style="object-fit:cover;object-position:center">
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
        <section class="event-strip" style="margin-top:42px"><div class="event-art" role="img" aria-label="Suasana event komunitas" style="background-image:url('${IMAGE_ASSETS.eventStrip}');background-size:cover;background-position:center;background-repeat:no-repeat"></div><div class="event-copy"><span class="eyebrow">Untuk komunitas & organizer</span><h2>Event-mu pantas ditemukan.</h2><p>Promosikan gathering, festival, atau photo walk kepada komunitas cosplay yang tepat.</p><button class="button button-primary" data-go="organizer" type="button">Pasang iklan event ${icon('arrow_forward')}</button></div></section>
    </div>`;

const catalogPage = () => {
    const matching = state.inventory.filter((product) => {
        const query = state.search.toLowerCase();
        return (!state.category || product.category === state.category || (state.category === 'Fantasy' && product.themes.includes('fantasy')))
            && (!query || `${product.name} ${product.series} ${product.category}`.toLowerCase().includes(query))
            && product.price <= (state.maxPrice ?? Infinity)
            && (!state.sizeFilters.length || state.sizeFilters.some((size) => product.size.includes(size)))
            && (!state.onlyAvailable || product.stock > 0)
            && (!state.onlyFavorites || state.favorites.includes(String(product.id)));
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
                <div class="filter-group"><h4>Ketersediaan &amp; Favorit</h4><label class="filter-label"><input type="checkbox" data-availability-filter ${state.onlyAvailable ? 'checked' : ''}> Siap disewa</label><label class="filter-label"><input type="checkbox" data-favorite-filter ${state.onlyFavorites ? 'checked' : ''}> ${icon('favorite', 'filled')} Kostum favorit (${state.favorites.length})</label></div>
            </div></aside>
            <section><div class="catalog-toolbar"><span class="muted small">${sorted.length} kostum ditemukan</span><div class="quantity-row"><button class="button button-secondary button-small" data-action="mobile-filters" type="button">${icon('tune')} Filter</button><select class="select" data-action="sort" aria-label="Urutkan katalog"><option value="popular" ${state.sort === 'popular' ? 'selected' : ''}>Paling populer</option><option value="price-low" ${state.sort === 'price-low' ? 'selected' : ''}>Harga terendah</option><option value="price-high" ${state.sort === 'price-high' ? 'selected' : ''}>Harga tertinggi</option></select></div></div>
                <div class="filter-chips">${state.search ? `<button type="button" class="chip chip-button" data-action="clear-search" aria-label="Hapus pencarian ${escapeHtml(state.search)}">${escapeHtml(state.search)} ×</button>` : ''}<span class="chip">Deposit refundable</span><span class="chip">Kondisi terverifikasi</span></div><div class="product-grid">${sorted.length ? sorted.map(productCard).join('') : (state.loaded ? '<div class="empty-state">Belum ada kostum yang sesuai. Coba ubah kategori atau harga.</div>' : skeletonCards(6))}</div><div class="pagination"><button aria-label="Halaman sebelumnya">‹</button><button class="active">1</button><button>2</button><button>3</button><button aria-label="Halaman berikutnya">›</button></div>
            </section>
        </div></div>`;
};

const detailPage = () => {
    const product = productById(state.param || state.productId);
    state.productId = product.id;
    syncCart(product);
    const pr = orderPricing(product);
    const images = product.images?.length ? product.images : [product.image];
    const paidEventLinks = matchingPaidEvents(product).map((event) => `<a class="event-join-link" href="#event/${encodeURIComponent(event.id)}" data-go="event" data-id="${escapeHtml(event.id)}">${icon('campaign')} Gabung dengan event ${escapeHtml(event.title)} ${icon('arrow_forward')}</a>`).join('');
    return `<div class="container page-wrap"><div class="breadcrumb"><a href="#home" data-go="home">Beranda</a><span>/</span><a href="#catalog" data-go="catalog">Katalog</a><span>/</span><span>${escapeHtml(product.name)}</span></div>
        <div class="detail-layout"><div><img class="detail-main-image" src="${escapeHtml(images[0])}" alt="${escapeHtml(product.name)}"><div class="detail-thumbs" ${images.length > 1 ? '' : 'hidden'}>${images.map((image, index) => `<img src="${escapeHtml(image)}" data-action="gallery" alt="Foto ${index + 1} ${escapeHtml(product.name)}" loading="lazy">`).join('')}</div><section class="panel" style="margin-top:20px"><h2>Yang termasuk dalam paket</h2><div class="stack">${(product.accessories || []).map((item) => `<div class="price-line"><span>${icon('check_circle')} ${escapeHtml(item)}</span><span>Termasuk</span></div>`).join('') || '<p class="muted small">Tidak ada aksesori tambahan.</p>'}</div></section><section class="panel" id="size-guide" style="margin-top:16px;scroll-margin-top:100px"><h2>Panduan ukuran</h2><p class="muted small">Ukuran menggunakan standar badan Indonesia. Pilih ukuran yang biasa kamu gunakan; tim kami akan mengonfirmasi sebelum dikirim.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Ukuran</th><th>Lingkar dada</th><th>Panjang</th></tr></thead><tbody><tr><td>XS</td><td>74–81 cm</td><td>130 cm</td></tr><tr><td>S</td><td>82–88 cm</td><td>135 cm</td></tr><tr><td>M</td><td>89–96 cm</td><td>140 cm</td></tr><tr><td>L</td><td>97–104 cm</td><td>145 cm</td></tr><tr><td>XL</td><td>105–114 cm</td><td>150 cm</td></tr></tbody></table></div></section>${reviewsSection(product)}</div>
        <div class="detail-content"><span class="eyebrow">${escapeHtml(product.series)}</span><h1>${escapeHtml(product.name)}</h1><div class="product-meta"><span>${escapeHtml(product.category)} · ${product.reviews ? `${product.reviews} ulasan` : 'Belum ada ulasan'}</span><span class="rating">${product.reviews ? `${icon('star')} ${product.rating}` : 'Baru'}</span></div><p class="detail-blurb">${escapeHtml(product.description)}</p>${paidEventLinks ? `<div class="event-join-links">${paidEventLinks}</div>` : ''}<div class="detail-price">${money(product.price)} <small>/ hari</small></div><div class="field"><span class="field-label">Pilih ukuran &amp; jumlah <small class="muted">· total stok ${product.stock} unit</small></span><div class="size-picker">${product.size.map((size) => { const left = sizeStockOf(product, size); const qty = state.sizeQty[size] || 0; return `<div class="size-line ${qty ? 'selected' : ''} ${left < 1 ? 'is-out' : ''}"><div class="size-line-name"><strong>${escapeHtml(size)}</strong><small class="stock-${stockTone(left)}">${left < 1 ? 'Habis' : `Sisa ${left} unit`}</small></div><div class="qty-stepper"><button type="button" data-action="size-dec" data-size-name="${escapeHtml(size)}" ${qty < 1 ? 'disabled' : ''} aria-label="Kurangi ukuran ${escapeHtml(size)}">−</button><output aria-live="polite">${qty}</output><button type="button" data-action="size-inc" data-size-name="${escapeHtml(size)}" ${left < 1 || qty >= left ? 'disabled' : ''} aria-label="Tambah ukuran ${escapeHtml(size)}">+</button></div></div>`; }).join('')}</div><p class="size-summary">${pr.units ? `Dipilih: <strong>${escapeHtml(cartSizeLabel(product))}</strong> (${pr.units} kostum)` : 'Belum ada ukuran dipilih.'}</p><p class="muted small" style="margin:0">Pesan untuk tim atau kelompok? Tambah jumlah di tiap ukuran, lalu centang “Pesanan kelompok” di langkah pemesanan. <button class="text-button small" data-scroll="size-guide" type="button">Panduan ukuran</button></p></div><div class="field" style="margin-top:17px"><label for="rental-days">Lama sewa</label><select class="select" id="rental-days" data-action="days">${[1, 2, 3, 4, 5, 6, 7].map((days) => `<option value="${days}" ${state.days === days ? 'selected' : ''}>${days} hari</option>`).join('')}</select></div><div class="field" style="margin-top:17px"><label for="rental-date">Tanggal mulai sewa</label><input class="input" id="rental-date" type="date" min="${toDateValue(new Date())}" value="${state.rentalDate}" data-action="start-date" required><small class="muted">Pilih tanggal kostum akan mulai digunakan.</small></div><div class="field" style="margin-top:17px"><span class="field-label">Aksesori tambahan</span><div class="addon-list"><label class="addon-option"><span><input type="checkbox" data-addon="wig" ${state.addons.includes('wig') ? 'checked' : ''}> Styling wig premium</span><strong>+ Rp35.000 / hari</strong></label><label class="addon-option"><span><input type="checkbox" data-addon="care" ${state.addons.includes('care') ? 'checked' : ''}> Paket perawatan kostum</span><strong>+ Rp15.000 / hari</strong></label></div></div><div class="price-box"><div class="price-line"><span>Sewa (${pr.units} kostum × ${state.days} hari)</span><strong>${money(pr.subtotal)}</strong></div><div class="price-line"><span>Estimasi pengiriman</span><strong>${money(pr.shipping)}</strong></div><div class="price-line"><span>Deposit refundable${pr.units > 1 ? ` (${pr.units}×)` : ''}</span><strong>${money(pr.deposit)}</strong></div><div class="price-line total"><span>Estimasi total</span><strong>${money(pr.total)}</strong></div><p class="muted small">Deposit dikembalikan setelah kostum diterima dan kondisinya diperiksa.</p></div>${state.session?.role === 'admin' ? `<button class="button button-primary" style="width:100%" type="button" disabled>Mode pratinjau admin · tidak bisa memesan</button>` : product.stock > 0 && pr.units > 0 ? `<button class="button button-primary" style="width:100%" type="button" data-action="checkout">Lanjut ke pemesanan ${icon('arrow_forward')}</button>` : `<button class="button button-primary" style="width:100%" type="button" disabled>${product.stock > 0 ? 'Pilih minimal 1 ukuran' : 'Sedang disewa · stok habis'}</button>`}<button class="button button-secondary" style="width:100%;margin-top:8px" type="button" data-go="rules">Baca aturan rental</button></div></div></div>`;
};

const rulesPage = () => `<div class="container page-wrap"><div class="page-intro"><div><span class="eyebrow">Sebelum menyewa</span><h1 class="page-title">Aturan rental</h1><p>Supaya pengalaman rental nyaman dan kostum tetap terawat, baca ketentuan berikut sebelum memesan.</p></div><button class="button button-primary" data-go="catalog" type="button">Pilih kostum ${icon('arrow_forward')}</button></div><div class="rules-grid"><nav class="rules-nav"><a href="#rules" data-scroll="renter">Persyaratan penyewa</a><a href="#rules" data-scroll="payment">Pembayaran & deposit</a><a href="#rules" data-scroll="care">Perawatan kostum</a><a href="#rules" data-scroll="shipping">Pengiriman & retur</a><a href="#rules" data-scroll="late">Keterlambatan</a></nav><div class="rules-content"><section id="renter"><h2>Persyaratan penyewa</h2><ul><li>Penyewa berusia minimal 17 tahun dan memberikan identitas yang valid untuk verifikasi.</li><li>Nomor telepon aktif dan nomor penjamin wajib dapat dihubungi selama masa sewa.</li><li>Alamat pengiriman harus lengkap, termasuk kecamatan, kota, kode pos, dan petunjuk rumah.</li><li>Data digunakan hanya untuk proses verifikasi dan pemenuhan pesananmu.</li></ul></section><section id="payment"><h2>Pembayaran & deposit</h2><ul><li>Pesanan dikonfirmasi setelah pembayaran uang muka minimal 50% dari total estimasi.</li><li>Sisa pembayaran harus diterima paling lambat H-1 sebelum kostum dikirim.</li><li>Deposit bersifat refundable dan dikembalikan maksimal 3 hari kerja setelah pemeriksaan retur.</li><li>Biaya pengiriman dihitung terpisah dari harga sewa dan deposit.</li></ul></section><section id="care"><h2>Perawatan kostum</h2><ul><li>Gunakan kostum dengan tangan bersih dan hindari makanan/minuman di area kostum.</li><li>Jangan mencuci, menyetrika, mengelem, atau mengubah kostum tanpa persetujuan tim.</li><li>Simpan aksesori dalam kantong masing-masing dan gunakan kemasan pelindung saat retur.</li><li>Kerusakan atau kehilangan komponen dapat mengurangi nilai deposit sesuai hasil pemeriksaan.</li></ul></section><section id="shipping"><h2>Pengiriman & retur</h2><ul><li>Kostum dikirim melalui JNE Express dengan nomor resi yang dibagikan di halaman Pesanan saya.</li><li>Paket dijadwalkan tiba sebelum tanggal penggunaan; sampaikan kebutuhan khusus saat checkout.</li><li>Kirim kembali kostum pada hari terakhir sewa menggunakan label retur yang disertakan.</li><li>Foto kondisi paket sebelum dikirim sebagai dokumentasi bersama.</li></ul></section><section id="late"><h2>Keterlambatan & pembatalan</h2><ul><li>Keterlambatan pengembalian dikenakan biaya 25% harga sewa per hari.</li><li>Pembatalan sebelum kostum disiapkan dapat memperoleh pengembalian DP penuh.</li><li>Setelah paket dikirim, biaya pengiriman tidak dapat dikembalikan.</li></ul></section><div class="rules-accept-box ${rulesAccepted() ? 'is-accepted' : ''}"><label class="checkline"><input type="checkbox" data-action="rules-accept" ${rulesAccepted() ? 'checked' : ''}> Saya sudah membaca dan memahami aturan rental.</label>${rulesAccepted() ? `<p class="rules-accepted-note">${icon('check_circle', 'filled')} Aturan disetujui${state.session?.rulesAcceptedAt ? ` pada ${escapeHtml(state.session.rulesAcceptedAt)}` : ' di perangkat ini'}. Kamu sekarang bisa memesan kostum.</p><div class="quantity-row"><button class="button button-primary" type="button" data-go="${state.rulesReturn ? 'checkout' : 'catalog'}">${state.rulesReturn ? 'Lanjut ke pemesanan' : 'Pilih kostum'} ${icon('arrow_forward')}</button></div>` : '<p class="muted small" style="margin:8px 0 0">Centang untuk menyetujui — persetujuan ini diperlukan sebelum membuat pesanan.</p>'}</div></div></div></div>`;

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
        <div class="field span-2"><label for="renter-address">Alamat lengkap pengiriman *</label><textarea class="textarea" id="renter-address" name="address" required minlength="10" autocomplete="street-address" placeholder="Jalan, nomor rumah, RT/RW, kecamatan, kota, kode pos">${escapeHtml(me.address || '')}</textarea><small class="muted">Default Kota Palembang Rp15.000; luar Palembang (Sumbagsel &amp; Jawa) Rp30.000. Ongkir otomatis menyesuaikan alamat di atas.</small></div>
    </div></section>`;
};

const checkoutPage = () => {
    const product = productById(state.productId);
    const pr = orderPricing(product);
    const addOnTotal = pr.addons;
    const subtotal = pr.subtotal;
    const shipping = pr.shipping;
    const total = pr.total;
    const minimumDp = Math.ceil(total * 0.5);
    const balance = total - minimumDp;
    return `<div class="container page-wrap"><div class="breadcrumb"><a href="#catalog" data-go="catalog">Katalog kostum</a><span>/</span><span>Checkout</span></div><div class="page-intro"><div><span class="eyebrow">Satu langkah lagi</span><h1 class="page-title">Formulir pemesanan</h1><p>Lengkapi data dengan benar agar proses verifikasi dan pengiriman berjalan lancar.</p></div></div><form id="checkout-form"><div class="checkout-layout"><div class="checkout-sections">
        <section class="form-section"><h2><span class="section-index">1</span> Kostum yang dipesan</h2><div class="readonly-product"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(product.name)}</h3><span class="muted small">Ukuran ${escapeHtml(cartSizeLabel(product))} · ${pr.units} kostum · ${state.days} hari · mulai ${escapeHtml(formatDate(state.rentalDate))} · ${state.addons.length} aksesori tambahan</span><p class="small"><button type="button" class="text-button" data-go="detail" data-id="${escapeHtml(product.id)}">Ubah ukuran / jumlah</button></p></div></div>
        <div class="group-box"><label class="checkline"><input type="checkbox" name="isGroup" data-group-toggle ${state.group.enabled ? 'checked' : ''}> <span><strong>Pesanan kelompok / tim</strong><br>Untuk seragam bersama, mis. angkatan sekolah, tim lomba, atau komunitas. Minimal 2 kostum.</span></label><div class="group-fields" ${state.group.enabled ? '' : 'hidden'}><div class="field"><label for="group-name">Nama kelompok / tim *</label><input class="input" id="group-name" name="groupName" data-group-field="name" maxlength="80" placeholder="Contoh: XII IPA 2 SMA Negeri 1" value="${escapeHtml(state.group.name)}" ${state.group.enabled ? 'required' : ''}></div><div class="field"><label for="group-members">Daftar anggota &amp; ukuran (opsional)</label><textarea class="textarea" id="group-members" name="groupMembers" data-group-field="members" maxlength="2000" placeholder="Satu baris per anggota, contoh:&#10;Ani - M&#10;Budi - L">${escapeHtml(state.group.members)}</textarea></div><small class="muted">Jumlah dan ukuran mengikuti pilihan di halaman detail (${escapeHtml(cartSizeLabel(product))}).</small></div></div></section>
        ${renterSection()}
        <section class="form-section"><h2><span class="section-index">3</span> Rincian pembayaran</h2><div class="price-line"><span>Subtotal sewa dan aksesori</span><strong>${money(subtotal)}</strong></div><div class="price-line"><span>Pengiriman</span><strong>${money(shipping)}</strong></div><div class="price-line"><span>Deposit refundable</span><strong>${money(pr.deposit)}</strong></div><div class="price-line total"><span>Total estimasi</span><strong>${money(total)}</strong></div><div class="notice" style="margin-top:14px">Minimum DP 50%: <strong>${money(minimumDp)}</strong>. Sisa <strong>${money(balance)}</strong> dibayarkan paling lambat H-1 sebelum pengiriman.</div><div class="payment-choice" style="margin-top:14px"><label><input type="radio" name="paymentScheme" value="dp" checked> Bayar DP (min. 50%)<br><small class="muted">Sisa dilunasi paling lambat H-1 pengiriman</small></label><label><input type="radio" name="paymentScheme" value="full"> Bayar Lunas Sekarang (100%)<br><small class="muted">Tanpa sisa tagihan</small></label></div><div class="field" style="margin-top:14px"><label for="payment-amount">Jumlah DP yang dibayar *</label><input class="input" id="payment-amount" name="paymentAmount" type="number" min="${minimumDp}" max="${total}" step="1000" value="${minimumDp}" required><small class="muted">Minimal ${money(minimumDp)} · maksimal ${money(total)}</small></div></section>
        <section class="form-section"><h2><span class="section-index">4</span> Bukti pembayaran</h2><div class="payment-choice"><label><input type="radio" name="paymentMethod" value="Transfer bank" required> Transfer bank<br><small class="muted">BCA · BNI · Mandiri</small></label><label><input type="radio" name="paymentMethod" value="E-wallet" required> E-wallet<br><small class="muted">GoPay · OVO · DANA</small></label></div><div class="payment-destination" data-payment-destination style="margin-top:14px;display:grid;gap:10px" aria-live="polite">${paymentDestinationMarkup('')}</div><div class="field" style="margin-top:14px"><label for="payment-proof">Unggah bukti transfer *</label><input class="input" id="payment-proof" name="paymentProof" type="file" accept="image/*" required><small class="muted">JPG atau PNG, maksimal 5 MB.</small></div></section>
        <section class="form-section"><h2><span class="section-index">5</span> Persetujuan</h2><label class="checkline"><input type="checkbox" name="agree" required ${rulesAccepted() ? 'checked' : ''}> Saya menyetujui <a class="text-button" href="#rules" data-go="rules">Aturan rental</a>, penggunaan deposit, dan jadwal pengembalian kostum.</label><div class="notice" style="margin-top:13px">Dokumen identitas dan bukti pembayaran hanya dilihat admin untuk keperluan verifikasi pesanan ini.</div></section>
    </div><aside class="sticky-summary"><h2>Ringkasan pesanan</h2><div class="price-line"><span>Kostum (${pr.units}×)</span><strong>${money(product.price * state.days * pr.units)}</strong></div>${addOnTotal ? `<div class="price-line"><span>Aksesori tambahan</span><strong>${money(addOnTotal)}</strong></div>` : ''}<div class="price-line"><span>Pengiriman</span><strong>${money(shipping)}</strong></div><div class="price-line"><span>Deposit</span><strong>${money(pr.deposit)}</strong></div><div class="price-line total"><span>Total</span><strong>${money(total)}</strong></div><div class="deposit-note">${icon('verified_user')} Deposit refundable setelah kostum retur dan lolos pemeriksaan.</div><button class="button button-primary" type="submit" style="width:100%;margin-top:16px">Kirim pesanan ${icon('arrow_forward')}</button><p class="muted small">Pesanan tersimpan di akunmu dan bisa dilacak di menu Pesanan saya.</p></aside></div></form></div>`;
};

const reviewItemMarkup = (review) => `<article class="review-item"><header><span class="avatar">${escapeHtml(initials(review.customerName))}</span><div><strong>${escapeHtml(review.customerName)}</strong><small class="muted">${escapeHtml(review.createdAt || '')}${review.size ? ` · Ukuran ${escapeHtml(review.size)}` : ''}</small></div>${stars(review.rating)}</header>${review.comment ? `<p>${escapeHtml(review.comment)}</p>` : '<p class="muted small">Pembeli tidak menulis komentar.</p>'}${review.reply ? `<div class="review-reply"><strong>${icon('storefront')} Balasan penjual</strong><p>${escapeHtml(review.reply)}</p></div>` : ''}</article>`;
const reviewsSection = (product) => {
    const data = state.reviews[product.id];
    const body = !data
        ? '<p class="muted small">Memuat ulasan…</p>'
        : !data.count
            ? '<p class="muted small">Belum ada ulasan. Ulasan muncul setelah penyewa menyelesaikan sewa kostum ini.</p>'
            : `<div class="review-summary"><div class="review-score"><strong>${data.average}</strong>${stars(data.average)}<small class="muted">${data.count} ulasan</small></div><div class="review-bars">${[5, 4, 3, 2, 1].map((n) => `<div><span>${n}</span><i><b style="width:${Math.round(((data.distribution?.[n] || 0) / data.count) * 100)}%"></b></i><small>${data.distribution?.[n] || 0}</small></div>`).join('')}</div></div><div class="review-list">${data.reviews.map(reviewItemMarkup).join('')}</div>`;
    return `<section class="panel" id="reviews" style="margin-top:16px"><h2>Ulasan pembeli</h2>${body}</section>`;
};
const orderReviewBlock = (order) => {
    if (order.stage < 7) return '';
    const review = order.review;
    return `<div class="panel review-panel" style="text-align:left;margin-top:16px"><h2>${icon('rate_review')} Ulasanmu</h2>${review ? `<div class="review-item">${stars(review.rating)}${review.comment ? `<p>${escapeHtml(review.comment)}</p>` : '<p class="muted small">Tanpa komentar.</p>'}${review.reply ? `<div class="review-reply"><strong>${icon('storefront')} Balasan penjual</strong><p>${escapeHtml(review.reply)}</p></div>` : '<small class="muted">Belum dibalas penjual.</small>'}</div><button class="button button-secondary button-small" type="button" data-action="review-order" data-id="${escapeHtml(order.id)}">Ubah ulasan</button>` : `<p class="muted small">Bagaimana pengalamanmu menyewa kostum ini? Ulasanmu membantu penyewa lain memilih.</p><button class="button button-primary button-small" type="button" data-action="review-order" data-id="${escapeHtml(order.id)}">${icon('star')} Beri ulasan</button>`}</div>`;
};
const orderQtyLabel = (order) => `${order.quantity > 1 ? `${order.quantity} kostum · ` : ''}${order.isGroup ? `Kelompok “${order.groupName}” · ` : ''}`;
const stageForOrder = (order) => order.stage ?? 0;
const orderProduct = (order) => state.inventory.find((item) => String(item.id) === String(order.productId))
    || { id: order.productId, name: order.productName || 'Kostum', image: order.productImage || '', price: 0, deposit: 0, size: [order.size], category: '', series: '', accessories: [], rating: 5, reviews: 0 };
const orderPaymentStatus = (order) => (order.isPaidOff
    ? `<span class="status-pill success">${icon('check_circle', 'filled')} Lunas</span>${order.finalPaidAt ? ` <span class="muted small">Dilunasi ${escapeHtml(order.finalPaidAt)}</span>` : ''}`
    : `<span class="status-pill">${icon('payments')} Belum lunas</span> <span>Sisa tagihan <strong>${money(Number(order.remainingAmount || 0))}</strong></span>`);
const addDaysToDate = (value, amount) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    date.setDate(date.getDate() + amount);
    return toDateValue(date);
};
// Jatuh tempo retur = tanggal mulai sewa + jumlah hari sewa. Estimasi kirim = H-1 sebelum mulai sewa (kecuali sudah diatur admin).
const orderReturnDue = (order) => addDaysToDate(order.rentalDate, Number(order.days || 0));
const orderShipDate = (order) => order.estimatedShipDate || addDaysToDate(order.rentalDate, -1);
const orderScheduleMarkup = (order) => {
    const stage = stageForOrder(order);
    const returnDue = orderReturnDue(order);
    const overdue = returnDue && stage < 7 && !order.returnTrackingNumber && returnDue < toDateValue(new Date());
    const hold = order.shippingHoldReason && stage < 3
        ? `<div class="notice" role="alert" style="margin-top:8px">${icon('warning')} <strong>Pengiriman ditunda admin.</strong> ${escapeHtml(order.shippingHoldReason)}</div>`
        : '';
    return `<div class="small" style="margin-top:10px;display:grid;gap:4px"><span>${icon('local_shipping')} ${order.estimatedShipDate ? 'Jadwal kirim toko' : 'Estimasi kirim (H-1 sebelum sewa)'}: <strong>${escapeHtml(formatDate(orderShipDate(order)))}</strong></span><span>${icon('event')} Mulai sewa: ${escapeHtml(formatDate(order.rentalDate))}</span><span>${icon('assignment_return')} Wajib dikembalikan paling lambat: <strong>${escapeHtml(formatDate(returnDue))}</strong></span>${overdue ? `<span style="color:var(--red)">${icon('error')} Sudah lewat jatuh tempo retur — keterlambatan dikenakan 25% harga sewa per hari.</span>` : ''}</div>${hold}`;
};
const returnGuideMarkup = (order) => `<ol class="small" style="margin:8px 0 0;padding-left:18px;display:grid;gap:4px"><li>Jangan mencuci atau menyetrika kostum sendiri; biarkan tim yang merawatnya.</li><li>Cek kelengkapan kostum dan semua aksesori (wig, properti, kantong) sebelum dikemas.</li><li>Kemas dengan pelindung dan foto kondisi paket sebagai dokumentasi.</li><li>Kirim via JNE Express tepat waktu, paling lambat <strong>${escapeHtml(formatDate(orderReturnDue(order)))}</strong>, lalu isi nomor resi dan unggah foto paket/resi pengembalian.</li></ol>${returnAddressMarkup()}`;
const returnFormMarkup = (order) => `<form id="return-form" class="stack" style="margin-top:12px"><input type="hidden" name="orderId" value="${escapeHtml(order.id)}"><div class="field"><label for="return-tracking-${escapeHtml(order.id)}">Nomor resi pengembalian *</label><input class="input" id="return-tracking-${escapeHtml(order.id)}" name="returnTrackingNumber" required maxlength="60" placeholder="Nomor resi JNE untuk paket retur"></div><div class="field"><label for="return-proof-${escapeHtml(order.id)}">Foto kondisi paket / resi pengembalian *</label><input class="input" id="return-proof-${escapeHtml(order.id)}" name="returnProof" type="file" accept="image/*" required><small class="muted">JPG atau PNG, maksimal 8 MB.</small></div><p class="small auth-error" data-return-error role="alert" hidden></p><button class="button button-primary" type="submit">Kirim bukti pengembalian</button></form>`;
const orderReturnBox = (order) => {
    const stage = stageForOrder(order);
    const hasResi = Boolean(order.returnTrackingNumber);
    if (!hasResi && !(stage >= 5 && stage < 7)) return '';
    return `<div class="panel" style="text-align:left;margin-top:16px"><h2>${icon('assignment_return')} Cara mengembalikan kostum</h2>${returnGuideMarkup(order)}${hasResi ? `<div class="deposit-note" style="margin-top:12px">${icon('check_circle', 'filled')} Resi pengembalian: <strong>${escapeHtml(order.returnTrackingNumber)}</strong>${order.returnedAt ? `<br><small>Dikirim ${escapeHtml(order.returnedAt)}</small>` : ''}</div>` : returnFormMarkup(order)}</div>`;
};
const ordersPage = () => {
    const tabs = ['Semua', 'Menunggu verifikasi', 'Diproses', 'Disewa', 'Selesai'];
    const customerOrders = state.orders.filter((order) => order.customerEmail === state.session?.email);
    const visibleOrders = customerOrders.filter((order) => state.orderFilter === 'Semua' || order.bucket === state.orderFilter);
    return `<div class="container page-wrap"><div class="page-intro"><div><span class="eyebrow">Pantau perjalanan paketmu</span><h1 class="page-title">Pesanan saya</h1><p>Semua status dan detail rental tersimpan di sini.</p></div><button class="button button-primary" data-go="catalog" type="button">Cari kostum ${icon('arrow_forward')}</button></div><div class="orders-tabs">${tabs.map((tab) => `<button class="orders-tab ${state.orderFilter === tab ? 'active' : ''}" data-order-filter="${tab}" type="button">${tab}</button>`).join('')}</div>${visibleOrders.length ? visibleOrders.map((order) => {
        const product = orderProduct(order);
        const stage = stageForOrder(order);
        return `<article class="order-card"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(product.name)}</h3><p class="muted small">Kode ${escapeHtml(order.id)} · ${escapeHtml(orderQtyLabel(order))}Ukuran ${escapeHtml(order.size)} · ${order.days} hari</p><span class="status-pill ${stage > 5 ? 'success' : ''}">${escapeHtml(orderStages[stage])}</span><div class="small" style="margin-top:8px"><strong>${money(order.total)}</strong> <span class="muted">· ${escapeHtml(order.customerName || 'Penyewa')}</span></div><div class="small" style="margin-top:8px">${orderPaymentStatus(order)}</div>${stage < 7 ? orderScheduleMarkup(order) : ''}${order.returnTrackingNumber ? `<p class="small" style="margin:8px 0 0">${icon('assignment_return')} Resi retur: <strong>${escapeHtml(order.returnTrackingNumber)}</strong></p>` : ''}</div><div class="order-card-actions"><button class="button button-secondary button-small" data-go="tracking" data-id="${escapeHtml(order.id)}" type="button">Lacak pesanan</button>${order.isPaidOff ? '' : `<button class="button button-primary button-small" data-action="settle-order" data-id="${escapeHtml(order.id)}" type="button">${icon('upload')} Upload pelunasan</button>`}${stage >= 5 && stage < 7 && !order.returnTrackingNumber ? `<button class="button button-soft button-small" data-action="return-order" data-id="${escapeHtml(order.id)}" type="button">${icon('assignment_return')} Input resi retur</button>` : ''}${stage >= 7 ? `<button class="button ${order.review ? 'button-soft' : 'button-primary'} button-small" data-action="review-order" data-id="${escapeHtml(order.id)}" type="button">${icon('star')} ${order.review ? 'Ubah ulasan' : 'Beri ulasan'}</button>` : ''}</div></article>`;
    }).join('') : '<div class="empty-state">Belum ada pesanan di kategori ini. Kostum pilihanmu menunggu.</div>'}</div>`;
};

const trackingPage = () => {
    const order = state.orders.find((item) => item.id === state.param && item.customerEmail === state.session?.email);
    if (!order) return `<div class="container page-wrap"><div class="empty-state">Pesanan tidak ditemukan. <button class="button button-primary" data-go="catalog">Pilih kostum</button></div></div>`;
    const product = orderProduct(order);
    const stage = stageForOrder(order);
    return `<div class="container page-wrap"><div class="breadcrumb"><button class="text-button" data-go="orders">Pesanan saya</button><span>/</span><span>${escapeHtml(order.id)}</span></div><section class="success-panel"><span class="success-icon">${icon(stage >= 7 ? 'check' : 'package_2')}</span><span class="eyebrow">${stage >= 7 ? 'Rental selesai' : 'Status pesanan'}</span><h1>${escapeHtml(orderStages[stage])}</h1><p class="muted">Kode pesanan <strong>${escapeHtml(order.id)}</strong> · dibuat ${escapeHtml(order.createdAt)}</p><div class="tracking-list">${orderStages.map((label, index) => `<div class="tracking-step ${index < stage ? 'done' : ''} ${index === stage ? 'current' : ''}"><span class="tracking-dot">${index < stage ? '✓' : index + 1}</span><div><strong>${label}</strong><small>${index < stage ? 'Selesai' : index === stage ? 'Sedang berlangsung' : 'Menunggu tahap sebelumnya'}</small></div></div>`).join('')}</div><div class="panel" style="text-align:left"><div class="readonly-product"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(product.name)}</h3><span class="muted small">${escapeHtml(orderQtyLabel(order))}Ukuran ${escapeHtml(order.size)} · ${order.days} hari</span><p class="small"><strong>Total ${money(order.total)}</strong></p></div></div>${order.trackingNumber ? `<p class="small">Resi JNE Express: <strong>${escapeHtml(order.trackingNumber)}</strong></p>` : ''}<div class="small" style="margin-top:10px">${orderPaymentStatus(order)}${order.isPaidOff ? '' : ` <button class="button button-primary button-small" data-action="settle-order" data-id="${escapeHtml(order.id)}" type="button">${icon('upload')} Upload pelunasan</button>`}</div>${stage < 7 ? orderScheduleMarkup(order) : ''}</div>${orderReturnBox(order)}${orderReviewBlock(order)}<button class="button button-secondary" style="margin-top:18px" data-go="orders">Kembali ke pesanan</button></section></div>`;
};

const registerProfileFields = () => `<fieldset class="profile-fields" data-customer-only style="border:0;padding:0;margin:0;display:grid;gap:14px"><div class="field"><label for="reg-phone">Nomor telepon aktif *</label><input class="input" id="reg-phone" name="phone" type="tel" required autocomplete="tel" placeholder="08xx xxxx xxxx"></div><div class="field"><label for="reg-address">Alamat lengkap (alamat utama) *</label><textarea class="textarea" id="reg-address" name="address" required minlength="10" autocomplete="street-address" placeholder="Jalan, nomor rumah, RT/RW, kecamatan, kota, kode pos"></textarea><small class="muted">Jadi alamat pengiriman bawaan. Saat checkout kamu tetap bisa menggantinya.</small></div><div class="form-grid"><div class="field"><label for="reg-social">Media sosial *</label><select class="select" id="reg-social" name="socialPlatform" required><option value="">Pilih platform</option><option>Instagram</option><option>TikTok</option><option>X</option><option>Lainnya</option></select></div><div class="field"><label for="reg-handle">Username akun *</label><input class="input" id="reg-handle" name="socialHandle" required placeholder="@username"></div></div><div class="field"><label for="reg-guarantor">Nomor telepon penjamin *</label><input class="input" id="reg-guarantor" name="guarantor" type="tel" required placeholder="Nomor keluarga/kerabat"></div><div class="field"><label for="id-selfie">Foto selfie memegang identitas *</label><input class="input" id="id-selfie" name="idSelfie" type="file" accept="image/*" required><small class="muted">JPG/PNG, maks. 8 MB. Hanya dilihat admin untuk verifikasi.</small></div><div class="field"><span class="field-label">Pernah menyewa kostum sebelumnya? *</span><div class="quantity-row"><label class="filter-label"><input type="radio" name="previousRental" value="yes" required data-previous-rental> Ya</label><label class="filter-label"><input type="radio" name="previousRental" value="no" required data-previous-rental> Belum</label></div></div><div class="field" id="previous-store-wrap" hidden><label for="previous-store">Nama toko rental sebelumnya *</label><input class="input" id="previous-store" name="previousStore" placeholder="Nama toko / akun rental"></div></fieldset>`;

const accountAuthPage = (register = false, adminOnly = false) => `<div class="container page-wrap"><div class="auth-layout"><div class="auth-art ${register ? 'auth-art-register' : ''}" style="background-image:linear-gradient(180deg,rgba(0,0,0,.12) 0%,rgba(0,0,0,.62) 100%),url('${register ? IMAGE_ASSETS.register : IMAGE_ASSETS.login}');background-size:cover;background-position:center top;background-repeat:no-repeat"><div class="auth-art-content"><span class="eyebrow">Akun Let'sCosplay</span><h2>${register ? 'Mulai cerita cosplay-mu.' : 'Masuk dan lanjutkan petualanganmu.'}</h2><p>Data dirimu cukup diisi sekali; saat menyewa tinggal pilih alamat pengiriman.</p></div></div><div class="auth-form-wrap"><span class="eyebrow">${register ? 'Pendaftaran akun' : 'Akses aman'}</span><h1>${register ? 'Buat akun penyewa' : adminOnly ? 'Masuk admin rental' : 'Masuk ke akunmu'}</h1><p class="muted small">${register ? 'Lengkapi data diri untuk mulai menyewa kostum.' : 'Gunakan email dan kata sandi yang terdaftar.'}</p><form class="auth-form" id="role-auth-form" data-mode="${register ? 'register' : 'login'}" data-admin-only="${adminOnly ? 'true' : 'false'}">${register ? '<div class="field"><label for="auth-name">Nama lengkap sesuai identitas</label><input class="input" id="auth-name" name="name" minlength="3" required autocomplete="name"></div>' : ''}<div class="field"><label for="auth-email">Email</label><input class="input" type="email" id="auth-email" name="email" required autocomplete="email" placeholder="nama@email.com" value="${adminOnly ? 'adminrental123@gmail.com' : ''}"></div><div class="field"><label for="auth-password">Kata sandi</label><input class="input" type="password" id="auth-password" name="password" required minlength="8" autocomplete="${register ? 'new-password' : 'current-password'}" placeholder="Masukkan kata sandi"></div>${register ? registerProfileFields() : ''}<p class="small" data-auth-error role="alert" hidden></p>${register ? '<label class="checkline"><input type="checkbox" name="terms" required> Saya menyetujui syarat penggunaan dan kebijakan privasi.</label>' : ''}<button class="button button-primary" type="submit">${register ? 'Daftar sekarang' : 'Masuk'} ${icon('arrow_forward')}</button></form><p class="auth-switch">${register ? 'Sudah memiliki akun?' : 'Belum memiliki akun?'} <button class="text-button" type="button" data-go="${register ? 'login' : 'register'}">${register ? 'Masuk' : 'Daftar penyewa'}</button></p></div></div></div>`;

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
    const eventInformation = event.eventInformation ? `<section class="event-information event-information-public"><h2>Info penting event</h2><p>${escapeHtml(event.eventInformation)}</p></section>` : '';
    return `<div class="container page-wrap"><div class="breadcrumb"><button class="text-button" data-go="events">Event komunitas</button><span>/</span><span>${escapeHtml(event.title)}</span></div><div class="detail-layout"><img class="detail-main-image" src="${escapeHtml(event.image)}" alt="Poster ${escapeHtml(event.title)}"><div class="detail-content"><span class="eyebrow">${escapeHtml(event.tier)}${event.featured ? ' · Unggulan' : ''}</span><h1>${escapeHtml(event.title)}</h1>${event.highlightText ? `<span class="event-card-highlight">${escapeHtml(event.highlightText)}</span>` : ''}<p class="detail-blurb">${escapeHtml(event.description)}</p>${event.copywriting ? `<p class="event-preview-copywriting">${escapeHtml(event.copywriting)}</p>` : ''}${eventInformation}<div class="spec-row"><span class="spec-chip">${icon('calendar_month')} ${escapeHtml(event.date)}</span><span class="spec-chip">${icon('location_on')} ${escapeHtml(event.location)}</span></div><div class="notice">${icon('auto_awesome')} Rekomendasi kostum dicocokkan dengan tema: <strong>${escapeHtml(event.theme || event.category)}</strong>${event.themeRecommendation ? ` · Tema visual: <strong>${escapeHtml(event.themeRecommendation)}</strong>` : ''}.</div><div style="margin-top:22px"><button class="button button-primary" data-go="catalog" data-query="${escapeHtml(keywords[0] || '')}" type="button">Lihat semua kostum</button></div></div></div><div class="section-heading"><div><span class="eyebrow">Smart pairing</span><h2>Kostum untuk event ini</h2></div></div><div class="product-grid">${matches.map(({ product }) => productCard(product)).join('')}</div></div>`;
};

const organizerPage = () => {
    const tier = state.param === 'free' || state.param === 'paid' ? state.param : null;
    if (!tier) {
        return `<div class="container page-wrap"><div class="page-intro"><div><span class="eyebrow">Portal komunitas & organizer</span><h1 class="page-title">Pasang iklan event</h1><p>Pilih paket untuk membuka formulir yang sesuai.</p></div></div><div class="qr-grid"><section class="panel"><h2>Iklan Gratis</h2><p class="muted small">Isi detail event, cek pratinjau, lalu kirim untuk ditinjau admin.</p><button class="button button-primary" data-go="organizer" data-id="free">Pilih Gratis</button></section><section class="panel"><h2>Iklan Prabayar</h2><p class="muted small">Unggah poster dan PDF, sesuaikan iklan, lalu bayar setelah memeriksa pratinjau.</p><button class="button button-primary" data-go="organizer" data-id="paid">Pilih Prabayar</button></section></div></div>`;
    }

    const paid = tier === 'paid';
    const plans = state.eventOptions?.promotionPlans || [
        { days: 15, price: 45000 }, { days: 30, price: 85000 }, { days: 45, price: 125000 },
        { days: 60, price: 175000 }, { days: 75, price: 225000 }, { days: 90, price: 325000 },
    ];
    const planLabel = (days) => ({ 15: '15 hari', 30: '1 bulan', 45: '45 hari', 60: '2 bulan', 75: '75 hari', 90: '3 bulan' }[days] || `${days} hari`);
    const formFields = `<div class="field"><label for="event-title">Nama event *</label><input class="input" id="event-title" name="title" required maxlength="200" placeholder="Contoh: Jakarta Anime Gathering"></div>
        <div class="form-grid"><div class="field"><label for="event-date">Tanggal *</label><input class="input" id="event-date" name="date" required maxlength="60" placeholder="Contoh: 21 November 2026"></div><div class="field"><label for="event-location">Lokasi *</label><input class="input" id="event-location" name="location" required maxlength="200" placeholder="Venue, kota"></div></div>
        <div class="field"><label for="event-theme">Tema / fandom *</label><input class="input" id="event-theme" name="theme" required maxlength="200" placeholder="Anime, fantasy, game, kimono..."></div>
        <div class="field"><label for="event-description">Deskripsi event *</label><textarea class="input" id="event-description" name="description" rows="4" required maxlength="2000" placeholder="Jelaskan acara, kegiatan, dan informasi penting"></textarea></div>`;
    const terms = paid
        ? 'Saya memahami admin memverifikasi pembayaran sebelum iklan tayang. Jika ditolak, refund sebesar 97% dari pembayaran; jika tidak ada respons admin selama 3×24 jam, refund penuh.'
        : 'Saya menyatakan event ini untuk komunitas lokal/non-komersial dan memahami event hanya tayang setelah disetujui admin.';
    const paidFields = `<div class="field"><label for="event-poster">Unggah poster event *</label><input class="input" id="event-poster" type="file" name="poster" accept="image/jpeg,image/png,image/webp" required><small class="muted">JPG, PNG, atau WebP. Maksimal 8 MB.</small></div>
        <div class="field"><label for="event-pdf">Unggah PDF rincian event *</label><input class="input" id="event-pdf" type="file" name="eventPdf" accept="application/pdf,.pdf" required><small class="muted">Maksimal 2 MB. AI akan membaca poster dan PDF untuk menyusun informasi serta materi iklan.</small></div>
        <button class="button button-secondary" type="button" data-action="event-ai-draft" ${state.eventOptions?.aiAvailable ? '' : 'disabled'}>${icon('auto_awesome')} Baca dokumen & mulai konfirmasi di chatbot</button>
        <p class="muted small" id="event-ai-status">${state.eventOptions?.aiAvailable ? 'AI membaca fakta dari file, menulis materi iklan singkat, lalu mengonfirmasi informasi satu per satu lewat chatbot.' : 'AI belum aktif. Admin perlu memasang GEMINI_API_KEY sebelum iklan Prabayar dapat dibuat.'}</p>
        ${['title', 'date', 'location', 'theme', 'description', 'eventInformation', 'copywriting', 'highlightText', 'accentColor', 'themeRecommendation', 'correctionRequest'].map((name) => `<input type="hidden" name="${name}">`).join('')}
        <div id="paid-next-step" class="stack" hidden>
            <h3>Pratinjau iklan</h3>
            <p class="muted small">Poster tampil penuh. Detail dan naskah singkat di bawahnya sudah dikonfirmasi melalui chatbot.</p>
            <section class="panel organizer-preview organizer-preview-paid" id="organizer-preview" aria-live="polite"><div class="event-preview-art">${icon('campaign')}<img id="organizer-preview-image" alt="Pratinjau poster event" hidden></div><div class="event-preview-copy"><span class="status-pill">Prabayar · Unggulan</span><p class="event-preview-highlight" id="preview-highlight"></p><h3 id="preview-title">Nama event</h3><p class="muted small" id="preview-meta">Tanggal · lokasi</p><p id="preview-description">Ringkasan event.</p><div class="event-information" id="preview-event-information" hidden></div><p id="preview-theme" class="muted small"></p><p id="preview-copywriting" class="event-preview-copywriting"></p></div></section>
            <div class="field"><label for="event-visual-preset">Pilih gaya visual iklan</label><select class="select" id="event-visual-preset" name="visualPreset"><option value="ai">Rekomendasi AI</option><option value="sakura">Sakura Pop</option><option value="neon">Cosmic Neon</option><option value="festival">Festival Ceria</option></select></div>
            <div class="field"><label for="event-duration">Durasi penayangan *</label><select class="select" id="event-duration" name="promotionDays" required>${plans.map(({ days, price }) => `<option value="${days}">${planLabel(days)} · ${money(price)}</option>`).join('')}</select><small class="muted" id="event-price-label"></small></div>
            <section class="panel event-payment-panel"><h3>Pembayaran dan refund</h3><p class="small">${escapeHtml(state.eventOptions?.paymentInstructions || 'Informasi rekening/e-wallet admin belum dikonfigurasi. Untuk versi ini, pembayaran hanya simulasi; jangan transfer uang sungguhan.')}</p><p class="small"><strong>Dompet admin:</strong> bukti yang dikirim belum dianggap masuk ke dompet. Saldo baru ditandai masuk dalam simulasi setelah admin memverifikasi dan menyetujui iklan.</p><div class="form-grid"><div class="field"><label for="refund-bank">Bank / e-wallet untuk refund *</label><input class="input" id="refund-bank" name="refundBankName" required maxlength="100"></div><div class="field"><label for="refund-account">Nomor rekening *</label><input class="input" id="refund-account" name="refundAccountNumber" required maxlength="80"></div><div class="field"><label for="refund-holder">Nama pemilik rekening *</label><input class="input" id="refund-holder" name="refundAccountHolder" required maxlength="150"></div></div></section>
            <div class="form-grid"><div class="field"><label for="organizer-email">Email untuk status pengajuan *</label><input class="input" id="organizer-email" type="email" name="organizerEmail" required maxlength="200"></div><div class="field"><label for="organizer-phone">Nomor kontak</label><input class="input" id="organizer-phone" type="tel" name="organizerPhone" maxlength="40"></div></div>
            <div class="field"><label for="event-payment-proof">Bukti transfer *</label><input class="input" id="event-payment-proof" type="file" name="paymentProof" accept="image/jpeg,image/png,image/webp" required><small class="muted">Bukti akan diverifikasi admin. Batas verifikasi 3×24 jam dari pengiriman.</small></div>
            <label class="checkline"><input type="checkbox" name="termsAccepted" required> <span>${terms}</span></label>
            <button class="button button-primary" id="paid-submit" type="submit" disabled>Kirim bukti untuk verifikasi admin ${icon('arrow_forward')}</button>
        </div>`;
    const fields = paid ? paidFields : `<div class="field"><label for="event-poster">Poster event *</label><input class="input" id="event-poster" type="file" name="poster" accept="image/jpeg,image/png,image/webp" required><small class="muted">JPG, PNG, atau WebP; maksimal 8 MB.</small></div>${formFields}`;
    const mine = mySubmissionIds();
    const submissions = state.events.filter((event) => mine.includes(String(event.id)));
    const submissionsPanel = `<section class="panel"><h2>Status pengajuan</h2>${submissions.length ? submissions.map((event) => `<article class="organizer-status-card"><strong>${escapeHtml(event.title)}</strong><p class="muted small">${escapeHtml(event.date)} · ${escapeHtml(event.status)}</p><span class="status-pill ${event.status === 'Disetujui' ? 'success' : event.status === 'Ditolak' ? 'danger' : ''}">${escapeHtml(event.paymentStatus || event.status)}</span>${event.walletStatus && event.walletStatus !== 'Belum ada' ? `<p class="small">Dompet (simulasi): ${escapeHtml(event.walletStatus)}</p>` : ''}${event.refundAmount !== null && event.refundAmount !== undefined ? `<p class="small">Refund: ${money(event.refundAmount)} · ${escapeHtml(event.refundStatus || '')}</p>` : ''}${event.paymentReviewDeadlineAt ? `<p class="muted small">Batas respons admin: ${escapeHtml(new Date(event.paymentReviewDeadlineAt).toLocaleString('id-ID'))}</p>` : ''}</article>`).join('') : '<p class="muted small">Pengajuan yang dikirim dari perangkat ini akan muncul di sini.</p>'}</section>`;

    return `<div class="container page-wrap"><div class="breadcrumb"><button class="text-button" data-go="organizer">Pilih paket</button><span>/</span><span>${paid ? 'Iklan Prabayar' : 'Iklan Gratis'}</span></div>
        <section class="organizer-hero"><div><span class="eyebrow" style="color:#ffb8d2">Portal komunitas & organizer</span><h1>${paid ? 'Siapkan promosi event' : 'Pasang iklan event komunitas'}</h1><p>${paid ? 'Cukup unggah poster dan PDF rincian event. AI menyiapkan materi promosi dan pratinjau untuk kamu pilih sebelum pembayaran.' : 'Isi detail event, lihat pratinjau, lalu kirim untuk ditinjau admin.'}</p></div><div class="organizer-hero-art" role="img" aria-label="Festival komunitas" style="background-image:url('${IMAGE_ASSETS.organizerHero}');background-size:cover;background-position:center;background-repeat:no-repeat"></div></section>
        <div class="organizer-grid ${paid ? 'organizer-grid-paid' : ''}"><section class="panel" id="organizer-submit"><h2>${paid ? 'Data event & pembayaran' : 'Form iklan Gratis'}</h2><form id="organizer-form" class="stack" data-tier="${tier}">
            <input type="hidden" name="submissionToken">
            ${fields}
            ${paid ? '' : `<div class="form-grid"><div class="field"><label for="organizer-email">Email untuk status pengajuan *</label><input class="input" id="organizer-email" type="email" name="organizerEmail" required maxlength="200"></div><div class="field"><label for="organizer-phone">Nomor kontak</label><input class="input" id="organizer-phone" type="tel" name="organizerPhone" maxlength="40"></div></div>
            <section class="panel organizer-preview" id="organizer-preview" aria-live="polite"><div class="event-preview-art">${icon('campaign')}<img id="organizer-preview-image" alt="Pratinjau poster event" hidden></div><div class="event-preview-copy"><span class="status-pill success">Komunitas · Gratis</span><p class="event-preview-highlight" id="preview-highlight"></p><h3 id="preview-title">Nama event</h3><p class="muted small" id="preview-meta">Tanggal · lokasi</p><p id="preview-description">Deskripsi event akan tampil di sini.</p><p id="preview-theme" class="muted small"></p><p id="preview-copywriting" class="event-preview-copywriting"></p></div></section>
            <label class="checkline"><input type="checkbox" name="termsAccepted" required> <span>${terms}</span></label>
            <button class="button button-primary" type="submit">${paid ? 'Kirim bukti untuk verifikasi admin' : 'Kirim untuk ditinjau admin'} ${icon('arrow_forward')}</button>`}
        </form></section>${paid ? '' : `<div class="stack">${submissionsPanel}</div>`}</div>
        ${paid ? `<div class="organizer-submissions">${submissionsPanel}</div>${organizerChatWidget()}` : ''}</div>`;
};

const organizerChatWidget = () => `<section class="organizer-chat-widget ${state.organizerChatOpen ? 'is-open' : ''}" aria-label="Chatbot konfirmasi iklan event">
    <div class="organizer-chat-panel" ${state.organizerChatOpen ? '' : 'hidden'}>
        <header><div><strong>Konsultan AI event</strong><small>Konfirmasi data iklan satu per satu</small></div><button class="icon-button" type="button" data-action="organizer-chat-toggle" aria-label="Tutup chatbot">${icon('close')}</button></header>
        <div id="organizer-chat-messages" class="organizer-chat-messages chat-messages" aria-live="polite">${state.organizerChatMessages.map(({ role, text }) => `<div class="chat-message ${role === 'assistant' ? 'bot' : 'user'}"><p>${escapeHtml(text)}</p></div>`).join('') || '<div class="chat-message bot"><p>Unggah poster dan PDF, lalu saya bantu cek informasi serta materi iklannya.</p></div>'}</div>
        <div id="organizer-flow-actions" class="organizer-flow-actions"></div>
        <form id="organizer-consult-form" autocomplete="off"><input class="input" name="message" placeholder="${state.organizerFlow?.awaitingCorrection ? 'Tulis informasi yang benar…' : 'Tanyakan atau tulis koreksi…'}" aria-label="Pesan untuk konsultan AI" maxlength="1000" required><button class="button button-primary" type="submit" aria-label="Kirim pesan">${icon('send')}</button></form>
    </div>
    <button class="organizer-chat-launcher" type="button" data-action="organizer-chat-toggle">${icon('smart_toy')} <span>${state.organizerChatOpen ? 'Tutup chatbot' : 'Konfirmasi iklan dengan AI'}</span></button>
</section>`;

const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';

const idStatusBanner = (me) => {
    const status = me.hasIdSelfie ? (me.idStatus || 'pending') : 'none';
    const info = idStatusInfo(status, me.hasIdSelfie);
    const detail = ({
        none: 'Unggah foto selfie sambil memegang KTP agar admin dapat memverifikasimu.',
        pending: 'Foto sudah diterima. Admin akan memeriksanya — status akan berubah di sini setelah diperiksa.',
        verified: `Diverifikasi admin${me.idReviewedAt ? ` pada ${me.idReviewedAt}` : ''}. Mengganti foto akan memulai verifikasi ulang.`,
        rejected: `Alasan admin: ${me.idRejectReason || 'foto tidak memenuhi syarat'}. Unggah ulang foto yang lebih jelas.`,
    })[status];
    return `<div class="id-status id-status-${status}"><span class="status-pill ${info.tone}">${icon(info.symbol)} ${info.label}</span><p>${escapeHtml(detail)}</p></div>`;
};
const accountPage = () => {
    const me = state.session;
    if (!me) return accountAuthPage(false);
    const customer = me.role === 'customer';
    const checks = customer ? [
        ['Kontak & alamat utama', Boolean(me.phone && me.address)],
        ['Media sosial & penjamin', Boolean(me.socialPlatform && me.socialHandle && me.guarantor)],
        ['Foto selfie identitas', Boolean(me.hasIdSelfie)],
        ['KTP diverifikasi admin', me.idStatus === 'verified'],
        ['Riwayat sewa terisi', Boolean(me.previousRental)],
    ] : [];
    const done = checks.filter(([, ok]) => ok).length;
    const percent = checks.length ? Math.round((done / checks.length) * 100) : 100;
    const trust = Number(me.trustScore ?? 55);
    const tabs = [['profile', 'Profil saya', 'person'], ['security', 'Keamanan', 'lock']];
    const field = (id, label, name, value, attrs = '') => `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" name="${name}" value="${escapeHtml(value ?? '')}" ${attrs}></div>`;

    const profileForm = `<form id="account-form" class="account-card" autocomplete="on">
        <header class="account-card-head"><span class="stat-icon">${icon('badge')}</span><div><h2>Informasi pribadi</h2><p class="muted small">${customer ? 'Data ini otomatis terisi saat kamu menyewa kostum.' : 'Informasi akun admin rental.'}</p></div></header>
        <div class="form-grid">
            ${field('acc-name', 'Nama lengkap', 'name', me.name, 'required minlength="3" autocomplete="name"')}
            ${field('acc-email', 'Email', 'email', me.email, 'required type="email" autocomplete="email"')}
            ${customer ? `${field('acc-phone', 'Nomor telepon aktif', 'phone', me.phone, 'required type="tel" autocomplete="tel" placeholder="08xx xxxx xxxx"')}
            <div class="field"><label for="acc-social">Media sosial</label><select class="select" id="acc-social" name="socialPlatform" required><option value="">Pilih platform</option>${['Instagram', 'TikTok', 'X', 'Lainnya'].map((item) => `<option ${me.socialPlatform === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div>
            ${field('acc-handle', 'Username akun', 'socialHandle', me.socialHandle, 'required placeholder="@username"')}
            ${field('acc-guarantor', 'Nomor telepon penjamin', 'guarantor', me.guarantor, 'required type="tel" placeholder="Nomor keluarga/kerabat"')}
            <div class="field span-2"><label for="acc-address">Alamat utama</label><textarea class="textarea" id="acc-address" name="address" required minlength="10" autocomplete="street-address" placeholder="Jalan, nomor rumah, RT/RW, kecamatan, kota, kode pos">${escapeHtml(me.address || '')}</textarea><small class="muted">Menjadi alamat pengiriman bawaan. Saat checkout kamu tetap bisa menggantinya per pesanan.</small></div>` : ''}
        </div>
        ${customer ? `<div class="account-subsection"><h3>${icon('verified_user')} Verifikasi KTP / identitas</h3>${idStatusBanner(me)}<div class="id-card ${me.hasIdSelfie && me.idStatus !== 'rejected' ? 'is-ok' : 'is-missing'}"><img id="account-selfie-preview" alt="Pratinjau foto identitas baru" hidden><div><strong>${me.hasIdSelfie ? 'Foto identitas tersimpan' : 'Foto identitas belum diunggah'}</strong><small class="muted">${me.hasIdSelfie ? escapeHtml(me.idSelfieName || 'selfie-identitas.jpg') + ' · hanya dilihat admin saat verifikasi' : 'Wajib agar pesananmu bisa diverifikasi.'}</small></div><label class="button button-secondary button-small file-button">${icon('upload')} ${me.hasIdSelfie ? 'Ganti foto' : 'Unggah foto'}<input id="account-selfie" name="idSelfie" type="file" accept="image/*" hidden></label></div></div>
        <div class="account-subsection"><h3>${icon('history')} Riwayat sewa</h3><p class="small" style="margin:0">${me.previousRental === 'yes' ? `Pernah menyewa${me.previousStore ? ' di <strong>' + escapeHtml(me.previousStore) + '</strong>' : ''}.` : me.previousRental === 'no' ? 'Belum pernah menyewa kostum.' : 'Belum diisi.'} <span class="muted">Riwayat dipakai untuk skor kepercayaan; hubungi admin bila ingin mengubahnya.</span></p></div>` : ''}
        <footer class="account-actions"><button class="button button-quiet" type="button" data-action="account-reset">Batalkan perubahan</button><button class="button button-primary" type="submit">${icon('check')} Simpan perubahan</button></footer>
    </form>`;

    const securityForm = `<form id="password-form" class="account-card" autocomplete="off">
        <header class="account-card-head"><span class="stat-icon">${icon('lock')}</span><div><h2>Ganti kata sandi</h2><p class="muted small">Gunakan minimal 8 karakter. Perangkat lain akan diminta masuk ulang.</p></div></header>
        <div class="stack">
            <div class="field"><label for="pw-current">Kata sandi saat ini</label><input class="input" id="pw-current" name="currentPassword" type="password" required autocomplete="current-password"></div>
            <div class="form-grid"><div class="field"><label for="pw-new">Kata sandi baru</label><input class="input" id="pw-new" name="newPassword" type="password" required minlength="8" autocomplete="new-password"></div><div class="field"><label for="pw-confirm">Ulangi kata sandi baru</label><input class="input" id="pw-confirm" name="newPasswordConfirmation" type="password" required minlength="8" autocomplete="new-password"></div></div>
            <p class="small auth-error" data-password-error role="alert" hidden></p>
        </div>
        <footer class="account-actions"><button class="button button-primary" type="submit">${icon('lock_reset')} Perbarui kata sandi</button></footer>
    </form>`;

    return `<div class="container page-wrap"><div class="page-intro"><div><span class="eyebrow">Akun saya</span><h1 class="page-title">Pengaturan akun</h1><p>Kelola data diri, alamat, dan keamanan akunmu di satu tempat.</p></div>${customer ? `<button class="button button-secondary" data-go="orders" type="button">${icon('receipt_long')} Pesanan saya</button>` : `<button class="button button-secondary" data-go="admin" type="button">${icon('dashboard')} Dashboard</button>`}</div>
    <div class="account-layout">
        <aside class="account-side">
            <section class="account-card account-summary"><span class="avatar avatar-lg">${escapeHtml(initials(me.name))}</span><h2>${escapeHtml(me.name)}</h2><p class="muted small">${escapeHtml(me.email)}</p><span class="status-pill ${customer ? '' : 'success'}">${customer ? 'Penyewa' : 'Admin Rental'}</span>${customer ? (() => { const info = idStatusInfo(me.hasIdSelfie ? (me.idStatus || 'pending') : 'none', me.hasIdSelfie); return `<span class="status-pill ${info.tone}" style="margin-top:8px">${icon(info.symbol)} ${info.label}</span>`; })() : ''}
                ${customer ? `<div class="trust-meter"><div class="trust-meter-top"><span>Skor kepercayaan</span><strong>${trust}/100</strong></div><div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${trust}"><span style="width:${trust}%"></span></div><small class="muted">${trust >= 85 ? 'Deposit kamu diringankan 50%.' : 'Capai 85 untuk keringanan deposit 50%. Selesaikan sewa tepat waktu untuk menaikkan skor.'}</small></div>` : ''}</section>
            ${customer ? `<section class="account-card"><div class="trust-meter-top"><h3 style="margin:0">Kelengkapan profil</h3><strong>${percent}%</strong></div><div class="meter"><span style="width:${percent}%"></span></div><ul class="check-list">${checks.map(([label, ok]) => `<li class="${ok ? 'ok' : ''}">${icon(ok ? 'check_circle' : 'radio_button_unchecked', ok ? 'filled' : '')} ${label}</li>`).join('')}</ul></section>` : ''}
            <nav class="account-card account-tabs" aria-label="Menu pengaturan">${tabs.map(([key, label, symbol]) => `<button type="button" class="${state.accountTab === key ? 'active' : ''}" data-account-tab="${key}">${icon(symbol)} ${label}</button>`).join('')}<button type="button" class="danger" data-action="logout">${icon('logout')} Keluar</button></nav>
        </aside>
        <div class="account-main">${state.accountTab === 'security' ? securityForm : profileForm}</div>
    </div></div>`;
};

const adminMenu = [['overview', 'Dashboard Admin', 'dashboard'], ['inventory', 'Kelola Katalog', 'checkroom'], ['orders', 'Verifikasi Pesanan Masuk', 'fact_check'], ['ktp', 'Verifikasi KTP', 'badge'], ['reviews', 'Ulasan Pembeli', 'rate_review'], ['events', 'Kurasi Iklan Event', 'campaign'], ['qr', 'Generator QR Code Event', 'qr_code_2'], ['payments', 'Rekening & Alamat Retur', 'account_balance']];
const adminShell = (content) => `<div class="admin-shell"><div class="admin-backdrop" data-action="menu"></div><aside class="admin-sidebar" id="admin-sidebar"><div class="admin-label">Manajemen rental</div><nav class="admin-nav">${adminMenu.map(([section, label, symbol]) => `<a href="#admin/${section}" data-admin-section="${section}" class="${state.adminSection === section ? 'active' : ''}">${icon(symbol)} ${label}</a>`).join('')}<a href="#home" data-go="home" class="only-mobile">${icon('storefront')} Lihat toko</a><a href="#account" data-go="account" class="only-mobile ${state.page === 'account' ? 'active' : ''}">${icon('manage_accounts')} Pengaturan akun</a></nav><div class="notice" style="margin:25px 3px 0">Perubahan katalog, pesanan, dan event tersimpan langsung ke database.</div></aside><section class="admin-content">${content}</section></div>`;

const topSellingChart = () => {
    const days = { 7: 7, 30: 30 }[state.chartPeriod] || null;
    const since = days ? Date.now() - days * 86400000 : 0;
    const byUnits = state.chartMetric !== 'revenue';
    const stats = new Map();
    for (const order of state.orders) {
        if (since && new Date(order.createdAtIso || 0).getTime() < since) continue;
        const key = String(order.productId ?? order.productName);
        const entry = stats.get(key) || { key, name: order.productName || 'Kostum', units: 0, orders: 0, revenue: 0 };
        entry.units += Number(order.quantity || 1);
        entry.orders += 1;
        entry.revenue += Number(order.total || 0) - Number(order.deposit || 0);
        stats.set(key, entry);
    }
    const rows = [...stats.values()]
        .map((row) => ({ ...row, product: state.inventory.find((item) => String(item.id) === row.key), value: byUnits ? row.units : row.revenue }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
        .slice(0, 8);
    const top = Math.max(1, ...rows.map((row) => row.value));
    const fmt = (value) => (byUnits ? `${value}` : value >= 1000000 ? `${(value / 1000000).toFixed(1).replace('.0', '')} jt` : `${Math.round(value / 1000)} rb`);
    const periodTabs = [['all', 'Semua'], ['30', '30 hari'], ['7', '7 hari']];
    const bars = rows.map((row) => {
        const stock = row.product ? row.product.stock : null;
        const height = Math.max(6, Math.round((row.value / top) * 200));
        return `<div class="hist-col" title="${escapeHtml(`${row.name}: ${row.units} unit · ${row.orders} pesanan · ${money(row.revenue)}${stock === null ? '' : ` · stok ${stock}`}`)}"><span class="hist-val">${fmt(row.value)}</span><div class="hist-bar rank-${rows.indexOf(row) + 1 <= 3 ? 'top' : 'rest'}" style="height:${height}px"></div></div>`;
    }).join('');
    const labels = rows.map((row) => {
        const stock = row.product ? row.product.stock : null;
        return `<div class="hist-label"><strong>${escapeHtml(row.name)}</strong><span class="hist-stock ${stock === null ? '' : stockTone(stock)}">${stock === null ? 'Dihapus' : `Stok ${stock}`}</span></div>`;
    }).join('');
    return `<section class="panel" style="margin-top:16px"><div class="admin-content-header" style="margin-bottom:10px"><div><h2>Kostum terlaris · histogram penjualan</h2><p class="muted small" style="margin:4px 0 0">${byUnits ? 'Jumlah unit kostum yang disewa' : 'Pendapatan sewa (di luar deposit)'} per kostum, lengkap dengan sisa stok saat ini.</p></div><div class="chart-controls"><div class="orders-tabs" style="margin:0">${[['units', 'Unit disewa'], ['revenue', 'Pendapatan']].map(([key, label]) => `<button type="button" class="orders-tab ${state.chartMetric === key ? 'active' : ''}" data-chart-metric="${key}">${label}</button>`).join('')}</div><div class="orders-tabs" style="margin:0">${periodTabs.map(([key, label]) => `<button type="button" class="orders-tab ${state.chartPeriod === key ? 'active' : ''}" data-chart-period="${key}">${label}</button>`).join('')}</div></div></div>${rows.length ? `<div class="hist" role="img" aria-label="Histogram kostum terlaris"><div class="hist-axis"><span style="bottom:200px">${fmt(top)}</span><span style="bottom:100px">${fmt(Math.round(top / 2))}</span><span style="bottom:0">0</span></div><div class="hist-scroll"><div class="hist-plot"><i style="bottom:0"></i><i style="bottom:100px"></i><i style="bottom:200px"></i><div class="hist-cols" style="--cols:${rows.length}">${bars}</div></div><div class="hist-labels" style="--cols:${rows.length}">${labels}</div></div></div>` : '<div class="empty-state">Belum ada pesanan pada periode ini. Histogram terisi otomatis saat pesanan masuk.</div>'}</section>`;
};

const topRentedTable = () => {
    const stats = new Map();
    for (const order of state.orders) {
        const key = String(order.productId ?? order.productName);
        const entry = stats.get(key) || { rentals: 0, days: 0, active: 0, income: 0 };
        entry.rentals += Number(order.quantity || 1);
        entry.days += Number(order.days || 0);
        entry.income += Number(order.total || 0) - Number(order.deposit || 0);
        if (order.stage < 7) entry.active += Number(order.quantity || 1);
        stats.set(key, entry);
    }
    const rows = state.inventory
        .map((product) => ({ product, ...(stats.get(String(product.id)) || { rentals: 0, days: 0, active: 0, income: 0 }) }))
        .sort((a, b) => b.rentals - a.rentals || b.days - a.days || a.product.name.localeCompare(b.product.name))
        .slice(0, 5);
    const topRentals = Math.max(1, ...rows.map((row) => row.rentals));
    const statusOf = (row) => row.product.stock <= 0 ? ['Habis', 'danger'] : row.product.stock <= 1 ? ['Menipis', 'warning'] : ['Tersedia', 'success'];
    return `<section class="panel" style="margin-top:16px"><div class="admin-content-header" style="margin-bottom:10px"><div><h2>Ringkasan stok · kostum paling sering disewa</h2><p class="muted small" style="margin:4px 0 0">Diurutkan dari jumlah penyewaan tertinggi, lengkap dengan sisa stok saat ini.</p></div><button class="text-button" data-admin-section="inventory">Kelola katalog</button></div>${rows.length ? `<div class="table-wrap"><table class="data-table rank-table"><thead><tr><th>#</th><th>Kostum</th><th>Penyewaan</th><th>Total hari</th><th>Sedang disewa</th><th>Stok tersedia</th><th>Status</th></tr></thead><tbody>${rows.map((row, index) => { const [label, tone] = statusOf(row); const units = row.product.stock + row.active; return `<tr><td><span class="rank-badge rank-${index + 1}">${index + 1}</span></td><td><div class="rank-product"><img src="${escapeHtml(row.product.image)}" alt="" loading="lazy"><span><strong>${escapeHtml(row.product.name)}</strong><small>${escapeHtml(row.product.category)} · ${money(row.product.price)}/hari</small></span></div></td><td><div class="rank-bar"><span style="width:${Math.round((row.rentals / topRentals) * 100)}%"></span></div><strong>${row.rentals}×</strong></td><td>${row.days} hari</td><td>${row.active}</td><td><strong>${row.product.stock}</strong> <span class="muted small">/ ${units} unit</span></td><td><span class="status-pill ${tone}">${label}</span></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted small">Belum ada kostum di katalog.</p>'}${state.orders.length ? '' : '<p class="muted small" style="margin:10px 0 0">Belum ada pesanan, jadi urutan sementara mengikuti abjad. Peringkat akan terisi otomatis saat pesanan masuk.</p>'}</section>`;
};

const adminOverview = () => {
    const pending = state.orders.filter((order) => order.stage < 3).length;
    const active = state.orders.filter((order) => order.stage >= 3 && order.stage < 7).length;
    const revenue = state.orders.reduce((sum, order) => sum + Number(order.dp || 0), 0);
    const adRevenue = state.events.filter((event) => event.tier === 'Prabayar' && event.status === 'Disetujui').length * 250000;
    const featuredCount = state.events.filter((event) => event.featured && event.status === 'Disetujui').length;
    return `<div class="admin-content-header"><div><span class="eyebrow">Ringkasan toko</span><h1>Selamat datang, Admin</h1></div><button class="button button-primary" data-action="add-product" type="button">${icon('add')} Tambah kostum</button></div><div class="stat-grid">${[['checkroom', 'Rental aktif', active, `${state.orders.length} pesanan total`], ['pending_actions', 'Verifikasi menunggu', pending, pending ? 'Perlu ditinjau' : 'Semua sudah diproses'], ['campaign', 'Pendapatan iklan event', money(adRevenue), `${featuredCount} iklan unggulan tayang`], ['payments', 'DP & pembayaran masuk', money(revenue), 'Dari pesanan penyewa']].map(([symbol, label, value, change]) => `<article class="stat-card"><div class="stat-card-top"><span>${label}</span><span class="stat-icon">${icon(symbol)}</span></div><strong>${value}</strong><span class="stat-change">${change}</span></article>`).join('')}</div><div class="admin-two-col"><section class="panel"><div class="admin-content-header" style="margin-bottom:10px"><h2>Pesanan terbaru</h2><button class="text-button" data-admin-section="orders">Semua pesanan</button></div>${state.orders.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Penyewa</th><th>Kostum</th><th>Status</th></tr></thead><tbody>${state.orders.slice(-5).reverse().map((order) => `<tr><td>${escapeHtml(order.customerName)}</td><td>${escapeHtml(orderProduct(order).name)}</td><td><span class="status-pill">${escapeHtml(orderStages[order.stage])}</span></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Pesanan terbaru akan muncul di sini.</p>'}</section><section class="panel"><div class="admin-content-header" style="margin-bottom:10px"><h2>Perlu perhatian</h2></div><div class="admin-list"><div class="admin-item"><span class="stat-icon">${icon('fact_check')}</span><div class="admin-item-main"><strong>${pending} verifikasi pesanan</strong><small>Periksa data penyewa dan bukti DP</small></div></div><div class="admin-item"><span class="stat-icon">${icon('campaign')}</span><div class="admin-item-main"><strong>${state.events.filter((event) => event.status === 'Menunggu review').length} iklan event menunggu</strong><small>Tinjau poster dan bukti bayar</small></div></div><div class="admin-item"><span class="stat-icon">${icon('inventory_2')}</span><div class="admin-item-main"><strong>${state.inventory.filter((item) => item.stock <= 1).length} kostum stok menipis</strong><small>Stok tersisa 1 atau habis</small></div></div></div></section></div>${topSellingChart()}${topRentedTable()}`;
};

const adminInventory = () => `<div class="admin-content-header"><div><span class="eyebrow">Produk & ketersediaan</span><h1>Manajemen katalog</h1></div><button class="button button-primary" data-action="add-product">${icon('add')} Tambah kostum</button></div><section class="panel"><div class="admin-toolbar"><span class="muted small">${state.inventory.length} item di katalog · ${state.inventory.reduce((sum, item) => sum + item.stock, 0)} unit total</span><input class="input" data-admin-search placeholder="Cari nama kostum" aria-label="Cari kostum"></div><div class="inventory-row inventory-header"><span></span><span>Kostum</span><span>Harga / hari</span><span>Stok per ukuran</span><span>Deposit</span><span>Aksi</span></div>${state.inventory.map((product) => `<div class="inventory-row" data-inventory-row="${escapeHtml(product.name.toLowerCase())}"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)} · ${escapeHtml(product.series)} · ${(product.images || []).length} foto</small></span><span>${money(product.price)}</span><span class="stock-cell"><span class="stock-total ${stockTone(product.stock)}">Total ${product.stock} unit</span><span class="size-chips">${product.size.map((label) => `<span class="size-chip ${stockTone(sizeStockOf(product, label))}">${escapeHtml(label)} · ${sizeStockOf(product, label)}</span>`).join('')}</span></span><span>${money(product.deposit)}</span><span class="row-actions"><button class="button button-soft button-small" data-action="stock-modal" data-id="${escapeHtml(product.id)}">${icon('add_box')} Stok</button><button class="button button-secondary button-small" data-action="edit-product" data-id="${escapeHtml(product.id)}">Edit</button><button class="button button-danger button-small" data-action="delete-product" data-id="${escapeHtml(product.id)}" aria-label="Hapus ${escapeHtml(product.name)}">${icon('delete')}</button></span></div>`).join('')}</section>`;

const ktpPill = (status, hasPhoto = true) => { const info = idStatusInfo(status, hasPhoto); return `<span class="status-pill ${info.tone}">${icon(info.symbol)} ${info.label}</span>`; };
const orderExtraDetails = (order) => `<div class="order-extra"><p class="small"><strong>Item pesanan</strong></p><table class="data-table"><thead><tr><th>Ukuran</th><th>Jumlah</th></tr></thead><tbody>${(order.items || []).map((item) => `<tr><td>${escapeHtml(item.size)}</td><td>${item.qty}</td></tr>`).join('')}</tbody></table>${order.isGroup ? `<p class="small">${icon('groups')} Pesanan kelompok: <strong>${escapeHtml(order.groupName)}</strong></p>${order.groupMembers ? `<pre class="members-list">${escapeHtml(order.groupMembers)}</pre>` : ''}` : ''}<p class="small">Status KTP: ${ktpPill(order.idStatus, order.hasIdSelfie)} ${order.userId ? `<button class="button button-secondary button-small" type="button" data-action="ktp-view" data-id="${order.userId}">Buka verifikasi KTP</button>` : ''}</p></div>`;
const ADMIN_ORDER_TABS = ['Semua', 'Perlu Verifikasi', 'Siap Kirim / Ditunda', 'Disewa & Retur', 'Selesai'];
const adminOrderBucket = (order) => {
    const stage = order.stage ?? 0;
    return stage < 2 ? 'Perlu Verifikasi' : stage < 5 ? 'Siap Kirim / Ditunda' : stage < 7 ? 'Disewa & Retur' : 'Selesai';
};
const adminDocTile = (title, meta, image, alt, emptyText) => `<div style="min-width:0;border:1px solid rgba(128,128,128,.3);border-radius:14px;padding:12px;display:grid;gap:8px;align-content:start"><strong class="small">${title}</strong><span class="muted small" style="word-break:break-word">${meta}</span>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" data-action="toggle-doc-zoom" title="Klik untuk memperbesar" style="width:100%;aspect-ratio:4 / 3;object-fit:cover;border-radius:10px;cursor:zoom-in;background:rgba(128,128,128,.12)">` : `<div class="muted small" style="aspect-ratio:4 / 3;display:grid;place-items:center;border:1px dashed rgba(128,128,128,.4);border-radius:10px;text-align:center;padding:8px">${emptyText}</div>`}</div>`;
const orderReturnReady = (order) => Boolean(order.returnTrackingNumber && order.hasReturnProof);
const adminInfoTile = (label, value, note = '') => `<div style="min-width:0;padding:8px 10px;border:1px solid rgba(128,128,128,.28);border-radius:10px"><div class="muted small">${label}</div><strong class="small" style="word-break:break-word">${value}</strong>${note ? `<div class="muted small">${note}</div>` : ''}</div>`;
const adminPaymentPill = (order) => (order.isPaidOff
    ? `<span class="status-pill success">${icon('check_circle', 'filled')} Lunas</span>`
    : `<span class="status-pill danger">${icon('payments')} Belum Lunas · Sisa ${money(Number(order.remainingAmount || 0))}</span>`);
const adminOrderActions = (order) => {
    const id = escapeHtml(order.id);
    const stage = order.stage ?? 0;
    const btn = (action, tone, label, extra = '') => `<button class="button ${tone} button-small" data-action="${action}" data-id="${id}" type="button" ${extra}>${label}</button>`;
    const needKtp = stage < 2 && order.userId && order.idStatus !== 'verified';
    const primary = [];
    const secondary = [btn('inspect-order', 'button-secondary', 'Detail penyewa')];
    if (stage < 2) {
        primary.push(needKtp
            ? `<button class="button button-primary button-small" data-action="ktp-view" data-id="${order.userId}" type="button">Verifikasi KTP dulu</button>`
            : btn('approve-order', 'button-primary', 'Setujui Verifikasi'));
    } else if (stage === 2) {
        primary.push(btn('ship-schedule', 'button-primary', `${icon('local_shipping')} Atur Jadwal &amp; Resi Kirim`));
        if (!order.isPaidOff) primary.push(btn('hold-shipping', 'button-soft', `${icon('pause_circle')} Tunda Kirim`));
        if (order.shippingHoldReason) primary.push(btn('release-hold', 'button-soft', 'Lepas Tunda'));
    } else if (stage < 5) {
        primary.push(btn('receive-order', 'button-primary', 'Tandai Diterima Penyewa'));
    } else if (stage < 7) {
        primary.push(orderReturnReady(order)
            ? btn('confirm-return', 'button-primary', `${icon('verified')} Konfirmasi Retur &amp; Kembalikan Deposit`)
            : btn('confirm-return', 'button-primary', 'Konfirmasi Retur &amp; Kembalikan Deposit', 'disabled aria-disabled="true" title="Menunggu penyewa mengirim resi &amp; foto paket retur"'));
    } else {
        primary.push('<button class="button button-soft button-small" type="button" disabled>Selesai</button>');
    }
    secondary.push(`<button class="button button-soft button-small" data-action="reject-order" data-id="${id}" type="button" style="color:var(--red)">Tolak</button>`);
    return `<div style="display:flex;gap:8px;flex-wrap:wrap">${primary.join('')}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${secondary.join('')}</div>`;
};
const adminOrderCard = (order) => {
    const product = orderProduct(order);
    const stage = order.stage ?? 0;
    const aiValid = Boolean(order.idSelfieImage && order.paymentProofImage);
    const notes = [];
    if (stage === 2 && !order.isPaidOff) notes.push(`<div class="deposit-note">${icon('warning')} Penyewa belum lunas (sisa ${money(Number(order.remainingAmount || 0))}) — resi kirim terkunci sampai pelunasan diterima.</div>`);
    if (stage === 2 && order.isPaidOff && order.hasFinalPaymentProof) notes.push(`<div class="deposit-note">${icon('check_circle', 'filled')} Pelunasan sudah masuk${order.finalPaidAt ? ` (${escapeHtml(order.finalPaidAt)})` : ''} — cek bukti pelunasan di Detail penyewa, lalu atur jadwal &amp; resi kirim.</div>`);
    if (order.shippingHoldReason) notes.push(`<div class="deposit-note">${icon('pause_circle')} <strong>Kirim ditunda:</strong> ${escapeHtml(order.shippingHoldReason)}</div>`);
    if (stage >= 5 && stage < 7) {
        if (orderReturnReady(order)) notes.push(`<div class="deposit-note"><span class="status-pill success">${icon('verified', 'filled')} Bukti retur lengkap</span> Resi &amp; foto paket sudah diterima — periksa di Detail penyewa sebelum konfirmasi.</div>`);
        else {
            const missing = [!order.returnTrackingNumber ? 'nomor resi' : '', !order.hasReturnProof ? 'foto paket retur' : ''].filter(Boolean).join(' &amp; ');
            notes.push(`<div class="deposit-note">${icon('hourglass_top')} Menunggu penyewa menginput ${missing}. Konfirmasi retur &amp; pengembalian deposit terkunci sampai bukti lengkap.</div>`);
        }
    }
    return `<article class="order-admin-card" style="display:grid;grid-template-columns:88px minmax(0,1fr);gap:14px 18px;align-items:start"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" style="width:88px;height:112px;object-fit:cover;border-radius:12px"><div style="min-width:0;display:grid;gap:12px"><div><span class="eyebrow">${escapeHtml(order.id)}</span><h3 style="margin:2px 0">${escapeHtml(product.name)} · ${escapeHtml(order.size)}${order.quantity > 1 ? ` · ${order.quantity} kostum` : ''}</h3><p class="muted small" style="margin:0">${escapeHtml(order.customerName)} · ${order.days} hari · ${escapeHtml(order.socialPlatform || '')} ${escapeHtml(order.socialHandle || '')} · Penjamin ${escapeHtml(order.guarantor || '-')}</p>${order.isGroup ? `<p class="small group-line" style="margin:4px 0 0">${icon('groups')} Kelompok: <strong>${escapeHtml(order.groupName)}</strong></p>` : ''}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><span class="status-pill">${escapeHtml(orderStages[stage])}</span>${adminPaymentPill(order)}${order.shippingHoldReason ? `<span class="status-pill danger">${icon('pause_circle')} Kirim ditunda</span>` : ''}${ktpPill(order.idStatus, order.hasIdSelfie)}<span class="status-pill ${aiValid ? 'success' : 'danger'}">${icon(aiValid ? 'verified_user' : 'warning')} AI ${aiValid ? 'Dokumen &amp; bukti valid' : 'Perlu pemeriksaan manual'}</span></div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">${adminInfoTile('Jadwal kirim', escapeHtml(formatDate(orderShipDate(order))), order.estimatedShipDate ? '' : 'estimasi H-1')}${adminInfoTile('Mulai sewa', escapeHtml(formatDate(order.rentalDate)))}${adminInfoTile('Wajib retur', escapeHtml(formatDate(orderReturnDue(order))))}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">${adminInfoTile('Resi kirim JNE', order.trackingNumber ? escapeHtml(order.trackingNumber) : '—')}${adminInfoTile('Resi retur penyewa', order.returnTrackingNumber ? escapeHtml(order.returnTrackingNumber) : '—', order.returnedAt ? `Dikirim ${escapeHtml(order.returnedAt)}` : (stage >= 5 && stage < 7 ? 'Belum diinput' : ''))}${adminInfoTile('Pembayaran', `DP ${money(order.dp)}`, `Bukti: ${escapeHtml(order.paymentProofName || 'unggahan demo')}${order.finalPaymentProofName ? ` · Pelunasan: ${escapeHtml(order.finalPaymentProofName)}` : ''}`)}</div>${notes.join('')}</div><div style="grid-column:1 / -1;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid rgba(128,128,128,.25);padding-top:12px">${adminOrderActions(order)}</div></article>`;
};
const adminOrders = () => {
    const counts = Object.fromEntries(ADMIN_ORDER_TABS.map((tab) => [tab, tab === 'Semua' ? state.orders.length : state.orders.filter((order) => adminOrderBucket(order) === tab).length]));
    const visible = state.orders.filter((order) => state.adminOrderFilter === 'Semua' || adminOrderBucket(order) === state.adminOrderFilter);
    return `<div class="admin-content-header"><div><span class="eyebrow">Verifikasi penyewa & pembayaran</span><h1>Verifikasi pesanan</h1></div><span class="status-pill">${state.orders.filter((order) => order.stage < 3).length} menunggu</span></div><div class="orders-tabs">${ADMIN_ORDER_TABS.map((tab) => `<button class="orders-tab ${state.adminOrderFilter === tab ? 'active' : ''}" data-admin-order-filter="${tab}" type="button">${tab} (${counts[tab]})</button>`).join('')}</div>${visible.length ? visible.map(adminOrderCard).join('') : `<div class="empty-state">${state.orders.length ? 'Tidak ada pesanan di tahap ini.' : 'Belum ada pesanan penyewa.'}</div>`}`;
};

const adminShipping = () => `<div class="admin-content-header"><div><span class="eyebrow">Fulfillment</span><h1>Pengiriman & retur</h1></div></div>${state.orders.length ? state.orders.map((order) => { const product = orderProduct(order); return `<article class="order-admin-card"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(order.id)} · ${escapeHtml(order.customerName)}</h3><p class="muted small">${escapeHtml(product.name)} · ${escapeHtml(order.size)}${order.isGroup ? ` · Kelompok ${escapeHtml(order.groupName)}` : ''} · Jadwal sewa: ${escapeHtml(order.rentalDate || 'Belum diatur')}</p><span class="status-pill ${order.stage >= 5 ? 'success' : ''}">${escapeHtml(orderStages[order.stage])}</span><p class="small">${order.trackingNumber ? `JNE Express · Resi ${escapeHtml(order.trackingNumber)}` : 'Nomor resi belum ditambahkan'}</p></div><div class="order-admin-actions"><button class="button button-secondary button-small" data-action="shipping-order" data-id="${escapeHtml(order.id)}">${order.trackingNumber ? 'Ubah resi' : 'Tambah resi'}</button><button class="button button-primary button-small" data-action="advance-order" data-id="${escapeHtml(order.id)}">${order.stage < 7 ? 'Update status' : 'Selesai'}</button><button class="button button-soft button-small" data-action="refund-deposit" data-id="${escapeHtml(order.id)}">Refund deposit</button></div></article>`; }).join('') : '<div class="empty-state">Belum ada pesanan untuk diproses.</div>'}`;

const adminEvents = () => {
    const count = (status) => state.events.filter((event) => event.status === status).length;
    const pendingCount = count('Menunggu review');
    const filter = state.eventFilter ?? (pendingCount ? 'Menunggu review' : 'Semua');
    const order = { 'Menunggu review': 0, Disetujui: 1, Ditolak: 2 };
    const list = state.events
        .filter((event) => filter === 'Semua' || event.status === filter)
        .sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || Number(b.featured) - Number(a.featured) || Number(b.id) - Number(a.id));
    const tabs = [['Menunggu review', 'Menunggu', pendingCount], ['Disetujui', 'Tayang', count('Disetujui')], ['Ditolak', 'Ditolak', count('Ditolak')], ['Semua', 'Semua', state.events.length]];
    const card = (event) => {
        const matches = matchingProducts(`${event.theme} ${event.title}`);
        const paid = event.tier === 'Prabayar';
        const tone = event.status === 'Disetujui' ? 'success' : event.status === 'Ditolak' ? 'danger' : 'warning';
        const actions = event.status === 'Menunggu review'
            ? `<button class="button button-primary button-small" data-action="approve-event" data-id="${escapeHtml(event.id)}">${icon('check')} ACC & tayangkan</button><button class="button button-danger button-small" data-action="reject-event" data-id="${escapeHtml(event.id)}">Tolak</button>`
            : event.status === 'Disetujui'
                ? `<button class="button ${event.featured ? 'button-soft' : 'button-secondary'} button-small" data-action="toggle-featured" data-id="${escapeHtml(event.id)}">${icon('star', event.featured ? 'filled' : '')} ${event.featured ? 'Lepas unggulan' : 'Jadikan unggulan'}</button><button class="button button-secondary button-small" data-action="event-pairing" data-id="${escapeHtml(event.id)}">Lihat pairing</button><button class="button button-quiet button-small" data-action="reject-event" data-id="${escapeHtml(event.id)}">Turunkan</button>`
                : paid && event.paymentStatus === 'Refund perlu diproses'
                    ? `<button class="button button-secondary button-small" data-action="complete-event-refund" data-id="${escapeHtml(event.id)}">Tandai refund selesai</button>`
                    : '';
        const proof = paid ? event.paymentProofImage
            ? `<button class="text-button small" type="button" data-action="view-proof" data-id="${escapeHtml(event.id)}">${icon('receipt_long')} Lihat bukti bayar · ${escapeHtml(event.paymentProofName || 'unggahan')}</button>`
            : '<p class="small auth-error">Bukti pembayaran belum tersedia.</p>' : '';
        const pdf = paid && event.eventPdf
            ? `<a class="text-button small" href="${escapeHtml(event.eventPdf)}" download="${escapeHtml(event.eventPdfName || 'rincian-event.pdf')}">${icon('picture_as_pdf')} Buka PDF · ${escapeHtml(event.eventPdfName || 'PDF event')}</a>` : '';
        const finance = paid ? `<div class="ai-pairing-preview"><strong>Pembayaran: ${escapeHtml(event.paymentStatus || 'Menunggu verifikasi')}</strong><span>Dompet admin (simulasi): ${escapeHtml(event.walletStatus || 'Belum masuk')}</span><span>Durasi ${event.promotionDays} hari · ${money(event.promotionPrice)} · Batas review: ${event.paymentReviewDeadlineAt ? escapeHtml(new Date(event.paymentReviewDeadlineAt).toLocaleString('id-ID')) : '-'}</span>${event.refundAmount !== null && event.refundAmount !== undefined ? `<span>Refund ${money(event.refundAmount)} · ${escapeHtml(event.refundStatus || '')} · ${escapeHtml(event.refundReason || '')}</span>` : ''}<span>Kontak: ${escapeHtml(event.organizerEmail || '-')} · Rekening refund: ${escapeHtml(event.refundBankName || '-')} ${escapeHtml(event.refundAccountNumber || '')} a.n. ${escapeHtml(event.refundAccountHolder || '')}</span></div>` : '';
        const preview = `<div class="event-admin-preview" style="--event-accent:${escapeHtml(event.accentColor || '#f45193')}"><strong>${escapeHtml(event.highlightText || '')}</strong><p>${escapeHtml(event.copywriting || '')}</p><p>${escapeHtml(event.description || '')}</p>${event.eventInformation ? `<p><strong>Info penting:</strong> ${escapeHtml(event.eventInformation)}</p>` : ''}<small>Tema visual: ${escapeHtml(event.themeRecommendation || event.theme)}</small></div>`;
        return `<article class="order-admin-card event-curation-card"><img src="${escapeHtml(event.image)}" alt="Poster ${escapeHtml(event.title)}"><div><div class="chip-row"><span class="status-pill ${tone}">${escapeHtml(event.status)}</span><span class="status-pill ${paid ? '' : 'success'}">${escapeHtml(event.tier)}</span>${event.featured ? `<span class="status-pill">${icon('star', 'filled')} Unggulan</span>` : ''}</div><h3>${escapeHtml(event.title)}</h3><p class="muted small">${icon('calendar_month')} ${escapeHtml(event.date)} · ${icon('location_on')} ${escapeHtml(event.location)}</p><p class="small">Tema: <strong>${escapeHtml(event.theme)}</strong></p><p class="small">${escapeHtml(event.description || '')}</p>${preview}${finance}${event.correctionRequest ? `<p class="small"><strong>Catatan/koreksi pemilik:</strong> ${escapeHtml(event.correctionRequest)}</p>` : ''}<div class="stack">${pdf}${proof}${paid && event.refundProofImage ? `<button class="text-button small" type="button" data-action="view-refund-proof" data-id="${escapeHtml(event.id)}">${icon('receipt_long')} Lihat bukti refund · ${escapeHtml(event.refundProofName || 'unggahan')}</button>` : ''}</div><div class="ai-pairing-preview"><strong>${icon('auto_awesome')} Kostum yang cocok</strong><span>${matches.map((product) => escapeHtml(product.name)).join(' · ') || 'Belum ada kostum yang cocok'}</span></div></div><div class="order-admin-actions">${actions}<button class="button button-danger button-small" data-action="delete-event" data-id="${escapeHtml(event.id)}" aria-label="Hapus ${escapeHtml(event.title)}">${icon('delete')}</button></div></article>`;
    };
    return `<div class="admin-content-header"><div><span class="eyebrow">Kurasi promosi komunitas</span><h1>Kurasi iklan event</h1><p class="muted small" style="margin:4px 0 0">Bandingkan PDF, poster, pratinjau, dan bukti pembayaran sebelum menyetujui.</p></div><button class="button button-secondary" data-go="organizer">${icon('open_in_new')} Portal organizer</button></div>
    <div class="stat-grid">${[['pending_actions', 'Menunggu review', pendingCount, pendingCount ? 'Perlu diproses' : 'Antrean kosong'], ['campaign', 'Tayang', count('Disetujui'), 'Terlihat oleh pelanggan'], ['star', 'Unggulan', state.events.filter((event) => event.featured && event.status === 'Disetujui').length, 'Slot prioritas'], ['block', 'Ditolak', count('Ditolak'), 'Tidak ditayangkan']].map(([symbol, label, value, note]) => `<article class="stat-card"><div class="stat-card-top"><span>${label}</span><span class="stat-icon">${icon(symbol)}</span></div><strong>${value}</strong><span class="stat-change">${note}</span></article>`).join('')}</div>
    <div class="orders-tabs" style="margin-top:18px">${tabs.map(([key, label, total]) => `<button type="button" class="orders-tab ${filter === key ? 'active' : ''}" data-event-filter="${key}">${label} <span class="tab-count">${total}</span></button>`).join('')}</div>
    ${list.length ? list.map(card).join('') : `<div class="empty-state">${filter === 'Menunggu review' ? 'Tidak ada pengajuan yang menunggu. Kerja bagus!' : 'Belum ada event pada kategori ini.'}</div>`}`;
};

const qrBase = () => {
    let saved = '';
    try { saved = localStorage.getItem(STORAGE_KEYS.qrBase) || ''; } catch {}
    return (saved || `${location.origin}${location.pathname}`).replace(/#.*$/, '').replace(/\/+$/, '');
};
const qrUrl = (tier) => `${qrBase()}/#organizer/${tier}`;
const qrTiers = { free: { title: 'QR Iklan Gratis', badge: 'Komunitas lokal', poster: 'Iklan Gratis', note: 'Form detail event dengan pratinjau dan token unik untuk setiap pengajuan.', color: '#239b68' }, paid: { title: 'QR Iklan Prabayar', badge: 'Featured promotion', poster: 'Iklan Prabayar', note: 'Unggah poster dan PDF, sesuaikan pratinjau, pilih durasi, lalu unggah bukti pembayaran.', color: '#e0306f' } };
const qrIsLocal = () => {
    try {
        const host = new URL(qrBase()).hostname.toLowerCase().replace(/^\[|\]$/g, '');
        return host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0' || host === '::' || host === '::1' || /^127(?:\.|$)/.test(host);
    } catch {
        return true;
    }
};
const qrRenderOptions = (width) => ({
    width,
    margin: 4,
    errorCorrectionLevel: 'H',
    color: { dark: '#1d1520', light: '#ffffff' },
});

const adminQrCodes = () => `<div class="admin-content-header"><div><span class="eyebrow">Akses organizer tanpa akun</span><h1>Generator QR iklan event</h1><p class="muted small" style="margin:4px 0 0">QR Gratis dan Prabayar membuka formulir berbeda. Setiap pengajuan mendapat token unik; QR umum tetap dapat dipakai organizer lain.</p></div></div>
    <section class="panel qr-settings"><form id="qr-form" class="qr-form"><div class="field"><label for="qr-base">Alamat website untuk QR</label><input class="input" id="qr-base" name="base" value="${escapeHtml(qrBase())}" placeholder="https://rental-kamu.com atau http://192.168.1.5:8000" inputmode="url" required><small class="muted">QR mengarah ke <strong>alamat ini</strong>. Gunakan domain publik atau IP jaringan Wi-Fi agar dapat dipindai dari HP.</small></div><div class="qr-form-actions"><button class="button button-primary" type="submit">${icon('qr_code_2')} Perbarui QR</button><button class="button button-quiet" type="button" data-action="qr-reset">Pakai alamat saat ini</button></div></form>${qrIsLocal() ? `<div class="notice qr-warning">${icon('warning')} <span>Alamat ini hanya bisa dibuka dari komputer yang sama—QR tidak akan terbuka dari HP. Ganti dengan domain publik, atau IP jaringan Wi-Fi (mis. <code>http://192.168.1.5:8000</code>) lalu jalankan <code>php artisan serve --host=0.0.0.0</code>.</span></div>` : ''}</section>
    <div class="qr-grid">${Object.entries(qrTiers).map(([tier, meta]) => `<section class="panel qr-card" style="--qr-color:${meta.color}"><span class="status-pill ${tier === 'free' ? 'success' : ''}">${meta.badge}</span><h2>${meta.title}</h2><p class="muted small">${meta.note}</p><div class="qr-frame"><canvas id="qr-${tier}" aria-label="${meta.title}"></canvas></div><p class="small qr-url" id="qr-${tier}-url"></p><div class="qr-actions"><button class="button button-primary button-small" type="button" data-action="qr-download" data-tier="${tier}">${icon('download')} Unduh poster QR</button><button class="button button-secondary button-small" type="button" data-action="qr-copy" data-tier="${tier}">${icon('content_copy')} Salin tautan</button><button class="button button-quiet button-small" type="button" data-action="qr-open" data-tier="${tier}">${icon('open_in_new')} Uji buka</button></div></section>`).join('')}</div>`;

const renderAdminQRCodes = async () => {
    for (const tier of Object.keys(qrTiers)) {
        const label = app.querySelector(`#qr-${tier}-url`);
        if (label) label.textContent = qrUrl(tier);
    }
    for (const tier of Object.keys(qrTiers)) {
        const canvas = app.querySelector(`#qr-${tier}`);
        if (!canvas) continue;
        const url = qrUrl(tier);
        await QRCode.toCanvas(canvas, url, qrRenderOptions(220));
    }
};

const downloadQrPoster = async (tier) => {
    const meta = qrTiers[tier];
    if (!meta) throw new Error('Paket QR tidak dikenal.');
    const url = qrUrl(tier);
    const qr = document.createElement('canvas');
    await QRCode.toCanvas(qr, url, qrRenderOptions(460));
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 880;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 640, 880);
    g.fillStyle = meta.color; g.fillRect(0, 0, 640, 170);
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '700 40px Poppins, Arial, sans-serif'; g.fillText("Let'sCosplay", 320, 82);
    g.font = '500 22px Poppins, Arial, sans-serif'; g.fillText(`Pasang ${meta.poster} Event`, 320, 126);
    g.strokeStyle = meta.color; g.lineWidth = 6; g.strokeRect(80, 210, 480, 480);
    g.drawImage(qr, 90, 220, 460, 460);
    g.fillStyle = '#1d1520'; g.font = '700 30px Poppins, Arial, sans-serif'; g.fillText('Scan untuk pasang iklan event', 320, 748);
    g.fillStyle = '#6b5f6c'; g.font = '400 20px Poppins, Arial, sans-serif'; g.fillText('Arahkan kamera HP ke kode QR di atas', 320, 790);
    g.font = '400 16px Poppins, Arial, sans-serif'; g.fillText(url.length > 58 ? `${url.slice(0, 55)}…` : url, 320, 836);
    await new Promise((resolve) => canvas.toBlob((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `letscosplay-qr-${tier === 'free' ? 'gratis' : 'prabayar'}.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1500);
        resolve();
    }, 'image/png'));
};

const adminKtp = () => {
    const list = state.identities;
    const tabs = [['pending', 'Menunggu'], ['verified', 'Terverifikasi'], ['rejected', 'Ditolak'], ['all', 'Semua']];
    if (!list) return `<div class="admin-content-header"><div><span class="eyebrow">Keamanan penyewa</span><h1>Verifikasi KTP</h1></div></div><div class="empty-state">Memuat daftar KTP…</div>`;
    const count = (key) => (key === 'all' ? list.length : list.filter((item) => item.status === key).length);
    const shown = list.filter((item) => state.ktpFilter === 'all' || item.status === state.ktpFilter);
    return `<div class="admin-content-header"><div><span class="eyebrow">Keamanan penyewa</span><h1>Verifikasi KTP</h1><p class="muted small" style="margin:4px 0 0">Periksa foto selfie + KTP yang diunggah penyewa. Pesanan baru bisa diproses setelah KTP penyewanya diverifikasi.</p></div><span class="status-pill">${count('pending')} menunggu</span></div><div class="orders-tabs">${tabs.map(([key, label]) => `<button type="button" class="orders-tab ${state.ktpFilter === key ? 'active' : ''}" data-ktp-filter="${key}">${label} <span class="tab-count">${count(key)}</span></button>`).join('')}</div>${shown.length ? shown.map((item) => `<article class="order-admin-card ktp-card"><span class="avatar avatar-lg">${escapeHtml(initials(item.name))}</span><div><h3>${escapeHtml(item.name)}</h3><p class="muted small">${escapeHtml(item.email)} · ${escapeHtml(item.phone || '-')}</p><p class="small">${escapeHtml(item.socialPlatform || '')} ${escapeHtml(item.socialHandle || '')} · Penjamin: ${escapeHtml(item.guarantor || '-')}</p><p class="small muted">File: ${escapeHtml(item.fileName || 'selfie-identitas.jpg')} · diunggah ${escapeHtml(item.uploadedAt || '-')}</p>${ktpPill(item.status)}${item.status === 'rejected' && item.rejectReason ? `<p class="small" style="color:var(--red)">Alasan: ${escapeHtml(item.rejectReason)}</p>` : ''}${item.reviewedAt ? `<p class="small muted">Diperiksa ${escapeHtml(item.reviewedAt)}</p>` : ''}</div><div class="order-admin-actions"><button class="button button-secondary button-small" data-action="ktp-view" data-id="${item.userId}">${icon('visibility')} Lihat foto</button>${item.status !== 'verified' ? `<button class="button button-primary button-small" data-action="ktp-approve" data-id="${item.userId}">Setujui</button>` : ''}${item.status !== 'rejected' ? `<button class="button button-danger button-small" data-action="ktp-reject" data-id="${item.userId}">Tolak</button>` : ''}</div></article>`).join('') : '<div class="empty-state">Tidak ada KTP pada kategori ini.</div>'}`;
};

const adminReviewsPage = () => {
    const data = state.adminReviews;
    if (!data) return `<div class="admin-content-header"><div><span class="eyebrow">Suara pelanggan</span><h1>Ulasan pembeli</h1></div></div><div class="empty-state">Memuat ulasan…</div>`;
    const unreplied = data.reviews.filter((review) => !review.reply);
    const shown = state.adminReviewFilter === 'unreplied' ? unreplied : data.reviews;
    return `<div class="admin-content-header"><div><span class="eyebrow">Suara pelanggan</span><h1>Ulasan pembeli</h1><p class="muted small" style="margin:4px 0 0">Balasanmu tampil publik di bawah ulasan pada halaman detail kostum.</p></div></div><div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">${[['reviews', 'Total ulasan', data.reviews.length], ['star', 'Rata-rata bintang', data.average ?? '–'], ['mark_chat_unread', 'Belum dibalas', unreplied.length]].map(([symbol, label, value]) => `<article class="stat-card"><div class="stat-card-top"><span>${label}</span><span class="stat-icon">${icon(symbol)}</span></div><strong>${value}</strong></article>`).join('')}</div><div class="orders-tabs" style="margin-top:16px">${[['all', 'Semua'], ['unreplied', 'Belum dibalas']].map(([key, label]) => `<button type="button" class="orders-tab ${state.adminReviewFilter === key ? 'active' : ''}" data-review-filter="${key}">${label}</button>`).join('')}</div>${shown.length ? shown.map((review) => `<article class="order-admin-card review-admin-card"><img src="${escapeHtml(review.costumeImage || FALLBACK_IMG)}" alt="${escapeHtml(review.costumeName || '')}"><div><h3>${escapeHtml(review.costumeName || 'Kostum')} · ${escapeHtml(review.orderId || '')}</h3><p class="small muted">${escapeHtml(review.customerFullName || review.customerName)} · ${escapeHtml(review.createdAt)}${review.size ? ` · ${escapeHtml(review.size)}` : ''}</p>${stars(review.rating)}${review.comment ? `<p class="small">${escapeHtml(review.comment)}</p>` : '<p class="small muted">Tanpa komentar.</p>'}${review.reply ? `<div class="review-reply"><strong>${icon('storefront')} Balasanmu${review.repliedAt ? ` · ${escapeHtml(review.repliedAt)}` : ''}</strong><p>${escapeHtml(review.reply)}</p></div>` : ''}</div><div class="order-admin-actions"><button class="button ${review.reply ? 'button-secondary' : 'button-primary'} button-small" data-action="reply-review" data-id="${review.id}">${review.reply ? 'Ubah balasan' : 'Balas ulasan'}</button></div></article>`).join('') : '<div class="empty-state">Belum ada ulasan pada kategori ini.</div>'}`;
};

// Muat data admin / ulasan publik sesuai halaman yang sedang dibuka.
const paymentDraft = () => {
    if (!state.paymentDraft) {
        const copy = normalizePaymentAccounts(state.paymentAccounts);
        ['bank', 'ewallet'].forEach((kind) => { if (!copy[kind].length) copy[kind] = [{ provider: '', number: '', holder: '' }]; });
        state.paymentDraft = copy;
    }
    return state.paymentDraft;
};
const addPaymentRow = (kind) => {
    const draft = paymentDraft();
    if (!draft[kind]) return;
    if (draft[kind].length >= MAX_PAYMENT_ROWS) { showToast(`Maksimal ${MAX_PAYMENT_ROWS} baris per kategori.`); return; }
    draft[kind].push({ provider: '', number: '', holder: '' });
    render();
};
const removePaymentRow = (kind, index) => {
    const draft = paymentDraft();
    if (!draft[kind]) return;
    if (draft[kind].length <= 1) { showToast('Minimal satu baris harus tersisa.'); return; }
    draft[kind].splice(index, 1);
    render();
};
const paymentSectionMarkup = (kind, title, symbol, providerLabel, providerPlaceholder) => {
    const rows = paymentDraft()[kind];
    return `<section class="panel" style="margin-bottom:16px"><div class="admin-toolbar"><h2 style="margin:0">${icon(symbol)} ${title}</h2><span class="muted small">${rows.length}/${MAX_PAYMENT_ROWS} baris</span></div>${rows.map((row, index) => `<div class="form-grid" style="margin-top:14px"><div class="field"><label for="pay-${kind}-${index}-provider">${providerLabel} *</label><input class="input" id="pay-${kind}-${index}-provider" data-pay-kind="${kind}" data-pay-index="${index}" data-pay-field="provider" required maxlength="60" placeholder="${providerPlaceholder}" value="${escapeHtml(row.provider)}"></div><div class="field"><label for="pay-${kind}-${index}-number">Nomor rekening / akun *</label><input class="input" id="pay-${kind}-${index}-number" data-pay-kind="${kind}" data-pay-index="${index}" data-pay-field="number" required maxlength="40" inputmode="numeric" placeholder="Contoh: 1234567890" value="${escapeHtml(row.number)}"></div><div class="field"><label for="pay-${kind}-${index}-holder">Atas nama *</label><input class="input" id="pay-${kind}-${index}-holder" data-pay-kind="${kind}" data-pay-index="${index}" data-pay-field="holder" required maxlength="80" placeholder="Nama pemilik rekening" value="${escapeHtml(row.holder)}"></div><div class="field" style="align-self:end"><button class="button button-danger button-small" type="button" data-action="pay-remove" data-kind="${kind}" data-index="${index}" ${rows.length <= 1 ? 'disabled' : ''}>${icon('delete')} Hapus baris</button></div></div>`).join('')}<div style="margin-top:14px"><button class="button button-secondary button-small" type="button" data-action="pay-add" data-kind="${kind}" ${rows.length >= MAX_PAYMENT_ROWS ? 'disabled' : ''}>${icon('add')} Tambah baris</button></div></section>`;
};
const returnAddressSectionMarkup = () => {
    const value = paymentDraft().returnAddress || {};
    return `<section class="panel" style="margin-bottom:16px"><div class="admin-toolbar"><h2 style="margin:0">${icon('location_on')} Alamat Tujuan Pengembalian Kostum</h2></div><p class="muted small">Alamat ini tampil di panduan pengembalian penyewa beserta tombol salin.</p><div class="form-grid" style="margin-top:14px"><div class="field"><label for="return-recipient">Nama penerima *</label><input class="input" id="return-recipient" data-return-field="recipient" required maxlength="80" placeholder="Nama admin / toko" value="${escapeHtml(value.recipient || '')}"></div><div class="field"><label for="return-phone">Nomor HP admin *</label><input class="input" id="return-phone" data-return-field="phone" required maxlength="30" inputmode="tel" placeholder="08xx xxxx xxxx" value="${escapeHtml(value.phone || '')}"></div></div><div class="field" style="margin-top:14px"><label for="return-address">Alamat lengkap (kota / studio) *</label><textarea class="textarea" id="return-address" data-return-field="address" required maxlength="300" placeholder="Jalan, nomor, kecamatan, kota, kode pos">${escapeHtml(value.address || '')}</textarea></div></section>`;
};
const adminPayments = () => `<div class="admin-content-header"><div><span class="eyebrow">Tujuan pembayaran</span><h1>Rekening, e-wallet &amp; alamat retur</h1><p class="muted small" style="margin:4px 0 0">Daftar ini tampil ke penyewa saat checkout, pelunasan DP, dan pengembalian kostum. Maksimal ${MAX_PAYMENT_ROWS} baris per kategori, minimal 1 baris.</p></div></div><form id="payment-accounts-form" class="stack">${paymentSectionMarkup('bank', 'Rekening bank', 'account_balance', 'Nama bank', 'Contoh: BCA')}${paymentSectionMarkup('ewallet', 'E-wallet', 'account_balance_wallet', 'Nama e-wallet', 'Contoh: GoPay')}${returnAddressSectionMarkup()}<div class="quantity-row"><button class="button button-primary" type="submit">${icon('save')} Simpan perubahan</button><button class="button button-secondary" type="button" data-action="pay-reset">Batalkan perubahan</button></div></form>`;

const ensureLazyData = () => {
    if (state.page === 'admin' && state.session?.role === 'admin') {
        if (state.adminSection === 'ktp' && state.identities === null && !state.identitiesLoading) {
            state.identitiesLoading = true;
            api('/identities').then((data) => { state.identities = data; }).catch(() => { state.identities = []; })
                .finally(() => { state.identitiesLoading = false; if (state.page === 'admin') render(); });
        }
        if (state.adminSection === 'reviews' && state.adminReviews === null && !state.adminReviewsLoading) {
            state.adminReviewsLoading = true;
            api('/reviews').then((data) => { state.adminReviews = data; }).catch(() => { state.adminReviews = { reviews: [], average: null }; })
                .finally(() => { state.adminReviewsLoading = false; if (state.page === 'admin') render(); });
        }
    }
    if (state.page === 'detail') {
        const id = String(productById(state.param || state.productId).id);
        if (id && state.reviews[id] === undefined && !state.reviewsLoading[id]) {
            state.reviewsLoading[id] = true;
            api(`/costumes/${encodeURIComponent(id)}/reviews`).then((data) => { state.reviews[id] = data; }).catch(() => { state.reviews[id] = { average: null, count: 0, distribution: {}, reviews: [] }; })
                .finally(() => { state.reviewsLoading[id] = false; if (state.page === 'detail') render(); });
        }
    }
};

const adminPage = () => {
    if (state.session?.role !== 'admin') return accountAuthPage(false, true);
    const content = ({ overview: adminOverview, inventory: adminInventory, orders: adminOrders, ktp: adminKtp, reviews: adminReviewsPage, shipping: adminShipping, events: adminEvents, qr: adminQrCodes, payments: adminPayments }[state.adminSection] || adminOverview)();
    return adminShell(content);
};

const defaultChatSuggestions = () => {
    switch (state.page) {
        case 'detail': return ['Ukuran apa saja yang ada?', 'Hitung total sewa 3 hari', 'Aksesori apa yang termasuk?'];
        case 'checkout': return ['Berapa DP minimalnya?', 'Kapan sisa dibayar?', 'Deposit dikembalikan kapan?'];
        case 'orders': case 'tracking': return ['Status pesananku sekarang?', 'Kapan kostum dikirim?', 'Cara mengembalikan kostum'];
        case 'events': case 'event': return ['Event terdekat apa?', 'Kostum yang cocok untuk event?'];
        default: return ['Gimana cara sewa?', 'Ada kostum ukuran M?', 'Berapa deposit & DP-nya?', 'Event cosplay terdekat'];
    }
};

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

const chatGreeting = () => {
    const hour = new Date().getHours();
    const part = hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam';
    const name = state.session?.name ? `, ${escapeHtml(state.session.name.split(' ')[0])}` : '';
    return `Selamat ${part}${name}! `;
};

// Kartu kostum kecil di bawah balasan bot; datanya diambil dari katalog yang sudah dimuat.
const chatCardsMarkup = (ids = []) => {
    const items = (Array.isArray(ids) ? ids : []).map((id) => state.inventory.find((p) => String(p.id) === String(id))).filter(Boolean).slice(0, 3);
    if (!items.length) return '';
    return `<div class="chat-cards">${items.map((p) => `<button type="button" class="chat-card" data-go="detail" data-id="${escapeHtml(p.id)}"><img src="${escapeHtml(p.image)}" alt="" loading="lazy"><span class="chat-card-body"><strong>${escapeHtml(p.name)}</strong><small>${money(p.price)}/hari · ${p.stock > 0 ? `stok ${p.stock}` : 'sedang disewa'}</small></span>${icon('chevron_right')}</button>`).join('')}</div>`;
};

const chatMessagesMarkup = () => {
    const intro = `<div class="chat-message bot"><p>${chatGreeting()}Aku asisten Let'sCosplay. Tanya apa saja soal kostum, stok &amp; ukuran, aturan sewa, atau event cosplay ya.</p></div>`;
    const list = state.chatMessages.map((message) => {
        if (message.role !== 'bot') return `<div class="chat-message user"><p>${escapeHtml(message.text)}</p></div>`;
        const typing = message.shown !== undefined; // sedang "diketik"
        return `<div class="chat-message bot"${typing ? ' data-typing="1"' : ''}>${formatChat(typing ? message.shown : message.text)}</div>${typing ? '' : chatCardsMarkup(message.costumeIds)}`;
    }).join('');
    const last = state.chatMessages[state.chatMessages.length - 1];
    const chipTexts = !state.chatMessages.length ? defaultChatSuggestions()
        : (last?.role === 'bot' && last.shown === undefined ? (last.suggestions || []) : []);
    const chips = state.chatLoading || !chipTexts.length ? '' : `<div class="chat-suggestions">${chipTexts.map((text) => `<button type="button" class="chip-button" data-chat-suggest="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join('')}</div>`;
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

// Efek "mengetik": teks balasan muncul bertahap (maks. ±1,5 detik) supaya terasa seperti percakapan.
let chatRevealTimer = null;
const stopChatReveal = () => {
    if (chatRevealTimer) { clearInterval(chatRevealTimer); chatRevealTimer = null; }
    state.chatMessages.forEach((message) => { delete message.shown; });
};
const paintRevealing = (message) => {
    const box = document.querySelector('#chat-messages');
    const el = box?.querySelector('.chat-message.bot[data-typing]');
    const partial = message.shown.match(/\*\*/g)?.length % 2 ? `${message.shown}**` : message.shown; // tutup tebal yang belum selesai
    if (el) el.innerHTML = formatChat(partial);
    if (box) box.scrollTop = box.scrollHeight;
};
const revealChatReply = (message, requestId) => {
    const tokens = message.text.split(/(\s+)/);
    const perTick = Math.max(1, Math.ceil(tokens.length / 45));
    let cursor = 0;
    message.shown = '';
    refreshChat();
    chatRevealTimer = setInterval(() => {
        if (requestId !== state.chatRequestId || message.shown === undefined) { stopChatReveal(); return; }
        cursor += perTick;
        if (cursor >= tokens.length) { stopChatReveal(); refreshChat(); return; }
        message.shown = tokens.slice(0, cursor).join('');
        paintRevealing(message);
    }, 32);
};

// Halaman yang sedang dibuka, supaya "kostum ini" / "event ini" dipahami chatbot.
const chatContext = () => ({
    page: state.page,
    ...(state.page === 'detail' ? { productId: String(state.param || state.productId || '') } : {}),
    ...(state.page === 'event' && (state.param || state.selectedEvent) ? { eventId: String(state.param || state.selectedEvent) } : {}),
});

const sendChat = async (rawQuestion) => {
    const question = String(rawQuestion || '').trim().slice(0, 500);
    if (!question || state.chatLoading) return;
    stopChatReveal(); // pengguna mengetik lagi → tampilkan sisa balasan sebelumnya langsung
    const requestId = ++state.chatRequestId;
    const history = state.chatMessages.slice(-12).map(({ role, text }) => ({ role, text: String(text).slice(0, 2000) }));
    state.chatMessages.push({ role: 'user', text: question });
    state.chatLoading = true;
    saveChatHistory();
    if (!state.chatOpen) { state.chatOpen = true; render(); } else refreshChat();
    const input = document.querySelector('#chat-form input[name="message"]');
    if (input) input.value = '';

    const startedAt = Date.now();
    let bot;
    try {
        const data = await api('/chat', { method: 'POST', body: { message: question, history, sessionId: chatSessionId(), context: chatContext() } });
        const reply = String(data.reply || '').trim();
        if (!reply) throw new Error('Balasan kosong');
        bot = { role: 'bot', text: reply, suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 3) : [], costumeIds: Array.isArray(data.costumeIds) ? data.costumeIds : [] };
    } catch (error) {
        console.warn(`Chatbot AI tidak tersedia (${error.message}); memakai jawaban lokal.`);
        bot = { role: 'bot', ...answerChatQuestion(question) };
        const wait = 700 - (Date.now() - startedAt); // jeda singkat agar tidak terasa instan/kaku
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    }
    if (requestId !== state.chatRequestId) return; // obrolan di-reset saat menunggu
    state.chatLoading = false;
    state.chatMessages.push(bot);
    saveChatHistory();
    revealChatReply(bot, requestId);
};

const render = () => {
    if (state.session?.role === 'admin' && !adminBrowsablePages.includes(state.page)) {
        state.page = 'admin';
        state.param = state.adminSection;
        history.replaceState({ page: 'admin', param: state.adminSection }, '', `#admin/${state.adminSection}`);
    } else if (state.page === 'account' && !state.session) {
        state.page = 'login';
        state.param = null;
        history.replaceState({ page: 'login' }, '', '#login');
    } else if (state.session?.role === 'customer' && state.page === 'admin') {
        state.page = 'home';
        state.param = null;
        history.replaceState({ page: 'home' }, '', '#home');
    } else if (['checkout', 'orders', 'tracking'].includes(state.page) && state.session?.role !== 'customer') {
        state.page = 'login';
        state.param = null;
        history.replaceState({ page: 'login' }, '', '#login');
    }
    const adminPreview = state.session?.role === 'admin' && !['admin', 'account'].includes(state.page);
    const pages = {
        home: homePage, catalog: catalogPage, detail: detailPage, rules: rulesPage, howto: howToPage,
        checkout: checkoutPage, orders: ordersPage, tracking: trackingPage,
        login: () => accountAuthPage(false), register: () => accountAuthPage(true), account: () => (state.session?.role === 'admin' ? adminShell(accountPage()) : accountPage()),
        events: eventsPage, event: eventDetailPage, organizer: organizerPage, admin: adminPage,
    };
    document.title = `Let'sCosplay — ${({ home: 'Rental Kostum Cosplay', catalog: 'Katalog Kostum', detail: 'Detail Kostum', rules: 'Rules Rental', howto: 'Cara Sewa', checkout: 'Checkout', orders: 'Pesanan Saya', tracking: 'Lacak Pesanan', login: 'Masuk', register: 'Daftar', events: 'Event Komunitas', event: 'Detail Event', organizer: 'Portal Organizer', account: 'Pengaturan Akun', admin: 'Dashboard Admin' }[state.page] || 'Rental Kostum')}`;
    const pageView = localizeCopy((pages[state.page] || homePage)().replaceAll('pattern="[0-9+() -]{9,18}"', ''));
    app.innerHTML = `${topHeader()}${adminPreview ? `<div class="preview-banner" role="status">${icon('visibility')} <span>Mode pratinjau toko — beginilah tampilan untuk pelanggan.</span><button class="button button-secondary button-small" type="button" data-go="admin">${icon('arrow_back')} Kembali ke dashboard</button></div>` : ''}<main>${pageView}</main>${state.page === 'admin' || (state.page === 'account' && state.session?.role === 'admin') ? '' : localizeCopy(footer())}${state.modal || ''}${state.page === 'organizer' && state.param === 'paid' ? '' : chatWidget()}`;
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
    ensureLazyData();
};


const checkoutTotals = () => {
    const product = { ...productById(state.productId) };
    const currentAddress = app.querySelector('#renter-address')?.value ?? state.session?.address ?? '';
    const pr = orderPricing(product, currentAddress);
    return { product, pr, total: pr.total };
};

const checkoutAssistant = () => `<section class="form-section ai-checkout-panel"><h2><span class="section-index">AI</span> Asisten pintar pemesanan</h2><div class="form-grid"><div class="field"><label for="fit-height">Tinggi badan (cm) · opsional</label><input class="input" id="fit-height" type="number" min="100" max="230" placeholder="Contoh: 165"></div><div class="field"><label for="fit-weight">Berat badan (kg) · opsional</label><input class="input" id="fit-weight" type="number" min="25" max="250" placeholder="Contoh: 58"></div><div class="field span-2"><label for="fit-notes">Catatan kecocokan kostum</label><input class="input" id="fit-notes" placeholder="Contoh: ingin lebih longgar di bagian bahu"></div></div><div class="ai-result" style="margin-top:14px"><div><small>Rekomendasi ukuran AI</small><strong id="ai-fit-recommendation">Lengkapi ukuran badan untuk rekomendasi.</strong></div><div><small>Skor kepercayaan demo</small><strong id="ai-risk-score">Skor awal: 55/100</strong></div></div><div id="ai-deposit-advice" class="notice" style="margin-top:12px">Deposit standar berlaku sampai riwayat rental diverifikasi.</div><div id="ai-document-scan" class="deposit-note" style="margin-top:12px">${icon('document_scanner')} Verifikasi dokumen mengikuti foto identitas di akunmu.</div><p class="muted small" style="margin-bottom:0">Pemindaian wajah, kejelasan dokumen, dan skor risiko di sini adalah simulasi lokal, bukan verifikasi identitas nyata.</p></section>`;

const updateCheckoutSummary = ({ resetAmount = false } = {}) => {
    const { pr, total } = checkoutTotals();
    const subtotal = pr.subtotal;
    const minimumDp = Math.ceil(total * 0.5);
    const isFull = app.querySelector('input[name="paymentScheme"]:checked')?.value === 'full';
    for (const row of app.querySelectorAll('.price-line')) {
        const labelEl = row.querySelector('span');
        const label = labelEl?.textContent?.trim();
        const amount = row.querySelector('strong');
        if (!amount) continue;
        if (label?.startsWith('Ongkir') || label === 'Pengiriman') {
            labelEl.textContent = pr.shippingLabel;
            amount.textContent = money(pr.shipping);
        }
        if (label === 'Deposit refundable' || label === 'Deposit') amount.textContent = money(pr.deposit);
        if (label === 'Total estimasi' || label === 'Total') amount.textContent = money(total);
        if (label === 'Subtotal sewa dan aksesori') amount.textContent = money(subtotal);
    }
    const paymentAmount = app.querySelector('#payment-amount');
    if (paymentAmount) {
        // Skema "Bayar Lunas": nominal = total & terkunci. Skema "DP": min. 50% sampai kurang dari total.
        const dpMax = Math.max(minimumDp, total - 1);
        paymentAmount.readOnly = isFull;
        paymentAmount.min = String(isFull ? total : minimumDp);
        paymentAmount.max = String(isFull ? total : dpMax);
        const current = Number(paymentAmount.value);
        if (isFull) paymentAmount.value = String(total);
        else if (resetAmount || !current || current < minimumDp || current > dpMax) paymentAmount.value = String(minimumDp);
        const label = app.querySelector('label[for="payment-amount"]');
        if (label) label.textContent = isFull ? 'Jumlah yang dibayar (lunas) *' : 'Jumlah DP yang dibayar *';
        const note = paymentAmount.nextElementSibling;
        if (note) note.textContent = isFull ? `Bayar lunas ${money(total)} — nominal terkunci.` : `Minimal ${money(minimumDp)} · maksimal ${money(dpMax)} (kurang dari total)`;
    }
    const notice = app.querySelector('#checkout-form .checkout-sections > .form-section:nth-child(4) .notice');
    if (notice) notice.innerHTML = isFull
        ? `Bayar lunas sekarang: <strong>${money(total)}</strong>. Tidak ada sisa tagihan.`
        : `Minimum DP 50%: <strong>${money(minimumDp)}</strong>. Sisa <strong>${money(total - minimumDp)}</strong> dibayarkan paling lambat H-1 sebelum pengiriman.`;
};

const updateAIAssistant = () => {
    if (state.page !== 'checkout') return;
    const height = Number(app.querySelector('#fit-height')?.value || 0);
    const weight = Number(app.querySelector('#fit-weight')?.value || 0);
    const note = String(app.querySelector('#fit-notes')?.value || '').toLowerCase();
    const curProduct = productById(state.productId);
    const curSize = cartSizeLabel(curProduct);
    let recommended = height >= 183 ? 'XL' : height >= 172 ? 'L' : height >= 160 ? 'M' : height > 0 ? 'S' : (cartItems(curProduct)[0]?.size || 'M');
    if (weight >= 85 && recommended !== 'XL') recommended = recommended === 'S' ? 'M' : recommended === 'M' ? 'L' : 'XL';
    if (/longgar|oversize|lebih besar/.test(note)) recommended = recommended === 'S' ? 'M' : recommended === 'M' ? 'L' : 'XL';
    const fit = app.querySelector('#ai-fit-recommendation');
    if (fit) fit.textContent = height || weight ? `Disarankan ${recommended} · pilihan saat ini ${curSize}` : `Pilihan saat ini ${curSize} · isi tinggi/berat untuk saran AI`;

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
    const tier = form.dataset.tier === 'paid' ? 'paid' : 'free';
    const submitButton = form.querySelector('button[type="submit"]');
    const paidStepControls = form.querySelectorAll('#paid-next-step input, #paid-next-step select, #paid-next-step button');
    paidStepControls.forEach((control) => { control.disabled = true; });
    const setup = async () => {
        if (!state.eventOptions) state.eventOptions = await api('/events/options');
        if (tier === 'paid') {
            const aiStatus = form.querySelector('#event-ai-status');
            if (aiStatus) aiStatus.textContent = state.eventOptions.aiAvailable
                ? 'Unggah kedua file di atas, lalu biarkan AI menyiapkan detail dan materi promosi.'
                : 'AI belum aktif. Admin perlu memasang GEMINI_API_KEY sebelum iklan Prabayar dapat dibuat.';
            const draftButton = form.querySelector('[data-action="event-ai-draft"]');
            if (draftButton) draftButton.disabled = !state.eventOptions.aiAvailable;
            if (submitButton) submitButton.disabled = true;
            const instructions = form.querySelector('.event-payment-panel p');
            if (instructions) instructions.textContent = state.eventOptions.paymentInstructions;
        }
        if (!state.organizerToken || state.organizerTokenTier !== tier) {
            const { token } = await api(`/events/submission-token/${tier}`, { method: 'POST', body: {} });
            state.organizerToken = token;
            state.organizerTokenTier = tier;
        }
        form.elements.submissionToken.value = state.organizerToken;
        if (submitButton && (tier === 'free' || form.dataset.aiDraftReady === 'true')) submitButton.disabled = false;
        updateOrganizerPreview();
    };
    if (!form.elements.submissionToken.value && submitButton) submitButton.disabled = true;
    setup().catch((error) => {
        if (submitButton) submitButton.disabled = true;
        showToast(error.message || 'Form belum dapat dibuka. Muat ulang halaman untuk mencoba lagi.');
    });
};

const updateOrder = async (id, changes, successMessage) => {
    try {
        const { order: updated } = await api(`/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes });
        state.orders = state.orders.map((item) => (item.id === id ? updated : item));
        if ('stage' in changes) await loadCatalog(); // stok bisa kembali saat pesanan selesai
        render();
        if (successMessage) showToast(successMessage);
        return true;
    } catch (error) {
        showToast(error.message || 'Gagal memperbarui pesanan.');
        return false;
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

const matchingPaidEvents = (product) => {
    const productTerms = new Set([
        ...(product.themes || []),
        ...`${product.name} ${product.series} ${product.category}`.toLowerCase().split(/[^a-z0-9]+/),
    ].filter((word) => word.length > 2));
    return state.events
        .filter((event) => event.tier === 'Prabayar'
            && event.status === 'Disetujui'
            && (!event.listingUntil || new Date(event.listingUntil) > new Date()))
        .map((event) => {
            const eventTerms = `${event.theme} ${event.title}`.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2);
            const score = eventTerms.filter((word) => [...productTerms].some((term) => term.includes(word) || word.includes(term))).length;
            return { event, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ event }) => event);
};

// ---- Jawaban cadangan lokal (dipakai hanya saat Gemini tidak dapat dijangkau) ----
const chatPick = (items) => items[Math.floor(Math.random() * items.length)];
const chatSlang = { brp: 'berapa', brapa: 'berapa', gk: 'tidak', ga: 'tidak', gak: 'tidak', nggak: 'tidak', tdk: 'tidak', bs: 'bisa', dr: 'dari', hr: 'hari', yg: 'yang', sy: 'saya', utk: 'untuk', dgn: 'dengan', udh: 'sudah', blm: 'belum', jg: 'juga', gmn: 'bagaimana', gimana: 'bagaimana', kpn: 'kapan', dmn: 'dimana', aja: 'saja', rb: 'ribu', k: 'ribu' };
const chatStopWords = new Set(['ada', 'apa', 'saja', 'yang', 'kostum', 'kostumnya', 'ukuran', 'stok', 'size', 'tolong', 'cari', 'mau', 'sewa', 'rental', 'berapa', 'harga', 'untuk', 'dong', 'sih', 'ya', 'kah', 'tidak', 'bisa', 'lagi', 'dan', 'dari', 'hari', 'ini', 'itu', 'nya', 'sama', 'dengan', 'buat', 'pesan', 'ingin', 'pinjam', 'bagaimana', 'kapan', 'total', 'hitung', 'biaya', 'murah', 'hemat', 'event', 'saya', 'aku', 'kamu', 'dimana', 'masih', 'sudah', 'belum']);
const normalizeChat = (text) => String(text).toLowerCase()
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2') // 100.000 → 100000
    .replace(/(\d)([a-z])/g, '$1 $2') // 3hr → 3 hr, 100k → 100 k
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
    .map((word) => (word.length > 6 && word.endsWith('nya') ? word.slice(0, -3) : word)) // dendanya → denda, stoknya → stok
    .map((word) => chatSlang[word] || word);

const findChatCostumes = (tokens) => {
    const words = tokens.filter((word) => word.length > 2 && !chatStopWords.has(word) && !/^\d+$/.test(word));
    if (!words.length) return [];
    return state.inventory.map((product) => {
        const hay = normalizeChat(`${product.name} ${product.series || ''}`);
        const score = words.reduce((sum, word) => sum + (hay.includes(word) ? 2 : (word.length > 3 && hay.some((h) => h.length > 3 && (h.startsWith(word) || word.startsWith(h))) ? 1 : 0)), 0);
        return { product, score };
    }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((entry) => entry.product);
};

// Kostum yang terakhir dibahas (dari kartu pada balasan bot sebelumnya) atau yang sedang dibuka di halaman detail.
const chatFocusCostume = () => {
    if (state.page === 'detail') {
        const open = state.inventory.find((p) => String(p.id) === String(state.param || state.productId));
        if (open) return open;
    }
    for (let i = state.chatMessages.length - 1; i >= 0; i -= 1) {
        const message = state.chatMessages[i];
        if (message.role === 'bot' && message.costumeIds?.length) return state.inventory.find((p) => String(p.id) === String(message.costumeIds[0])) || null;
    }
    return null;
};

const chatStockLine = (p) => (p.stock > 0 ? `masih ada (${p.stock} unit, ukuran ${p.size.join('/')})` : 'lagi disewa semua');

const answerChatQuestion = (question) => {
    const tokens = normalizeChat(question);
    const text = tokens.join(' ');
    const has = (pattern) => pattern.test(text);
    const out = (reply, suggestions = [], costumes = []) => ({ text: reply, suggestions, costumeIds: costumes.map((p) => p.id) });
    const inStock = state.inventory.filter((p) => p.stock > 0);

    // 1. Sapaan, terima kasih, pamit
    if (tokens.length <= 4 && has(/^(halo|hai|hi|hello|hallo|pagi|siang|sore|malam|permisi|assalamualaikum|woi|p)\b/)) {
        return out(chatPick(['Halo! Lagi cari kostum apa nih?', 'Hai! Ada yang bisa aku bantu soal kostum atau aturan sewa?', 'Halo, selamat datang di Let\'sCosplay! Mau cari kostum, cek stok, atau tanya aturan sewa?']), defaultChatSuggestions().slice(0, 3));
    }
    if (tokens.length <= 6 && has(/\b(terima kasih|makasih|thanks|thx|thank you|oke sip|sip)\b/)) {
        return out(chatPick(['Sama-sama! Kabari aku kalau butuh apa-apa lagi.', 'Siap, senang bisa bantu! Semoga dapat kostum yang pas ya.', 'Sama-sama~ Selamat berburu kostum!']));
    }
    if (tokens.length <= 6 && has(/\b(dadah|bye|sampai jumpa|cukup)\b/)) {
        return out(chatPick(['Sampai jumpa! Semoga cosplay-nya lancar.', 'Dadah! Kalau ada yang mau ditanyakan lagi, aku di sini.']));
    }

    // 2. Admin / jam layanan
    if (has(/\b(admin|kontak|hubungi|jam buka|jam layanan|buka jam|cs)\b/)) {
        const now = new Date();
        const wib = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60000); // WIB
        const open = wib.getDay() !== 0 && wib.getHours() >= 9 && wib.getHours() < 18;
        return out(`Admin melayani Senin–Sabtu, 09.00–18.00 WIB. ${open ? 'Sekarang masih jam layanan, jadi kamu bisa langsung menghubungi admin.' : 'Sekarang di luar jam layanan, jadi balasannya menunggu jam kerja berikutnya ya.'}`, ['Gimana cara sewa?', 'Berapa deposit & DP-nya?']);
    }

    // 3. Status pesanan pribadi
    if (has(/\b(pesanan|order|resi|lacak|tracking|status)\b/) && !has(/\b(cara|gimana|bagaimana)\b/)) {
        if (state.session?.role !== 'customer') return out('Untuk cek pesanan, kamu perlu masuk akun dulu. Setelah masuk, semuanya ada di menu Pesanan Saya.', ['Gimana cara sewa?']);
        const latest = state.orders[state.orders.length - 1];
        if (!latest) return out('Kamu belum punya pesanan nih. Mau aku bantu pilih kostum dulu?', ['Rekomendasi kostum simpel', 'Gimana cara sewa?']);
        const stageName = orderStages[latest.stage] || 'Diproses';
        return out(`Pesanan terakhirmu **${latest.id}** (${orderProduct(latest).name}) sekarang berstatus **${stageName}**.${latest.trackingNumber ? ` Resi JNE: ${latest.trackingNumber}.` : ''} Detail lengkapnya ada di menu Pesanan Saya.`, ['Kapan kostum dikirim?', 'Cara mengembalikan kostum']);
    }

    // 4. Hitung biaya sewa untuk kostum tertentu (sebut hari atau tanya harga/total)
    const named = findChatCostumes(tokens);
    const refersBack = has(/\b(ini|itu|tadi|tersebut)\b/) || has(/\b(hari|total|hitung|biaya|ukuran|size|aksesori|termasuk|bonus)\b/);
    const focus = named[0] || (refersBack ? chatFocusCostume() : null);
    const daysMatch = text.match(/(\d+)\s*hari/);
    if (focus && (daysMatch || has(/\b(total|hitung|biaya)\b/))) {
        const days = Math.min(7, Math.max(1, Number(daysMatch?.[1]) || 3));
        const rent = focus.price * days;
        const total = rent + 18000 + focus.deposit;
        return out(`Estimasi sewa **${focus.name}** ${days} hari: ${money(focus.price)} × ${days} = ${money(rent)}, ongkir ±${money(18000)}, dan deposit ${money(focus.deposit)} (dikembalikan setelah kostum dicek). Totalnya sekitar **${money(total)}**, belum termasuk aksesori tambahan. DP minimal 50% dari total.`, ['Ukuran apa saja yang ada?', 'Berapa deposit & DP-nya?'], [focus]);
    }

    if (!focus && (daysMatch || has(/\b(hitung|total|biaya)\b/)) && !has(/\b(deposit|dp|denda)\b/)) {
        const picks = [...inStock].slice(0, 2).map((p) => `Hitung ${p.name} ${daysMatch?.[1] || 3} hari`);
        return out('Boleh, mau dihitung untuk kostum yang mana? Sebut nama kostumnya ya, nanti aku rinci ongkir dan depositnya sekalian.', picks);
    }

    // 5. Ukuran
    const sizeToken = tokens.find((t) => ['xs', 'xl', 'xxl'].includes(t)) || (has(/\b(ukuran|size|berukuran)\b/) ? tokens.find((t) => ['s', 'm', 'l'].includes(t)) : null);
    if (sizeToken) {
        const size = sizeToken.toUpperCase();
        const matches = inStock.filter((p) => p.size.map((s) => s.toUpperCase()).includes(size));
        if (matches.length) return out(`Untuk ukuran **${size}** ada ${matches.length} kostum yang siap disewa. Ini beberapa di antaranya:`, ['Yang paling murah?', 'Hitung total sewa 3 hari'], matches.slice(0, 3));
        const available = [...new Set(inStock.flatMap((p) => p.size.map((s) => s.toUpperCase())))];
        return out(`Untuk ukuran ${size}, sementara belum ada kostum yang tersedia.${available.length ? ` Ukuran yang masih ada: ${available.join(', ')}.` : ''}`, available.slice(0, 2).map((s) => `Ada kostum ukuran ${s}?`));
    }

    if (has(/\b(ukuran|size)\b/)) {
        if (focus) return out(`Ukuran **${focus.name}** yang ada: ${focus.size.join(', ')}. ${focus.stock > 0 ? `Stok saat ini ${focus.stock} unit.` : 'Saat ini semua unitnya sedang disewa.'}`, ['Hitung total sewa 3 hari', 'Aksesori apa yang termasuk?'], [focus]);
        const sizes = [...new Set(inStock.flatMap((p) => p.size.map((s) => s.toUpperCase())))];
        if (sizes.length) return out(`Ukuran yang tersedia di katalog saat ini: ${sizes.join(', ')}. Mau cek yang mana?`, sizes.slice(0, 3).map((size) => `Ada kostum ukuran ${size}?`));
    }
    if (has(/\b(aksesori|termasuk|bonus|wig|perlengkapan)\b/)) {
        const extras = 'Aksesori tambahan yang bisa dipilih saat memesan: styling wig premium +Rp35.000/hari dan paket perawatan kostum +Rp15.000/hari.';
        if (focus) return out(`${focus.accessories?.length ? `**${focus.name}** sudah termasuk: ${focus.accessories.join(', ')}.` : `Untuk **${focus.name}**, belum ada daftar aksesori khusus yang tercatat.`} ${extras}`, ['Hitung total sewa 3 hari', 'Ukuran apa saja yang ada?'], [focus]);
        return out(`${extras} Daftar aksesori bawaan tiap kostum ada di halaman detailnya.`, ['Gimana cara sewa?']);
    }

    // 6. Murah / anggaran
    const ribuMatch = text.match(/(\d+)\s*ribu/);
    const fullMatch = text.match(/\b(\d{5,7})\b/);
    const budgetMatch = ribuMatch || fullMatch;
    if (has(/\b(murah|hemat|budget|terjangkau|irit)\b/) || budgetMatch) {
        const limit = ribuMatch ? Number(ribuMatch[1]) * 1000 : (fullMatch ? Number(fullMatch[1]) : Infinity);
        const cheap = [...inStock].filter((p) => p.price <= limit).sort((a, b) => a.price - b.price).slice(0, 3);
        if (cheap.length) return out(budgetMatch ? `Yang masih di bawah ${money(limit)}/hari:` : 'Ini yang paling ramah di kantong dan masih tersedia:', ['Hitung total sewa 3 hari', 'Ada ukuran M?'], cheap);
        return out(`Belum ada yang tersedia di kisaran itu. Kostum paling terjangkau saat ini mulai ${money(Math.min(...inStock.map((p) => p.price)))}/hari.`);
    }

    // 7. Rekomendasi
    if (has(/\b(pemula|simpel|simple|mudah|rekomendasi|saran|populer|favorit|terlaris|bagus)\b/)) {
        const top = [...inStock].sort((a, b) => (b.rating * Math.log(b.reviews + 2)) - (a.rating * Math.log(a.reviews + 2))).slice(0, 3);
        if (top.length) return out(chatPick(['Kalau mau yang aman dan banyak disukai, coba ini:', 'Ini beberapa yang rating-nya bagus dan masih tersedia:']), ['Yang paling murah?', 'Ada kostum ukuran M?'], top);
    }

    // 8. Kostum tertentu
    if (named.length) {
        const lines = named.map((p) => `- **${p.name}** (${p.series}): ${chatStockLine(p)}, ${money(p.price)}/hari`).join('\n');
        return out(`${named.length > 1 ? 'Ada beberapa yang cocok:' : 'Ketemu!'}\n${lines}`, ['Hitung total sewa 3 hari', 'Ukuran apa saja yang ada?'], named);
    }

    // 9. Aturan & alur (dipisah per topik agar jawabannya relevan)
    if (has(/\b(denda|telat|terlambat|keterlambatan)\b/)) return out('Kalau telat mengembalikan, dendanya 25% dari harga sewa per hari. Jadi usahakan kirim balik tepat di hari terakhir sewa ya.', ['Cara mengembalikan kostum', 'Aturan merawat kostum']);
    if (has(/\b(batal|cancel|refund)\b/)) return out('Pembatalan sebelum kostum disiapkan: DP kembali penuh. Kalau kostum sudah dikirim, ongkirnya tidak bisa dikembalikan.', ['Berapa deposit & DP-nya?']);
    if (has(/(cuci|setrika|\blem\b|rusak|hilang|\bubah\b|modif|rawat)/)) return out('Kostum tidak boleh dicuci, disetrika, dilem, atau diubah tanpa izin. Kalau ada komponen yang rusak atau hilang, deposit bisa dipotong sesuai kerusakannya.', ['Berapa deposit & DP-nya?', 'Denda telat berapa?']);
    if (has(/\b(deposit|dp|uang muka|jaminan)\b/)) return out('DP minimal **50%** dari total untuk mengamankan pesanan, sisanya paling lambat H-1 sebelum kostum dikirim. Deposit bersifat refundable dan kembali maksimal 3 hari kerja setelah kostum dicek. Penyewa dengan riwayat baik bisa dapat keringanan deposit 50%.', ['Hitung total sewa 3 hari', 'Denda telat berapa?']);
    if (has(/\b(kirim|pengiriman|ongkir|jne|ekspedisi|antar|kembali|balikin|mengembalikan)\b/)) return out('Kostum dikirim lewat JNE Express dengan ongkir estimasi Rp18.000, dan nomor resi muncul di menu Pesanan Saya. Pengembalian dilakukan di hari terakhir masa sewa.', ['Denda telat berapa?', 'Status pesananku sekarang?']);
    if (has(/\b(syarat|umur|usia|ktp|daftar|akun|identitas)\b/)) return out('Penyewa minimal 17 tahun dan perlu akun dengan data diri lengkap: nama, telepon, alamat, media sosial, nomor penjamin, dan selfie memegang identitas.', ['Gimana cara sewa?']);
    if (has(/\b(cara|alur|langkah|prosedur|bagaimana)\b/) || has(/\b(aturan|rules|ketentuan)\b/)) {
        return out('Alurnya begini:\n- Pilih kostum, ukuran, lama sewa (1–7 hari), dan tanggal mulai\n- Isi alamat pengiriman, lalu bayar DP minimal 50% dan unggah bukti\n- Admin verifikasi, kostum dikirim via JNE\n- Pakai kostumnya, lalu kembalikan di hari terakhir sewa', ['Berapa deposit & DP-nya?', 'Syarat jadi penyewa']);
    }

    // 10. Event
    if (has(/\b(event|jadwal|acara|komunitas|festival)\b/)) {
        const events = state.events.filter((event) => event.status === 'Disetujui').slice(0, 3);
        return events.length
            ? out(`Event yang sedang tayang:\n${events.map((e) => `- **${e.title}**, ${e.date}, ${e.location}`).join('\n')}`, ['Kostum yang cocok untuk event?'])
            : out('Belum ada event komunitas yang tayang saat ini. Cek lagi nanti ya.');
    }

    if (focus && (has(/\b(ini|itu|tadi|tersebut)\b/) || (state.page === 'detail' && has(/\b(stok|tersedia|masih)\b/)))) {
        return out(`**${focus.name}** (${focus.series}): ${chatStockLine(focus)}, ${money(focus.price)}/hari dengan deposit ${money(focus.deposit)}.`, ['Hitung total sewa 3 hari', 'Aksesori apa yang termasuk?'], [focus]);
    }

    // 11. Stok / katalog umum
    if (has(/\b(stok|katalog|daftar|tersedia)\b/) && inStock.length) {
        return out(`Saat ini ada ${inStock.length} kostum yang siap disewa. Beberapa di antaranya:`, ['Yang paling murah?', 'Ada kostum ukuran M?'], inStock.slice(0, 3));
    }

    // 12. Tidak paham → tanya balik, bukan jawaban generik yang sama terus
    return out(chatPick([
        'Hmm, aku kurang nangkep maksudnya. Kamu lagi cari kostum, mau tanya aturan sewa, atau soal event?',
        'Maaf, aku belum paham yang itu. Coba sebut nama kostum, ukuran, atau topiknya (mis. deposit, pengiriman) ya.',
        'Boleh diperjelas sedikit? Aku bisa bantu soal stok, harga, aturan sewa, dan event.',
    ]), defaultChatSuggestions().slice(0, 3));
};

const openProductModal = (product = null) => {
    const editing = Boolean(product);
    const item = product || { name: '', series: '', category: 'Anime', price: 80000, deposit: 250000, stock: 3, size: ['S', 'M', 'L'], sizeStock: { S: 1, M: 1, L: 1 }, image: '', images: [], description: '' };
    state.modalImages = [...(item.images?.length ? item.images : (item.image ? [item.image] : []))];
    const stockSizes = [...new Set([...SIZE_OPTIONS, ...(item.size || [])])];
    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><div class="admin-content-header"><h2 id="product-modal-title">${editing ? 'Edit kostum' : 'Tambah kostum'}</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><form id="product-form" class="stack"><input type="hidden" name="id" value="${escapeHtml(item.id || '')}"><div class="field"><label>Nama kostum</label><input class="input" name="name" required value="${escapeHtml(item.name)}"></div><div class="form-grid"><div class="field"><label>Serial / fandom</label><input class="input" name="series" required value="${escapeHtml(item.series)}"></div><div class="field"><label>Kategori</label><select class="select" name="category">${categories.map((category) => `<option ${category.name === item.category ? 'selected' : ''}>${category.name}</option>`).join('')}</select></div><div class="field"><label>Harga sewa / hari</label><input class="input" name="price" type="number" min="1000" required value="${item.price}"></div><div class="field"><label>Deposit</label><input class="input" name="deposit" type="number" min="0" required value="${item.deposit}"></div><div class="field span-2"><label>Stok per ukuran</label><div class="size-stock-grid">${stockSizes.map((label) => `<label class="size-stock-item"><span>${escapeHtml(label)}</span><input class="input" type="number" min="0" max="9999" inputmode="numeric" data-size-stock="${escapeHtml(label)}" value="${item.sizeStock && label in item.sizeStock ? item.sizeStock[label] : ''}" placeholder="–" aria-label="Stok ukuran ${escapeHtml(label)}"></label>`).join('')}</div><small class="muted">Isi jumlah unit tiap ukuran yang disewakan. Kosongkan jika ukuran tidak tersedia; isi 0 bila ukuran ada tetapi stok habis.</small></div></div><div class="field"><label>Foto kostum <small class="muted">(maks. ${MAX_GALLERY} · foto pertama = sampul)</small></label><div id="gallery-editor">${galleryEditorMarkup()}</div><div class="gallery-add"><label class="button button-secondary button-small file-button">${icon('add_photo_alternate')} Unggah foto<input id="product-image-file" type="file" accept="image/*" multiple hidden></label><input class="input" id="product-image-url" type="url" placeholder="…atau tempel URL foto (https://...)"><button class="button button-soft button-small" type="button" data-action="gallery-add-url">Tambah URL</button></div><small class="muted">Foto otomatis dikecilkan. ${editing ? 'Jika semua foto dihapus, foto lama dipertahankan.' : 'Jika kosong, dipakai gambar placeholder.'}</small></div><div class="field"><label>Deskripsi</label><textarea class="textarea" name="description">${escapeHtml(item.description)}</textarea></div><button class="button button-primary" type="submit">${editing ? 'Simpan perubahan' : 'Tambah ke katalog'}</button></form></section></div>`;
    render();
};

const openReviewModal = (order) => {
    const review = order.review;
    const rating = review?.rating || 0;
    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="review-modal-title"><div class="admin-content-header"><h2 id="review-modal-title">${review ? 'Ubah ulasan' : 'Beri ulasan'}</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><form id="review-form" class="stack"><input type="hidden" name="orderId" value="${escapeHtml(order.id)}"><input type="hidden" name="rating" value="${rating}"><p class="muted small">${escapeHtml(order.productName || 'Kostum')} · ${escapeHtml(order.size)} · ${escapeHtml(order.id)}</p><div class="star-picker" role="radiogroup" aria-label="Penilaian bintang">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star-btn ${n <= rating ? 'on' : ''}" data-star="${n}" role="radio" aria-checked="${n === rating}" aria-label="${n} bintang">${icon('star', 'filled')}</button>`).join('')}</div><small class="muted star-hint">${rating ? ['', 'Kurang puas', 'Biasa saja', 'Cukup baik', 'Bagus', 'Luar biasa'][rating] : 'Ketuk bintang untuk menilai.'}</small><div class="field"><label for="review-comment">Ceritakan pengalamanmu</label><textarea class="textarea" id="review-comment" name="comment" maxlength="1000" placeholder="Kualitas kostum, kebersihan, kecocokan ukuran, kondisi saat tiba…">${escapeHtml(review?.comment || '')}</textarea></div><p class="small auth-error" data-review-error role="alert" hidden></p><button class="button button-primary" type="submit">${review ? 'Simpan ulasan' : 'Kirim ulasan'}</button></form></section></div>`;
    render();
};
const openReplyModal = (review) => {
    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="reply-modal-title"><div class="admin-content-header"><h2 id="reply-modal-title">Balas ulasan</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><form id="reply-form" class="stack"><input type="hidden" name="id" value="${review.id}"><div class="review-item"><strong>${escapeHtml(review.customerFullName || review.customerName)}</strong> ${stars(review.rating)}<p>${review.comment ? escapeHtml(review.comment) : '<span class="muted">Tanpa komentar.</span>'}</p></div><div class="field"><label for="reply-text">Balasan penjual (tampil publik)</label><textarea class="textarea" id="reply-text" name="reply" maxlength="1000" placeholder="Terima kasih sudah menyewa di Let'sCosplay…">${escapeHtml(review.reply || '')}</textarea><small class="muted">Kosongkan lalu simpan untuk menghapus balasan.</small></div><button class="button button-primary" type="submit">Simpan balasan</button></form></section></div>`;
    render();
};
const openKtpModal = async (userId) => {
    try {
        const data = await api(`/identities/${encodeURIComponent(userId)}`);
        state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="ktp-modal-title"><div class="admin-content-header"><h2 id="ktp-modal-title">Verifikasi KTP</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><div class="stack"><div><strong>${escapeHtml(data.name)}</strong><p class="muted small">${escapeHtml(data.email)} · ${escapeHtml(data.phone || '-')}</p><p class="small">${escapeHtml(data.socialPlatform || '')} ${escapeHtml(data.socialHandle || '')} · Penjamin: ${escapeHtml(data.guarantor || '-')}</p>${ktpPill(data.status)}${data.status === 'rejected' && data.rejectReason ? `<p class="small" style="color:var(--red)">Alasan: ${escapeHtml(data.rejectReason)}</p>` : ''}</div><p class="muted small" style="margin:0">Pastikan wajah terlihat, KTP terbaca jelas, dan nama sesuai akun (“${escapeHtml(data.name)}”).</p>${data.idSelfieImage ? `<img class="upload-preview" src="${escapeHtml(data.idSelfieImage)}" alt="Selfie dengan KTP milik ${escapeHtml(data.name)}">` : '<div class="empty-state">Foto tidak tersedia.</div>'}<p class="muted small" style="margin:0">${escapeHtml(data.fileName || '')}</p><div class="quantity-row"><button class="button button-primary" type="button" data-action="ktp-approve" data-id="${data.userId}" ${data.status === 'verified' ? 'disabled' : ''}>${icon('verified_user')} Setujui KTP</button><button class="button button-danger" type="button" data-action="ktp-reject" data-id="${data.userId}">Tolak</button></div></div></section></div>`;
        render();
    } catch (error) {
        showToast(error.message || 'Foto KTP tidak dapat dimuat.');
    }
};
const reviewKtp = async (userId, status) => {
    let reason = '';
    if (status === 'rejected') {
        const answer = prompt('Alasan penolakan (akan dibaca penyewa), mis. foto buram / KTP tidak terbaca:', '');
        if (answer === null) return;
        reason = answer.trim();
        if (!reason) { showToast('Alasan penolakan wajib diisi.'); return; }
    }
    try {
        const { identity } = await api(`/identities/${encodeURIComponent(userId)}`, { method: 'PATCH', body: { status, reason } });
        if (state.identities) state.identities = state.identities.map((item) => (item.userId === identity.userId ? identity : item));
        state.orders = state.orders.map((order) => (order.userId === identity.userId ? { ...order, idStatus: identity.status } : order));
        state.modal = null;
        render();
        showToast(status === 'verified' ? 'KTP diverifikasi. Pesanan penyewa kini bisa diproses.' : 'KTP ditolak. Penyewa melihat alasannya di halaman profil.');
    } catch (error) {
        showToast(error.message || 'Gagal menyimpan verifikasi.');
    }
};
const openStockModal = (product) => {
    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title"><div class="admin-content-header"><h2 id="stock-modal-title">Atur stok · ${escapeHtml(product.name)}</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><form id="stock-form" class="stack"><input type="hidden" name="id" value="${escapeHtml(product.id)}"><p class="muted small">Isi angka <strong>positif</strong> untuk menambah stok, <strong>negatif</strong> untuk mengurangi. Ukuran baru ditambahkan lewat tombol Edit.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Ukuran</th><th>Stok sekarang</th><th>Tambah / kurang</th></tr></thead><tbody>${product.size.map((label) => `<tr><td><strong>${escapeHtml(label)}</strong></td><td><span class="size-chip ${stockTone(sizeStockOf(product, label))}">${sizeStockOf(product, label)} unit</span></td><td><input class="input" type="number" step="1" min="-100" max="100" value="0" data-stock-delta="${escapeHtml(label)}" aria-label="Tambah atau kurangi stok ${escapeHtml(label)}"></td></tr>`).join('')}</tbody></table></div><button class="button button-primary" type="submit">Simpan perubahan stok</button></form></section></div>`;
    render();
};
const galleryEditorMarkup = () => (state.modalImages.length
    ? `<div class="gallery-grid">${state.modalImages.map((src, index) => `<figure class="gallery-thumb ${index === 0 ? 'is-cover' : ''}"><img src="${escapeHtml(src)}" alt="Foto ${index + 1}"><figcaption>${index === 0 ? 'Sampul' : `<button type="button" class="text-button" data-action="gallery-cover" data-index="${index}">Jadikan sampul</button>`}</figcaption><button type="button" class="gallery-remove" data-action="gallery-remove" data-index="${index}" aria-label="Hapus foto ${index + 1}">${icon('close')}</button></figure>`).join('')}</div>`
    : '<p class="muted small">Belum ada foto.</p>');
const refreshGalleryEditor = () => { const holder = document.querySelector('#gallery-editor'); if (holder) holder.innerHTML = galleryEditorMarkup(); };
const openSettleModal = (order) => {
    const product = orderProduct(order);
    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="settle-modal-title"><div class="admin-content-header"><h2 id="settle-modal-title">Upload pelunasan</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><form id="settle-form" class="stack"><input type="hidden" name="orderId" value="${escapeHtml(order.id)}"><p class="muted small">${escapeHtml(product.name)} · ${escapeHtml(order.id)}</p><div class="price-line total"><span>Sisa tagihan</span><strong>${money(Number(order.remainingAmount || 0))}</strong></div><div class="payment-choice"><label><input type="radio" name="paymentMethod" value="Transfer bank" required checked> Transfer bank<br><small class="muted">BCA · BNI · Mandiri</small></label><label><input type="radio" name="paymentMethod" value="E-wallet" required> E-wallet<br><small class="muted">GoPay · OVO · DANA</small></label></div><div class="payment-destination" data-payment-destination style="display:grid;gap:10px" aria-live="polite">${paymentDestinationMarkup('Transfer bank')}</div><div class="field"><label for="settle-proof">Unggah bukti pelunasan *</label><input class="input" id="settle-proof" name="settleProof" type="file" accept="image/*" required><small class="muted">JPG atau PNG, maksimal 8 MB.</small></div><p class="small auth-error" data-settle-error role="alert" hidden></p><button class="button button-primary" type="submit">Kirim bukti pelunasan</button></form></section></div>`;
    render();
};
const openReturnModal = (order) => {
    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="return-modal-title"><div class="admin-content-header"><h2 id="return-modal-title">Kembalikan kostum</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><p class="muted small">${escapeHtml(orderProduct(order).name)} · ${escapeHtml(order.id)}</p>${returnGuideMarkup(order)}${returnFormMarkup(order)}</section></div>`;
    render();
};
const openShipModal = (order) => {
    const paid = Boolean(order.isPaidOff);
    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="ship-modal-title"><div class="admin-content-header"><h2 id="ship-modal-title">Atur jadwal &amp; resi kirim</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><form id="ship-form" class="stack"><input type="hidden" name="orderId" value="${escapeHtml(order.id)}"><p class="muted small">${escapeHtml(order.customerName)} · ${escapeHtml(order.id)} · Mulai sewa ${escapeHtml(formatDate(order.rentalDate))}</p>${paid ? '' : `<div class="notice" role="alert">${icon('warning')} Penyewa belum lunas (sisa ${money(Number(order.remainingAmount || 0))}). Input resi kirim dikunci sampai pelunasan diterima. Jadwal kirim tetap bisa diatur, atau kirim bisa ditunda.</div>`}<div class="field"><label for="ship-date">Jadwal / estimasi kirim</label><input class="input" id="ship-date" name="estimatedShipDate" type="date" value="${escapeHtml(orderShipDate(order))}"><small class="muted">Tanggal ini tampil ke penyewa di halaman pesanan.</small></div><div class="field"><label for="ship-tracking">Nomor resi kirim (JNE Express)</label><input class="input" id="ship-tracking" name="trackingNumber" maxlength="60" value="${escapeHtml(order.trackingNumber || '')}" placeholder="${paid ? 'Masukkan nomor resi' : 'Terkunci — menunggu pelunasan'}" ${paid ? '' : 'disabled'}><small class="muted">Mengisi resi memindahkan pesanan ke tahap Dikirim JNE.</small></div><button class="button button-primary" type="submit">Simpan</button></form></section></div>`;
    render();
};
const acceptRules = async (checked) => {
    if (state.session?.role === 'admin') { showToast('Akun admin tidak perlu menyetujui aturan.'); render(); return; }
    if (!checked) {
        if (state.session?.rulesAcceptedAt) showToast('Persetujuan sudah tercatat di akunmu dan tidak bisa dibatalkan.');
        else { state.rulesLocal = false; writeStorage(STORAGE_KEYS.rules, false); }
        render();
        return;
    }
    state.rulesLocal = true;
    writeStorage(STORAGE_KEYS.rules, true);
    if (state.session?.role === 'customer') {
        try {
            const result = await api('/rules/accept', { method: 'POST', body: {} });
            setSession(result.user);
            showToast('Terima kasih! Persetujuan aturan tercatat di akunmu.');
        } catch (error) { showToast(error.message || 'Gagal menyimpan persetujuan.'); }
    } else showToast('Tersimpan di perangkat ini. Masuk sebagai penyewa agar tercatat di akunmu.');
    render();
};

app.addEventListener('click', (event) => {
    const star = event.target.closest('[data-star]');
    if (star) {
        const value = Number(star.dataset.star);
        const form = star.closest('form');
        form.elements.rating.value = value;
        form.querySelectorAll('[data-star]').forEach((btn) => { const on = Number(btn.dataset.star) <= value; btn.classList.toggle('on', on); btn.setAttribute('aria-checked', String(Number(btn.dataset.star) === value)); });
        const hint = form.querySelector('.star-hint');
        if (hint) hint.textContent = ['', 'Kurang puas', 'Biasa saja', 'Cukup baik', 'Bagus', 'Luar biasa'][value];
        return;
    }
    const adminOrderTab = event.target.closest('[data-admin-order-filter]');
    if (adminOrderTab) { state.adminOrderFilter = adminOrderTab.dataset.adminOrderFilter; render(); return; }
    const ktpTab = event.target.closest('[data-ktp-filter]');
    if (ktpTab) { state.ktpFilter = ktpTab.dataset.ktpFilter; render(); return; }
    const reviewTab = event.target.closest('[data-review-filter]');
    if (reviewTab) { state.adminReviewFilter = reviewTab.dataset.reviewFilter; render(); return; }
    const chartMetric = event.target.closest('[data-chart-metric]');
    if (chartMetric) { state.chartMetric = chartMetric.dataset.chartMetric; render(); return; }
    const chartPeriod = event.target.closest('[data-chart-period]');
    if (chartPeriod) { state.chartPeriod = chartPeriod.dataset.chartPeriod; render(); return; }
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

    const eventFilterTab = event.target.closest('[data-event-filter]');
    if (eventFilterTab) { state.eventFilter = eventFilterTab.dataset.eventFilter; render(); return; }

    const accountTab = event.target.closest('[data-account-tab]');
    if (accountTab) { state.accountTab = accountTab.dataset.accountTab; render(); return; }

    const suggestion = event.target.closest('[data-chat-suggest]');
    if (suggestion) { sendChat(suggestion.dataset.chatSuggest); return; }

    const go = event.target.closest('[data-go]');
    if (go) {
        event.preventDefault();
        const target = go.dataset.go;
        if (target === 'admin' && state.session?.role !== 'admin') return navigate('admin');
        if (go.classList.contains('chat-card')) state.chatOpen = false; // beri ruang untuk halaman detail
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
        if (state.adminSection === 'ktp') state.identities = null;
        if (state.adminSection === 'reviews') state.adminReviews = null;
        state.paymentDraft = null;
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
            case 'checkout':
                if (state.session?.role !== 'admin' && !rulesAccepted()) {
                    state.rulesReturn = true;
                    showToast('Baca dan setujui Aturan Rental dulu sebelum memesan.');
                    navigate('rules');
                    break;
                }
                navigate('checkout');
                break;
            case 'rules-accept': acceptRules(action.checked); break;
            case 'size-inc':
            case 'size-dec': {
                const product = productById(state.param || state.productId);
                const label = action.dataset.sizeName;
                const left = sizeStockOf(product, label);
                const next = (state.sizeQty[label] || 0) + (action.dataset.action === 'size-inc' ? 1 : -1);
                if (next > left) { showToast(`Stok ukuran ${label} hanya ${left} unit.`); break; }
                if (next <= 0) delete state.sizeQty[label]; else state.sizeQty[label] = next;
                render();
                break;
            }
            case 'return-order': { const order = state.orders.find((item) => item.id === id); if (order) openReturnModal(order); break; }
            case 'approve-order': updateOrder(id, { stage: 2 }, 'Verifikasi disetujui. Pesanan masuk tahap Diproses.'); break;
            case 'ship-schedule': { const order = state.orders.find((item) => item.id === id); if (order) openShipModal(order); break; }
            case 'hold-shipping': {
                const order = state.orders.find((item) => item.id === id);
                const reason = prompt('Alasan tunda kirim (akan terlihat oleh penyewa):', order?.shippingHoldReason || 'Menunggu pelunasan sisa tagihan H-1 pengiriman');
                if (order && reason !== null) updateOrder(id, { shippingHoldReason: reason.trim() || 'Menunggu pelunasan sisa tagihan H-1 pengiriman' }, 'Pengiriman ditunda.');
                break;
            }
            case 'release-hold': updateOrder(id, { shippingHoldReason: null }, 'Tunda kirim dilepas.'); break;
            case 'receive-order': updateOrder(id, { stage: 5 }, 'Pesanan ditandai diterima penyewa.'); break;
            case 'confirm-return': {
                const order = state.orders.find((item) => item.id === id);
                if (!order || !orderReturnReady(order)) { showToast('Menunggu penyewa mengirim resi & foto paket retur.'); break; }
                if (confirm(`Konfirmasi kostum pesanan ${id} sudah kembali dan deposit dikembalikan?`)) updateOrder(id, { stage: 7 }, 'Retur dikonfirmasi & deposit ditandai dikembalikan.');
                break;
            }
            case 'toggle-doc-zoom': {
                const zoomed = action.dataset.zoomed === '1';
                action.dataset.zoomed = zoomed ? '' : '1';
                action.style.aspectRatio = zoomed ? '4 / 3' : 'auto';
                action.style.objectFit = zoomed ? 'cover' : 'contain';
                action.style.maxHeight = zoomed ? '' : '70vh';
                action.style.cursor = zoomed ? 'zoom-in' : 'zoom-out';
                break;
            }
            case 'settle-order': { const order = state.orders.find((item) => item.id === id); if (order) openSettleModal(order); break; }
            case 'copy-return-address': copyReturnAddress(); break;
            case 'copy-account': copyAccountNumber(action.dataset.number); break;
            case 'pay-add': addPaymentRow(action.dataset.kind); break;
            case 'pay-remove': removePaymentRow(action.dataset.kind, Number(action.dataset.index)); break;
            case 'pay-reset': state.paymentDraft = null; render(); showToast('Perubahan dibatalkan.'); break;
            case 'review-order': { const order = state.orders.find((item) => item.id === id); if (order) openReviewModal(order); break; }
            case 'reply-review': { const review = state.adminReviews?.reviews.find((item) => String(item.id) === String(id)); if (review) openReplyModal(review); break; }
            case 'ktp-view': openKtpModal(id); break;
            case 'ktp-approve': reviewKtp(id, 'verified'); break;
            case 'ktp-reject': reviewKtp(id, 'rejected'); break;
            case 'stock-modal': openStockModal(productById(id)); break;
            case 'gallery-remove': state.modalImages.splice(Number(action.dataset.index), 1); refreshGalleryEditor(); break;
            case 'gallery-cover': { const [picked] = state.modalImages.splice(Number(action.dataset.index), 1); state.modalImages.unshift(picked); refreshGalleryEditor(); break; }
            case 'gallery-add-url': {
                const input = document.querySelector('#product-image-url');
                const url = String(input?.value || '').trim();
                if (!/^https?:\/\//i.test(url)) { showToast('Masukkan URL foto yang diawali https://'); break; }
                if (state.modalImages.length >= MAX_GALLERY) { showToast(`Maksimal ${MAX_GALLERY} foto per kostum.`); break; }
                state.modalImages.push(url);
                input.value = '';
                refreshGalleryEditor();
                break;
            }
            case 'account-reset': render(); showToast('Perubahan dibatalkan.'); break;
            case 'clear-search': state.search = ''; state.catalogPage = 1; render(); break;
           case 'reset-filters': state.category = ''; state.search = ''; state.maxPrice = null; state.sizeFilters = []; state.onlyAvailable = true; state.onlyFavorites = false; state.catalogPage = 1; render(); break;
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
                    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="renter-modal-title" style="width:min(860px,calc(100vw - 32px));max-height:90vh;overflow:auto"><div class="admin-content-header"><h2 id="renter-modal-title">Verifikasi penyewa</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><div class="stack"><div style="display:grid;gap:10px"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap"><div><strong>${escapeHtml(order.customerName)}</strong><p class="muted small" style="margin:2px 0 0">${escapeHtml(order.phone)} · Penjamin ${escapeHtml(order.guarantor)}</p></div><div style="display:flex;gap:6px;flex-wrap:wrap">${adminPaymentPill(order)}<span class="status-pill">${escapeHtml(orderStages[order.stage ?? 0])}</span></div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px">${adminInfoTile('Skor kepercayaan AI', `${Number(order.trustScore || 55)}/100`)}${adminInfoTile('Deposit', money(order.deposit || 0))}${adminInfoTile('Total / DP', `${money(order.total || 0)} / ${money(order.dp || 0)}`)}${adminInfoTile('Sosial media', `${escapeHtml(order.socialPlatform)} ${escapeHtml(order.socialHandle)}`)}</div><p class="small" style="margin:0">${escapeHtml(order.address)}</p>${orderExtraDetails(order)}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px">${adminDocTile('Foto Selfie KTP', escapeHtml(order.idSelfieName || 'Tidak tersedia'), order.idSelfieImage, 'Selfie identitas penyewa', 'Selfie belum tersedia')}${adminDocTile(`Bukti DP · ${escapeHtml(order.paymentMethod || '-')}`, escapeHtml(order.paymentProofName || 'Tidak tersedia'), order.paymentProofImage, 'Bukti DP penyewa', 'Bukti DP belum tersedia')}${adminDocTile(`Bukti Pelunasan · ${escapeHtml(order.finalPaymentMethod || '-')}`, `${escapeHtml(order.finalPaymentProofName || 'Belum ada bukti pelunasan')}${order.finalPaidAt ? ` · ${escapeHtml(order.finalPaidAt)}` : ''}`, order.finalPaymentProofImage, 'Bukti pelunasan penyewa', 'Belum ada bukti pelunasan')}${adminDocTile('Bukti Pengembalian Kostum', `Resi: ${escapeHtml(order.returnTrackingNumber || '-')} · Dikirim: ${escapeHtml(order.returnedAt || '-')}${order.returnProofName ? ` · ${escapeHtml(order.returnProofName)}` : ''}`, order.returnProofImage, 'Foto paket pengembalian kostum', 'Foto paket retur belum tersedia')}</div><p class="muted small" style="margin:0">Klik gambar untuk memperbesar atau memperkecil.</p></div></section></div>`;
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
                const item = state.events.find((candidate) => String(candidate.id) === String(id));
                const refund = item?.tier === 'Prabayar' && !approve && item.status === 'Menunggu review'
                    ? Math.round(Number(item.amountPaid || item.promotionPrice || 0) * 0.97)
                    : 0;
                const promptText = approve
                    ? 'Setujui event dan tayangkan iklannya?'
                    : refund ? `Tolak pengajuan? Refund ${money(refund)} (97% setelah potongan 3%) akan menunggu transfer manual.` : 'Tolak atau turunkan event ini?';
                if (!confirm(promptText)) break;
                api(`/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status: approve ? 'Disetujui' : 'Ditolak' } })
                    .then(({ event: updated }) => {
                        state.events = state.events.map((item) => (String(item.id) === String(id) ? normalizeEvent(updated) : item));
                        render();
                        showToast(approve ? 'Event disetujui dan dipublikasikan.' : refund ? `Pengajuan ditolak. Refund ${money(refund)} menunggu diproses.` : 'Pengajuan event ditolak.');
                    })
                    .catch((error) => showToast(error.message));
                break;
            }
            case 'complete-event-refund':
                if (!confirm('Pastikan transfer refund ke rekening pemilik sudah dilakukan. Tandai refund selesai?')) break;
                api(`/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: { refundStatus: 'Sudah dikembalikan' } })
                    .then(({ event: updated }) => {
                        state.events = state.events.map((item) => (String(item.id) === String(id) ? normalizeEvent(updated) : item));
                        render();
                        showToast('Refund ditandai selesai.');
                    })
                    .catch((error) => showToast(error.message));
                break;
            case 'organizer-chat-toggle':
                state.organizerChatOpen = !state.organizerChatOpen;
                render();
                if (state.organizerChatOpen) refreshOrganizerChat();
                break;
            case 'organizer-flow-confirm': handleOrganizerFlowChoice(action.dataset.answer); break;
            case 'organizer-flow-edit': requestOrganizerFieldCorrection(action.dataset.field); break;
            case 'organizer-flow-skip': handleOrganizerFlowChoice('skip'); break;
            case 'organizer-flow-retry': generateConfirmedAdCopy(); break;
            case 'event-ai-draft': generateEventDraft(); break;
            case 'toggle-featured': {
                const item = state.events.find((candidate) => String(candidate.id) === String(id));
                api(`/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: { featured: !item?.featured } })
                    .then(({ event: updated }) => {
                        state.events = state.events.map((candidate) => (String(candidate.id) === String(id) ? normalizeEvent(updated) : candidate));
                        render();
                        showToast(updated.featured ? 'Event dijadikan unggulan.' : 'Status unggulan dilepas.');
                    })
                    .catch((error) => showToast(error.message));
                break;
            }
            case 'qr-download': downloadQrPoster(action.dataset.tier).catch(() => showToast('Poster QR gagal dibuat.')); break;
            case 'qr-copy': {
                const url = qrUrl(action.dataset.tier);
                (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => showToast('Tautan disalin.')).catch(() => prompt('Salin tautan ini:', url));
                break;
            }
            case 'qr-open': window.open(qrUrl(action.dataset.tier), '_blank', 'noopener'); break;
            case 'qr-reset': try { localStorage.removeItem(STORAGE_KEYS.qrBase); } catch {} render(); showToast('Memakai alamat browser saat ini.'); break;
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
            case 'view-refund-proof': {
                const item = state.events.find((candidate) => String(candidate.id) === String(id));
                if (item?.refundProofImage) {
                    state.modal = `<div class="modal-backdrop" data-action="close-modal"><section class="panel modal-panel" role="dialog" aria-modal="true"><div class="admin-content-header"><h2>Bukti refund</h2><button class="icon-button" data-action="close-modal" type="button" aria-label="Tutup">${icon('close')}</button></div><p class="muted small">${escapeHtml(item.refundProofName || '')}</p><img class="upload-preview" src="${escapeHtml(item.refundProofImage)}" alt="Bukti refund pengajuan event"></section></div>`;
                    render();
                }
                break;
            }
            case 'event-pairing': navigate('event', id); break;
            case 'close-modal': if (!action.classList.contains('modal-backdrop') || event.target === action) { state.modal = null; render(); } break;
            case 'forgot': showToast('Demo: silakan hubungi admin untuk reset kata sandi.'); break;
            case 'menu': {
                const drawer = document.querySelector('#admin-sidebar');
                if (drawer) {
                    const open = drawer.classList.toggle('open');
                    document.querySelector('.admin-backdrop')?.classList.toggle('show', open);
                    document.querySelector('.mobile-menu')?.setAttribute('aria-expanded', String(open));
                } else document.querySelector('.main-nav')?.classList.toggle('menu-open');
                break;
            }
            case 'chat-toggle': state.chatOpen = !state.chatOpen; render(); if (state.chatOpen) focusChat(); break;
            case 'chat-close': state.chatOpen = false; render(); break;
            case 'chat-reset':
                state.chatRequestId += 1;
                state.chatLoading = false;
                stopChatReveal();
                state.chatMessages = [];
                clearChatHistory();
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
    const orderTab = event.target.closest('[data-order-filter]');
    if (orderTab) { state.orderFilter = orderTab.dataset.orderFilter; render(); return; }
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) { state.catalogPage = Number(pageButton.dataset.page); render(); return; }
});

app.addEventListener('input', (event) => {
    if (event.target.matches('[data-return-field]')) {
        const draft = paymentDraft();
        draft.returnAddress = { ...draft.returnAddress, [event.target.dataset.returnField]: event.target.value };
    }
    if (event.target.matches('[data-pay-field]')) {
        const row = paymentDraft()[event.target.dataset.payKind]?.[Number(event.target.dataset.payIndex)];
        if (row) row[event.target.dataset.payField] = event.target.value;
    }
    if (event.target.matches('[data-group-field]')) state.group[event.target.dataset.groupField] = event.target.value;
    if (event.target.matches('#fit-height, #fit-weight, #fit-notes, #previous-store, #renter-address')) updateAIAssistant();
    if (event.target.matches('#renter-address')) updateCheckoutSummary();
    if (event.target.matches('[data-action="price-range"]')) {
        state.maxPrice = Number(event.target.value);
        event.target.nextElementSibling.textContent = `Maks. ${money(state.maxPrice)}`;
    }
    if (event.target.matches('[data-admin-search]')) {
        const query = event.target.value.toLowerCase();
        document.querySelectorAll('[data-inventory-row]').forEach((row) => { row.hidden = !row.dataset.inventoryRow.includes(query); });
    }
    if (event.target.matches('#organizer-form input, #organizer-form select, #organizer-form textarea')) updateOrganizerPreview();
});

app.addEventListener('change', (event) => {
    if (event.target.matches('input[name="paymentScheme"]')) updateCheckoutSummary({ resetAmount: true });
    if (event.target.matches('input[name="paymentMethod"]')) {
        const form = event.target.closest('form');
        const holder = form?.querySelector('[data-payment-destination]');
        if (holder) {
            const markup = paymentDestinationMarkup(event.target.value);
            holder.innerHTML = form.id === 'checkout-form' ? localizeCopy(markup) : markup;
        }
    }
    if (event.target.matches('#organizer-form input, #organizer-form select, #organizer-form textarea')) updateOrganizerPreview();
    if (event.target.matches('#event-poster, #event-pdf')) {
        const form = app.querySelector('#organizer-form');
        if (form?.dataset.tier === 'paid') {
            form.dataset.aiDraftReady = 'false';
            state.organizerFlow = null;
            state.organizerChatMessages = [];
            const nextStep = form.querySelector('#paid-next-step');
            if (nextStep) {
                nextStep.hidden = true;
                nextStep.querySelectorAll('input, select, button').forEach((control) => { control.disabled = true; });
            }
            const submitButton = form.querySelector('#paid-submit');
            if (submitButton) submitButton.disabled = true;
            const status = form.querySelector('#event-ai-status');
            if (status) status.textContent = state.eventOptions?.aiAvailable
                ? 'File berubah. Jalankan AI lagi agar pratinjau sesuai dengan poster dan PDF terbaru.'
                : 'AI belum aktif. Admin perlu memasang GEMINI_API_KEY sebelum iklan Prabayar dapat dibuat.';
            refreshOrganizerChat();
        }
    }
    if (event.target.matches('#event-visual-preset')) {
        const form = app.querySelector('#organizer-form');
        if (form) {
            const presets = {
                ai: [form.dataset.aiAccentColor || '#f45193', form.dataset.aiThemeRecommendation || 'Rekomendasi AI'],
                sakura: ['#e84393', 'Sakura Pop'],
                neon: ['#6c5ce7', 'Cosmic Neon'],
                festival: ['#00a884', 'Festival Ceria'],
            };
            const [color, theme] = presets[event.target.value] || presets.ai;
            form.elements.accentColor.value = color;
            form.elements.themeRecommendation.value = theme;
            updateOrganizerPreview();
        }
    }
    if (event.target.matches('#event-duration')) {
        const price = state.eventOptions?.promotionPlans?.find((plan) => Number(plan.days) === Number(event.target.value))?.price;
        const label = app.querySelector('#event-price-label');
        if (label && price) label.textContent = `Total dibayar: ${money(price)} untuk ${event.target.selectedOptions[0].textContent.split(' · ')[0]}.`;
    }
    if (event.target.matches('#event-poster')) {
        const file = event.target.files?.[0];
        const preview = app.querySelector('#poster-preview');
        if (file && preview) {
            const url = URL.createObjectURL(file);
            preview.innerHTML = `<img src="${url}" alt="Pratinjau poster event">`;
            const image = app.querySelector('#organizer-preview-image');
            if (image) { image.src = url; image.hidden = false; }
            const placeholder = app.querySelector('.event-preview-art > span');
            if (placeholder) placeholder.hidden = true;
        }
    }
    if (event.target.matches('[name="catalog-category"]')) { state.category = event.target.value; state.catalogPage = 1; render(); }
    if (event.target.matches('[data-size-filter]')) {
        const size = event.target.dataset.sizeFilter;
        state.sizeFilters = event.target.checked ? [...new Set([...state.sizeFilters, size])] : state.sizeFilters.filter((value) => value !== size);
        state.catalogPage = 1;
        render();
    }
   if (event.target.matches('[data-availability-filter]')) { state.onlyAvailable = event.target.checked; state.catalogPage = 1; render(); }
   if (event.target.matches('[data-favorite-filter]')) { state.onlyFavorites = event.target.checked; state.catalogPage = 1; render(); }
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
    if (event.target.matches('#account-selfie')) {
        const file = event.target.files?.[0];
        const preview = document.querySelector('#account-selfie-preview');
        if (file && preview) { preview.src = URL.createObjectURL(file); preview.hidden = false; }
    }
    if (event.target.matches('[data-group-toggle]')) {
        state.group.enabled = event.target.checked;
        const fields = app.querySelector('.group-fields');
        if (fields) fields.hidden = !state.group.enabled;
        const nameInput = app.querySelector('#group-name');
        if (nameInput) nameInput.required = state.group.enabled;
    }
    if (event.target.matches('#product-image-file')) {
        const input = event.target;
        const files = [...(input.files || [])];
        (async () => {
            for (const file of files) {
                if (state.modalImages.length >= MAX_GALLERY) { showToast(`Maksimal ${MAX_GALLERY} foto per kostum.`); break; }
                try { state.modalImages.push(await imageToDataUrl(file, 720, 0.72)); } catch { showToast(`“${file.name}” bukan gambar yang valid.`); }
            }
            input.value = '';
            refreshGalleryEditor();
        })();
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

    if (formId === 'account-form') {
        const values = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        try {
            const payload = { name: String(values.get('name') || '').trim(), email: String(values.get('email') || '').trim().toLowerCase() };
            if (state.session?.role === 'customer') {
                Object.assign(payload, {
                    phone: String(values.get('phone') || '').trim(),
                    address: String(values.get('address') || '').trim(),
                    socialPlatform: String(values.get('socialPlatform') || ''),
                    socialHandle: String(values.get('socialHandle') || '').trim(),
                    guarantor: String(values.get('guarantor') || '').trim(),
                });
                const selfie = form.elements.idSelfie?.files?.[0];
                if (selfie) { payload.idSelfie = await imageToDataUrl(selfie, 1000, 0.78); payload.idSelfieName = selfie.name; }
            }
            const result = await api('/profile', { method: 'PUT', body: payload });
            setSession(result.user);
            render();
            showToast('Perubahan akun tersimpan.');
        } catch (error) {
            showToast(error.message || 'Gagal menyimpan perubahan.');
            if (submitButton) submitButton.disabled = false;
        }
        return;
    }

    if (formId === 'password-form') {
        const values = new FormData(form);
        const errorElement = form.querySelector('[data-password-error]');
        const fail = (message) => { errorElement.textContent = message; errorElement.hidden = false; };
        errorElement.hidden = true;
        if (values.get('newPassword') !== values.get('newPasswordConfirmation')) return fail('Konfirmasi kata sandi baru tidak sama.');
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        try {
            const result = await api('/password', { method: 'PUT', body: Object.fromEntries(values) });
            setSession(state.session, result.token);
            form.reset();
            showToast('Kata sandi berhasil diperbarui.');
        } catch (error) {
            fail(error.message || 'Gagal memperbarui kata sandi.');
        }
        if (submitButton) submitButton.disabled = false;
        return;
    }

    if (formId === 'qr-form') {
        let value = String(new FormData(form).get('base') || '').trim();
        if (/^[a-z][a-z\d+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) {
            showToast('Gunakan alamat yang diawali http:// atau https://.');
            return;
        }
        if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
        try {
            const parsed = new URL(value);
            if (!parsed.hostname || parsed.username || parsed.password) throw new Error('Alamat tidak valid.');
            const base = `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
            try { localStorage.setItem(STORAGE_KEYS.qrBase, base); } catch {}
            render();
            showToast('QR diperbarui sesuai alamat baru.');
        } catch {
            showToast('Alamat tidak valid. Contoh: https://rental-kamu.com');
        }
        return;
    }

    if (formId === 'organizer-consult-form') {
        await askEventConsultant(form);
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

    if (formId === 'payment-accounts-form') {
        const draft = paymentDraft();
        const payload = { bank: normalizePaymentRows(draft.bank), ewallet: normalizePaymentRows(draft.ewallet), returnAddress: normalizeReturnAddress(draft.returnAddress) };
        if (!payload.bank.length || !payload.ewallet.length) { showToast('Minimal satu baris harus tersisa di setiap kategori.'); return; }
        if ([...payload.bank, ...payload.ewallet].some((row) => !row.provider || !row.number || !row.holder)) { showToast('Lengkapi nama, nomor, dan atas nama di setiap baris.'); return; }
        if (!payload.returnAddress.recipient || !payload.returnAddress.phone || !payload.returnAddress.address) { showToast('Lengkapi nama penerima, nomor HP, dan alamat lengkap tujuan retur.'); return; }
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        try {
            const result = await api('/payment-accounts', { method: 'PUT', body: payload });
            const source = result && (result.bank || result.ewallet) ? result : (result?.paymentAccounts || payload);
            state.paymentAccounts = normalizePaymentAccounts({ ...payload, ...source });
            state.paymentDraft = null;
            render();
            showToast('Rekening & e-wallet tersimpan.');
        } catch (error) {
            showToast(error.message || 'Gagal menyimpan rekening.');
            if (submitButton) submitButton.disabled = false;
        }
        return;
    }

    if (formId === 'return-form') {
        const values = new FormData(form);
        const order = state.orders.find((item) => item.id === String(values.get('orderId')));
        const errorElement = form.querySelector('[data-return-error]');
        const submitButton = form.querySelector('button[type="submit"]');
        const fail = (message) => {
            if (errorElement) { errorElement.textContent = message; errorElement.hidden = false; } else showToast(message);
            if (submitButton) submitButton.disabled = false;
        };
        const number = String(values.get('returnTrackingNumber') || '').trim();
        if (!order) { fail('Pesanan tidak ditemukan.'); return; }
        if (!number) { fail('Nomor resi pengembalian wajib diisi.'); return; }
        const proofFile = form.elements.returnProof?.files?.[0];
        if (!proofFile) { fail('Foto kondisi paket / resi pengembalian wajib diunggah.'); return; }
        if (submitButton) submitButton.disabled = true;
        if (errorElement) errorElement.hidden = true;
        try {
            const returnProofImage = await imageToDataUrl(proofFile);
            const result = await api(`/orders/${encodeURIComponent(order.id)}/return`, { method: 'POST', body: { returnTrackingNumber: number, returnProofName: proofFile.name, returnProofImage } });
            const updated = result?.order || (result?.id ? result : null);
            if (updated) state.orders = state.orders.map((item) => (item.id === order.id ? updated : item));
            else await loadOrders();
            state.modal = null;
            render();
            showToast('Nomor resi pengembalian tersimpan.');
        } catch (error) {
            fail(error.message || 'Gagal menyimpan nomor resi pengembalian.');
        }
        return;
    }

    if (formId === 'ship-form') {
        const values = new FormData(form);
        const order = state.orders.find((item) => item.id === String(values.get('orderId')));
        if (!order) { showToast('Pesanan tidak ditemukan.'); return; }
        const body = {};
        const shipDate = String(values.get('estimatedShipDate') || '').trim();
        if (shipDate) body.estimatedShipDate = shipDate;
        const tracking = String(values.get('trackingNumber') || '').trim();
        if (order.isPaidOff && tracking) {
            body.trackingNumber = tracking;
            if ((order.stage ?? 0) < 3) body.stage = 3;
        }
        if (!Object.keys(body).length) { showToast('Isi jadwal kirim atau nomor resi kirim.'); return; }
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        const ok = await updateOrder(order.id, body, body.trackingNumber ? 'Resi tersimpan. Pesanan masuk tahap Dikirim JNE.' : 'Jadwal kirim tersimpan.');
        if (ok) { state.modal = null; render(); } else if (submitButton) submitButton.disabled = false;
        return;
    }

    if (formId === 'settle-form') {
        const values = new FormData(form);
        const order = state.orders.find((item) => item.id === String(values.get('orderId')));
        const errorElement = form.querySelector('[data-settle-error]');
        const submitButton = form.querySelector('button[type="submit"]');
        const fail = (message) => {
            if (errorElement) { errorElement.textContent = message; errorElement.hidden = false; } else showToast(message);
            if (submitButton) submitButton.disabled = false;
        };
        if (!order) { fail('Pesanan tidak ditemukan.'); return; }
        if (submitButton) submitButton.disabled = true;
        if (errorElement) errorElement.hidden = true;
        try {
            const proofFile = form.elements.settleProof?.files?.[0];
            if (!proofFile) { fail('Bukti pelunasan wajib diunggah.'); return; }
            const proofImage = await imageToDataUrl(proofFile);
            const result = await api(`/orders/${encodeURIComponent(order.id)}/settle`, {
                method: 'POST',
                body: { paymentMethod: paymentMethodLabel(values.get('paymentMethod')), proofName: proofFile.name, proofImage },
            });
            const updated = result?.order || (result?.id ? result : null);
            if (updated) state.orders = state.orders.map((item) => (item.id === order.id ? updated : item));
            else await loadOrders();
            state.modal = null;
            render();
            showToast('Bukti pelunasan terkirim.');
        } catch (error) {
            fail(error.message || 'Gagal mengirim bukti pelunasan.');
        }
        return;
    }

    if (formId === 'checkout-form') {
        const values = new FormData(form);
        const { product, total } = checkoutTotals();
        const dp = Number(values.get('paymentAmount'));
        const minimum = Math.ceil(total * 0.5);
        if (dp < minimum || dp > total) { showToast(`DP harus antara ${money(minimum)} dan ${money(total)}.`); return; }
        const scheme = String(values.get('paymentScheme') || 'dp');
        if (scheme === 'full' && dp !== total) { showToast(`Bayar lunas harus sebesar ${money(total)}.`); return; }
        if (scheme === 'dp' && dp >= total) { showToast('Nominal DP harus kurang dari total. Pilih "Bayar Lunas Sekarang" untuk membayar penuh.'); return; }
        const items = cartItems(product);
        if (!items.length) { showToast('Pilih minimal satu ukuran di halaman detail kostum.'); return; }
        if (state.group.enabled && cartUnits(product) < 2) { showToast('Pesanan kelompok minimal 2 kostum. Tambah jumlah di halaman detail.'); return; }

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        try {
            const proofFile = form.elements.paymentProof?.files?.[0];
            const selfieFile = form.elements.idSelfie?.files?.[0];
            const payload = {
                productId: Number(product.id),
                items,
                isGroup: state.group.enabled,
                groupName: state.group.enabled ? String(values.get('groupName') || '').trim() : undefined,
                groupMembers: state.group.enabled ? String(values.get('groupMembers') || '').trim() : undefined,
                rulesAccepted: true,
                days: state.days,
                rentalDate: state.rentalDate,
                addons: state.addons,
                dp,
                paymentMethod: String(values.get('paymentMethod')) === 'Dompet digital' ? 'E-wallet' : String(values.get('paymentMethod')),
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
            state.group = { enabled: false, name: '', members: '' };
            state.sizeQty = {};
            state.cartProductId = null;
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
        const poster = form.elements.poster.files?.[0];
        const paymentProof = form.elements.paymentProof?.files?.[0];
        const pdf = form.elements.eventPdf?.files?.[0];
        const paid = form.dataset.tier === 'paid';
        const submitButton = form.querySelector('button[type="submit"]');
        if (paid && (form.dataset.aiDraftReady !== 'true' || state.organizerFlow?.confirmed !== true)) {
            showToast('Selesaikan konfirmasi informasi dan pratinjau melalui chatbot sebelum mengirim iklan Prabayar.');
            return;
        }
        if (submitButton) submitButton.disabled = true;
        try {
            if (!form.elements.submissionToken.value) throw new Error('Token formulir belum siap. Muat ulang halaman dan coba lagi.');
            const image = await imageToDataUrl(poster);
            const eventPdf = paid ? await fileToDataUrl(pdf, 'application/pdf', 2 * 1024 * 1024) : undefined;
            const paymentProofImage = paid ? await imageToDataUrl(paymentProof) : undefined;
            const result = await api('/events', {
                method: 'POST',
                body: {
                    submissionToken: String(values.get('submissionToken')),
                    title: String(values.get('title')).trim(),
                    date: String(values.get('date')).trim(),
                    location: String(values.get('location')).trim(),
                    theme: String(values.get('theme')).trim(),
                    description: String(values.get('description')).trim(),
                    eventInformation: String(values.get('eventInformation') || '').trim(),
                    tier: paid ? 'Prabayar' : 'Gratis',
                    image,
                    eventPdfName: pdf?.name || undefined,
                    eventPdf,
                    promotionDays: paid ? Number(values.get('promotionDays')) : undefined,
                    copywriting: String(values.get('copywriting') || ''),
                    highlightText: String(values.get('highlightText') || ''),
                    accentColor: String(values.get('accentColor') || '#f45193'),
                    themeRecommendation: String(values.get('themeRecommendation') || ''),
                    correctionRequest: String(values.get('correctionRequest') || ''),
                    organizerEmail: String(values.get('organizerEmail') || '').trim(),
                    organizerPhone: String(values.get('organizerPhone') || '').trim(),
                    paymentProofName: paymentProof?.name || undefined,
                    paymentProofImage,
                    refundBankName: String(values.get('refundBankName') || ''),
                    refundAccountNumber: String(values.get('refundAccountNumber') || ''),
                    refundAccountHolder: String(values.get('refundAccountHolder') || ''),
                    termsAccepted: values.get('termsAccepted') === 'on',
                },
            });
            writeStorage(STORAGE_KEYS.submissions, [...new Set([...mySubmissionIds(), String(result.event.id)])]);
            state.organizerToken = null;
            state.organizerTokenTier = null;
            await loadEvents();
            render();
            showToast(paid ? 'Pengajuan dan bukti pembayaran terkirim untuk diverifikasi admin.' : 'Pengajuan Gratis terkirim untuk ditinjau admin.');
        } catch (error) {
            showToast(error.message || 'Pengajuan gagal dikirim.');
            if (submitButton) submitButton.disabled = paid && state.organizerFlow?.confirmed !== true;
        }
    }

    if (formId === 'review-form') {
        const values = new FormData(form);
        const rating = Number(values.get('rating') || 0);
        const errorElement = form.querySelector('[data-review-error]');
        if (rating < 1) { errorElement.textContent = 'Pilih jumlah bintang dulu.'; errorElement.hidden = false; return; }
        const orderId = String(values.get('orderId'));
        try {
            const result = await api(`/orders/${encodeURIComponent(orderId)}/review`, { method: 'POST', body: { rating, comment: String(values.get('comment') || '').trim() } });
            state.orders = state.orders.map((order) => (order.id === orderId ? { ...order, review: result.review } : order));
            state.reviews = {};
            state.modal = null;
            await loadCatalog();
            render();
            showToast('Terima kasih! Ulasanmu tersimpan.');
        } catch (error) {
            errorElement.textContent = error.message || 'Gagal menyimpan ulasan.';
            errorElement.hidden = false;
        }
        return;
    }

    if (formId === 'reply-form') {
        const values = new FormData(form);
        try {
            const result = await api(`/reviews/${encodeURIComponent(values.get('id'))}/reply`, { method: 'PATCH', body: { reply: String(values.get('reply') || '').trim() } });
            if (state.adminReviews) state.adminReviews.reviews = state.adminReviews.reviews.map((review) => (review.id === result.review.id ? result.review : review));
            state.reviews = {};
            state.modal = null;
            render();
            showToast(result.review.reply ? 'Balasan terkirim dan tampil di halaman kostum.' : 'Balasan dihapus.');
        } catch (error) { showToast(error.message || 'Gagal menyimpan balasan.'); }
        return;
    }

    if (formId === 'stock-form') {
        const id = String(form.elements.id.value);
        const changes = [...form.querySelectorAll('[data-stock-delta]')].map((input) => ({ size: input.dataset.stockDelta, delta: Math.trunc(Number(input.value || 0)) })).filter((change) => change.delta !== 0);
        if (!changes.length) { showToast('Isi jumlah tambah atau kurang dulu.'); return; }
        try {
            for (const change of changes) await api(`/costumes/${encodeURIComponent(id)}/stock`, { method: 'PATCH', body: change });
            showToast('Stok diperbarui.');
            state.modal = null;
        } catch (error) { showToast(error.message || 'Gagal memperbarui stok.'); }
        await loadCatalog();
        render();
        return;
    }

    if (formId === 'product-form') {
        const values = new FormData(form);
        const id = String(values.get('id') || '');
        const sizeStock = {};
        form.querySelectorAll('[data-size-stock]').forEach((input) => { if (input.value !== '') sizeStock[input.dataset.sizeStock] = Math.max(0, Math.floor(Number(input.value))); });
        if (!Object.keys(sizeStock).length) { showToast('Isi stok minimal untuk satu ukuran.'); return; }
        const payload = {
            name: String(values.get('name') || '').trim(),
            series: String(values.get('series') || '').trim(),
            category: String(values.get('category') || ''),
            price: Number(values.get('price')),
            deposit: Number(values.get('deposit')),
            description: String(values.get('description') || '').trim(),
            sizeStock,
            images: state.modalImages,
        };
        try {
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
    if (!form) return;
    const values = new FormData(form);
    const value = (name) => String(values.get(name) || '').trim();
    const setText = (selector, text, fallback = '') => {
        const element = document.querySelector(selector);
        if (element) element.textContent = text || fallback;
    };
    const highlight = value('highlightText');
    const copywriting = value('copywriting');
    const eventInformation = value('eventInformation');
    setText('#preview-title', value('title'), 'Nama event');
    setText('#preview-meta', [value('date') || 'Tanggal', value('location') || 'Lokasi'].join(' · '));
    setText('#preview-description', value('description'), 'Deskripsi event akan tampil di sini.');
    setText('#preview-highlight', highlight);
    setText('#preview-theme', value('themeRecommendation') ? `Tema visual: ${value('themeRecommendation')}` : value('theme') ? `Tema event: ${value('theme')}` : '');
    setText('#preview-copywriting', copywriting);
    setText('#preview-event-information', eventInformation);
    const preview = document.querySelector('#organizer-preview');
    if (preview) preview.style.setProperty('--event-accent', /^#[0-9a-f]{6}$/i.test(value('accentColor')) ? value('accentColor') : '#f45193');
    const highlightElement = document.querySelector('#preview-highlight');
    if (highlightElement) highlightElement.hidden = !highlight;
    const informationElement = document.querySelector('#preview-event-information');
    if (informationElement) informationElement.hidden = !eventInformation;
    const copywritingElement = document.querySelector('#preview-copywriting');
    if (copywritingElement) copywritingElement.hidden = !copywriting;
};

const applyEventDraft = (draft) => {
    const form = document.querySelector('#organizer-form');
    if (!form) return;
    for (const key of ['title', 'date', 'location', 'theme', 'description', 'eventInformation', 'highlightText', 'copywriting', 'themeRecommendation', 'accentColor']) {
        if (typeof draft[key] !== 'string' || !form.elements[key]) continue;
        if (key === 'accentColor' && !/^#[0-9a-f]{6}$/i.test(draft[key])) continue;
        form.elements[key].value = draft[key];
    }
    form.dataset.aiAccentColor = form.elements.accentColor?.value || '#f45193';
    form.dataset.aiThemeRecommendation = form.elements.themeRecommendation?.value || '';
    if (form.elements.visualPreset) form.elements.visualPreset.value = 'ai';
    updateOrganizerPreview();
};

const generateEventDraft = async () => {
    const form = document.querySelector('#organizer-form');
    if (!form || form.dataset.tier !== 'paid') return;
    const poster = form.elements.poster.files?.[0];
    const pdf = form.elements.eventPdf.files?.[0];
    if (!poster || !pdf) return showToast('Pilih poster dan PDF rincian event terlebih dahulu.');
    const status = form.querySelector('#event-ai-status');
    const button = form.querySelector('[data-action="event-ai-draft"]');
    if (button) button.disabled = true;
    if (status) status.textContent = 'AI sedang membaca poster dan PDF…';
    form.dataset.aiDraftReady = 'false';
    state.organizerFlow = null;
    state.organizerChatMessages = [];
    const paidStep = form.querySelector('#paid-next-step');
    if (paidStep) paidStep.hidden = true;
    paidStep?.querySelectorAll('input, select, button').forEach((control) => { control.disabled = true; });
    const submitButton = form.querySelector('#paid-submit');
    if (submitButton) submitButton.disabled = true;
    try {
        const result = await api('/events/ai-draft', {
            method: 'POST',
            body: { poster: await imageToDataUrl(poster), pdf: await fileToDataUrl(pdf, 'application/pdf', 2 * 1024 * 1024) },
        });
        if (form.elements.poster.files?.[0] !== poster || form.elements.eventPdf.files?.[0] !== pdf) {
            throw new Error('File berubah saat AI sedang bekerja. Buat draf kembali untuk file terbaru.');
        }
        const draft = result.draft || {};
        applyEventDraft(draft);
        const eventInformationStep = { type: 'field', field: 'eventInformation', label: 'Informasi tambahan dari PDF' };
        const coreFields = [
            ['title', 'Nama event'],
            ['date', 'Tanggal dan waktu'],
            ['location', 'Lokasi'],
            ['theme', 'Tema event'],
            ['description', 'Ringkasan event'],
        ].map(([field, label]) => ({ type: 'field', field, label }));
        const followUpQuestions = Array.isArray(draft.followUpQuestions)
            ? draft.followUpQuestions.filter((question) => typeof question === 'string' && question.trim()).slice(0, 3)
            : [];
        const followUpSteps = followUpQuestions.map((question) => ({ type: 'follow-up', field: 'eventInformation', label: 'Informasi tambahan', question }));
        const fields = [...coreFields, ...(draft.eventInformation || !followUpSteps.length ? [eventInformationStep] : []), ...followUpSteps];
        state.organizerFlow = {
            stage: 'facts',
            steps: fields,
            index: 0,
            allSteps: [...coreFields, eventInformationStep],
            awaitingCorrection: null,
            editingFinal: false,
            confirmed: false,
        };
        state.organizerChatOpen = true;
        const infoStatus = draft.eventInformation
            ? 'Saya juga menemukan informasi tambahan di PDF yang tidak ada di poster.'
            : 'Saya akan cek juga apakah ada informasi tambahan penting yang perlu ditambahkan.';
        state.organizerChatMessages.push({ role: 'assistant', text: `Saya sudah membaca poster dan PDF. Saya buat ringkasan serta konsep iklan singkat, bukan menyalin isi dokumen. ${infoStatus} Mari konfirmasi satu per satu supaya tidak ada informasi yang keliru.` });
        if (status) status.textContent = 'AI selesai membaca. Ikuti konfirmasi bertahap di chatbot sebelum melihat pratinjau iklan.';
        const chatWidget = document.querySelector('.organizer-chat-widget');
        const chatPanel = chatWidget?.querySelector('.organizer-chat-panel');
        if (chatWidget) chatWidget.classList.add('is-open');
        if (chatPanel) chatPanel.hidden = false;
        advanceOrganizerConfirmation();
    } catch (error) {
        form.dataset.aiDraftReady = 'false';
        if (status) status.textContent = error.message || 'AI belum dapat membaca file. Periksa konfigurasi dan coba lagi.';
        showToast(error.message || 'AI belum dapat membaca file. Periksa konfigurasi dan coba lagi.');
    } finally {
        if (button) button.disabled = !state.eventOptions?.aiAvailable;
    }
};

const organizerChatMessage = (role, text) => {
    state.organizerChatMessages.push({ role, text });
    refreshOrganizerChat();
};

const currentOrganizerStep = () => {
    const flow = state.organizerFlow;
    return flow?.stage === 'facts' || flow?.stage === 'ad' ? flow.steps[flow.index] : null;
};

const askOrganizerFlowStep = () => {
    const flow = state.organizerFlow;
    const form = document.querySelector('#organizer-form');
    if (!flow || !form) return;
    const step = currentOrganizerStep();
    if (!step) return;

    if (step.type === 'follow-up') {
        flow.awaitingCorrection = 'eventInformation';
        organizerChatMessage('assistant', step.question);
        return;
    }
    const value = String(form.elements[step.field]?.value || '').trim();
    if (step.field === 'eventInformation' && !value) {
        organizerChatMessage('assistant', 'Saya belum menemukan informasi tambahan seperti tiket, cara mendaftar, atau syarat peserta. Apakah ada detail yang ingin ditambahkan?');
    } else if (!value) {
        flow.awaitingCorrection = step.field;
        organizerChatMessage('assistant', `Informasi ${step.label.toLowerCase()} belum terbaca jelas. Tuliskan informasi yang benar agar bisa masuk ke iklan.`);
    } else {
        organizerChatMessage('assistant', `Konfirmasi ${step.label.toLowerCase()}: “${value}”. Apakah sudah benar?`);
    }
};

const generateConfirmedAdCopy = async () => {
    const flow = state.organizerFlow;
    const form = document.querySelector('#organizer-form');
    if (!flow || !form) return;
    flow.stage = 'copywriting';
    refreshOrganizerChat();
    organizerChatMessage('assistant', 'Terima kasih, informasi event sudah dikonfirmasi. Saya susun naskah promosi singkat dari fakta yang sudah disetujui…');
    const values = new FormData(form);
    try {
        const payload = Object.fromEntries(['title', 'date', 'location', 'theme', 'description', 'eventInformation'].map((key) => [key, values.get(key) || '']));
        const { draft } = await api('/events/recommendations', { method: 'POST', body: payload });
        applyEventDraft(draft || {});
        flow.steps = [
            { type: 'field', field: 'highlightText', label: 'Highlight iklan' },
            { type: 'field', field: 'copywriting', label: 'Naskah copywriter' },
            { type: 'field', field: 'themeRecommendation', label: 'Tema visual' },
        ];
        flow.allSteps = [...flow.allSteps.filter((step) => step.type === 'field'), ...flow.steps];
        flow.index = 0;
        flow.stage = 'ad';
        askOrganizerFlowStep();
    } catch (error) {
        flow.stage = 'copywriting-error';
        organizerChatMessage('assistant', `${error.message || 'AI belum berhasil menyusun naskah promosi.'} Coba ulangi proses naskah. Isi PDF tidak akan disalin begitu saja.`);
        refreshOrganizerChat();
    }
};

const advanceOrganizerConfirmation = () => {
    const flow = state.organizerFlow;
    if (!flow) return;
    if (flow.index < flow.steps.length) {
        askOrganizerFlowStep();
        return;
    }
    if (flow.stage === 'facts') {
        generateConfirmedAdCopy();
        return;
    }
    if (flow.stage === 'ad') {
        flow.stage = 'final';
        organizerChatMessage('assistant', 'Informasi dan copywriting sudah dikonfirmasi. Silakan lihat pratinjau poster penuh di halaman. Jika sudah sesuai, pilih “Setuju, lanjut pembayaran”.');
        refreshOrganizerChat();
    }
};

const handleOrganizerFlowChoice = (answer) => {
    const flow = state.organizerFlow;
    const step = currentOrganizerStep();
    if (!flow) return;
    if (answer === 'final-yes' && flow.stage === 'final') {
        flow.confirmed = true;
        flow.stage = 'confirmed';
        const form = document.querySelector('#organizer-form');
        form.dataset.aiDraftReady = 'true';
        const nextStep = form.querySelector('#paid-next-step');
        if (nextStep) {
            nextStep.hidden = false;
            nextStep.querySelectorAll('input, select, button').forEach((control) => { control.disabled = false; });
        }
        const submitButton = form.querySelector('#paid-submit');
        if (submitButton) submitButton.disabled = false;
        const status = form.querySelector('#event-ai-status');
        if (status) status.textContent = 'Materi iklan sudah dikonfirmasi. Pilih durasi, lengkapi data pembayaran, lalu kirim ke admin.';
        organizerChatMessage('user', 'Setuju, lanjut pembayaran.');
        organizerChatMessage('assistant', 'Pratinjau disetujui. Sekarang pilih durasi dan lengkapi data pembayaran di bawah poster.');
        refreshOrganizerChat();
        nextStep?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
    if (answer === 'final-edit' && flow.stage === 'final') {
        flow.stage = 'revision';
        organizerChatMessage('user', 'Saya ingin merevisi.');
        organizerChatMessage('assistant', 'Pilih bagian yang ingin diubah, lalu tuliskan versi yang benar.');
        refreshOrganizerChat();
        return;
    }
    if (answer === 'yes' && step) {
        organizerChatMessage('user', 'Ya, benar.');
        flow.index += 1;
        advanceOrganizerConfirmation();
        return;
    }
    if (answer === 'skip' && step) {
        flow.awaitingCorrection = null;
        if (step.type === 'follow-up') {
            organizerChatMessage('user', 'Belum ada informasi tambahan.');
        } else {
            document.querySelector('#organizer-form').elements[step.field].value = '';
            updateOrganizerPreview();
            organizerChatMessage('user', 'Tidak ada informasi tambahan.');
        }
        flow.index += 1;
        advanceOrganizerConfirmation();
        return;
    }
    if ((answer === 'no' || answer === 'add') && step) {
        flow.awaitingCorrection = step.field;
        organizerChatMessage('user', answer === 'add' ? 'Saya ingin menambahkan informasi.' : 'Saya ingin mengubah informasi.');
        organizerChatMessage('assistant', `Tuliskan ${step.label.toLowerCase()} yang ingin ditampilkan di iklan.`);
        refreshOrganizerChat();
    }
};

const requestOrganizerFieldCorrection = (field) => {
    const flow = state.organizerFlow;
    const step = flow?.allSteps?.find((item) => item.field === field);
    if (!flow || !step) return;
    flow.awaitingCorrection = field;
    flow.editingFinal = true;
    flow.stage = 'revision';
    organizerChatMessage('assistant', `Tuliskan ${step.label.toLowerCase()} yang benar.`);
    refreshOrganizerChat();
};

const refreshOrganizerChat = () => {
    const target = document.querySelector('#organizer-chat-messages');
    if (target) {
        target.innerHTML = state.organizerChatMessages.map(({ role, text }) => `<div class="chat-message ${role === 'assistant' ? 'bot' : 'user'}"><p>${escapeHtml(text)}</p></div>`).join('');
        target.scrollTop = target.scrollHeight;
    }

    const controls = document.querySelector('#organizer-flow-actions');
    if (!controls) return;
    const flow = state.organizerFlow;
    const step = currentOrganizerStep();
    if (flow?.awaitingCorrection) controls.innerHTML = step?.type === 'follow-up'
        ? '<button class="button button-quiet button-small" type="button" data-action="organizer-flow-skip">Belum ada / lewati</button>'
        : '';
    else if (flow?.stage === 'final') controls.innerHTML = '<button class="button button-primary button-small" type="button" data-action="organizer-flow-confirm" data-answer="final-yes">Setuju, lanjut pembayaran</button><button class="button button-secondary button-small" type="button" data-action="organizer-flow-confirm" data-answer="final-edit">Perlu revisi</button>';
    else if (flow?.stage === 'revision') controls.innerHTML = (flow.allSteps || flow.steps).filter((step) => step.type === 'field').map(({ field, label }) => `<button class="chip-button" type="button" data-action="organizer-flow-edit" data-field="${escapeHtml(field)}">${escapeHtml(label)}</button>`).join('');
    else if (flow?.stage === 'copywriting-error') controls.innerHTML = '<button class="button button-secondary button-small" type="button" data-action="organizer-flow-retry">Coba susun naskah lagi</button>';
    else if (step?.type === 'follow-up') controls.innerHTML = '<button class="button button-quiet button-small" type="button" data-action="organizer-flow-skip">Belum ada / lewati</button>';
    else if (step?.field === 'eventInformation' && !document.querySelector('#organizer-form')?.elements.eventInformation.value.trim()) controls.innerHTML = '<button class="button button-secondary button-small" type="button" data-action="organizer-flow-confirm" data-answer="add">Tambahkan informasi</button><button class="button button-quiet button-small" type="button" data-action="organizer-flow-skip">Tidak ada tambahan</button>';
    else if (step && document.querySelector('#organizer-form')?.elements[step.field]?.value.trim()) controls.innerHTML = '<button class="button button-primary button-small" type="button" data-action="organizer-flow-confirm" data-answer="yes">Ya, benar</button><button class="button button-secondary button-small" type="button" data-action="organizer-flow-confirm" data-answer="no">Ubah</button>';
    else if (step?.field === 'highlightText') controls.innerHTML = '<button class="button button-quiet button-small" type="button" data-action="organizer-flow-skip">Tanpa highlight</button>';
    else controls.innerHTML = '';
};

const askEventConsultant = async (form) => {
    const message = String(new FormData(form).get('message') || '').trim();
    const eventForm = document.querySelector('#organizer-form');
    if (!message || !eventForm) return;
    const flow = state.organizerFlow;
    const step = currentOrganizerStep();
    const field = flow?.awaitingCorrection || (step && flow.stage === 'facts' ? step.field : null);
    organizerChatMessage('user', message);
    form.reset();

    if (field) {
        const input = eventForm.elements[field];
        const isNoInfo = field === 'eventInformation' && /^(tidak ada|belum ada|hapus|kosong)$/i.test(message);
        if (isNoInfo) {
            input.value = '';
        } else if (step?.type === 'follow-up' || (field === 'eventInformation' && !input.value.trim())) {
            input.value = [input.value.trim(), message].filter(Boolean).join('\n• ').slice(0, 1200);
        } else {
            input.value = message;
        }
        updateOrganizerPreview();
        flow.awaitingCorrection = null;
        if (flow.editingFinal) {
            flow.editingFinal = false;
            if (['title', 'date', 'location', 'theme', 'description', 'eventInformation'].includes(field)) {
                flow.index = flow.steps.length;
                await generateConfirmedAdCopy();
                return;
            }
            flow.stage = 'final';
            organizerChatMessage('assistant', 'Perubahan sudah diterapkan ke pratinjau. Apakah versi terbaru ini sudah sesuai?');
            refreshOrganizerChat();
        } else {
            flow.index += 1;
            advanceOrganizerConfirmation();
        }
        return;
    }

    const values = new FormData(eventForm);
    try {
        const payload = {
            message,
            event: Object.fromEntries(['title', 'date', 'location', 'theme', 'description', 'eventInformation'].map((key) => [key, values.get(key) || ''])),
        };
        const result = await api('/events/consult', { method: 'POST', body: payload });
        organizerChatMessage('assistant', result.reply);
    } catch (error) {
        organizerChatMessage('assistant', error.message || 'Konsultan AI belum dapat menjawab.');
    }
};

document.addEventListener('error', (event) => {
    const img = event.target;
    if (img?.tagName !== 'IMG' || String(img.src).startsWith('data:')) return;
    const stage = img.dataset.fallback || '0';
    if (stage === '0') {
        // Tahap 1: foto kostum lokal yang cocok dengan nama (alt), jika tidak ada langsung ke placeholder SVG.
        img.dataset.fallback = '1';
        img.src = localCharacterImage(img.alt) || FALLBACK_IMG;
    } else if (stage === '1') {
        img.dataset.fallback = '2';
        img.src = FALLBACK_IMG;
    }
}, true);

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
if (initialPage && ['home', 'catalog', 'detail', 'rules', 'howto', 'checkout', 'orders', 'tracking', 'login', 'register', 'events', 'event', 'organizer', 'account', 'admin'].includes(initialPage)) {
    state.page = initialPage;
    state.param = initialParam ? decodeURIComponent(initialParam) : null;
    if (initialPage === 'admin' && initialParam && adminMenu.some(([section]) => section === initialParam)) state.adminSection = initialParam;
}

if (state.session?.role === 'admin' && !initialPage) { state.page = 'admin'; state.param = state.adminSection; history.replaceState({ page: 'admin', param: state.adminSection }, '', `#admin/${state.adminSection}`); }
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
