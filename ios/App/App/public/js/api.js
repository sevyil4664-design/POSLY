// ═══════════════════════════════════════════════════════
// POSLY iOS — API Client
// ═══════════════════════════════════════════════════════

const API_BASE = 'https://cloudposly.com/api';
const SOCKET_URL = 'https://cloudposly.com';

// ─── Token Management ───
function getToken() {
    return localStorage.getItem('posly_ios_token');
}

function setToken(token) {
    localStorage.setItem('posly_ios_token', token);
}

function clearToken() {
    localStorage.removeItem('posly_ios_token');
    localStorage.removeItem('posly_ios_restaurant');
    localStorage.removeItem('posly_ios_user');
}

function getStoredUser() {
    try { return JSON.parse(localStorage.getItem('posly_ios_user') || 'null'); } catch { return null; }
}

function setStoredUser(user) {
    localStorage.setItem('posly_ios_user', JSON.stringify(user));
}

function getStoredRestaurant() {
    try { return JSON.parse(localStorage.getItem('posly_ios_restaurant') || 'null'); } catch { return null; }
}

function setStoredRestaurant(restaurant) {
    localStorage.setItem('posly_ios_restaurant', JSON.stringify(restaurant));
}

function getRestaurantId() {
    const r = getStoredRestaurant();
    return r ? r.id : '';
}

function authHeaders() {
    const token = getToken();
    return token
        ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
}

// ─── Generic Fetch ───
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: authHeaders(),
        ...options,
    };
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }
    const res = await fetch(url, config);
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Bir hata oluştu.');
        return json;
    }
    if (!res.ok) throw new Error('Sunucu hatası');
    return {};
}

// ═══ AUTH API ═══

async function apiLogin(email, password) {
    const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Giriş başarısız.');
    setToken(json.token);
    setStoredRestaurant(json.restaurant);
    if (json.user) setStoredUser(json.user);
    return json;
}

async function apiMe() {
    const json = await apiFetch('/me');
    setStoredRestaurant(json.restaurant);
    if (json.user) setStoredUser(json.user);
    return json;
}

async function apiForgotPassword(email) {
    return apiFetch('/forgot-password', {
        method: 'POST',
        body: { email },
    });
}

// ═══ DATA API ═══

async function apiGetOrders() {
    const rid = getRestaurantId();
    if (!rid) return [];
    try {
        return await apiFetch(`/orders/${rid}`);
    } catch { return []; }
}

async function apiSaveOrder(order) {
    const rid = getRestaurantId();
    return apiFetch(`/orders/${rid}`, {
        method: 'POST',
        body: order,
    });
}

async function apiGetSettings() {
    const rid = getRestaurantId();
    if (!rid) return {};
    try {
        return await apiFetch(`/settings/${rid}`);
    } catch { return {}; }
}

async function apiSaveSettings(settings) {
    const rid = getRestaurantId();
    return apiFetch(`/settings/${rid}`, {
        method: 'PUT',
        body: settings,
    });
}

async function apiGetUsers() {
    const rid = getRestaurantId();
    if (!rid) return [];
    try {
        return await apiFetch(`/users/${rid}`);
    } catch { return []; }
}

async function apiAddUser(user) {
    const rid = getRestaurantId();
    return apiFetch(`/users/${rid}`, {
        method: 'POST',
        body: user,
    });
}

// ═══ REPORTS API ═══

async function apiSendZReport() {
    const rid = getRestaurantId();
    return apiFetch(`/reports/send-zreport/${rid}`, { method: 'POST' });
}

// ═══ SUPPORT API ═══

async function apiCreateTicket(data) {
    return apiFetch('/support/ticket', {
        method: 'POST',
        body: data,
    });
}

async function apiGetTickets() {
    const rid = getRestaurantId();
    if (!rid) return { content: [] };
    try {
        return await apiFetch(`/support/tickets/${rid}`);
    } catch { return { content: [] }; }
}

async function apiReplyTicket(ticketId, message) {
    const user = getStoredUser();
    return apiFetch(`/support/ticket/${ticketId}/reply`, {
        method: 'POST',
        body: {
            replyMessage: message,
            agentName: user ? `${user.firstName} ${user.lastName}` : 'Kullanıcı',
            isUser: true,
        },
    });
}

// ═══ PLATFORM STATUS API ═══

async function apiGetPlatformStatus(platform) {
    const rid = getRestaurantId();
    if (!rid) return { status: 'kapali' };
    try {
        const res = await fetch(`${API_BASE}/${platform}/status/${rid}`, { headers: authHeaders() });
        if (!res.ok) return { status: 'kapali' };
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) return res.json();
        return { status: 'kapali' };
    } catch { return { status: 'kapali' }; }
}

async function apiUpdatePlatformStatus(platform, status) {
    const rid = getRestaurantId();
    try {
        const res = await fetch(`${API_BASE}/${platform}/status/${rid}`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ status }),
        });
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) return res.json();
        return { success: true, status };
    } catch {
        return { success: true, status };
    }
}

async function apiUpdatePlatformOrderStatus(orderId, source, newStatus) {
    const rid = getRestaurantId();
    const platformMap = {
        trendyol: 'trendyol',
        getir: 'getir',
        yemeksepeti: 'yemeksepeti',
        tiklagelsin: 'tiklagelsin',
        migros: 'migros',
    };
    const key = platformMap[source];
    if (!key) return { success: true };
    try {
        const res = await fetch(`${API_BASE}/${key}/update-order-status/${rid}`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ orderId, status: newStatus }),
        });
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) return res.json();
        return { success: false };
    } catch {
        return { success: false };
    }
}
