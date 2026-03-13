// ═══════════════════════════════════════════════════════
// POSLY iOS — Dashboard Page
// ═══════════════════════════════════════════════════════

let dashboardData = {
    orders: [],
    settings: {},
};

async function initDashboard() {
    const user = getStoredUser();
    const restaurant = getStoredRestaurant();

    // Welcome
    if (user) {
        document.getElementById('welcome-greeting').textContent = `Merhaba, ${user.firstName} 👋`;
    }
    if (restaurant) {
        document.getElementById('welcome-restaurant').textContent = restaurant.name || 'Restoran';
    }

    // Load data in parallel
    await Promise.all([
        loadDashboardOrders(),
        loadPlatformStatuses(),
        loadRestaurantStatus(),
    ]);
}

async function loadDashboardOrders() {
    try {
        const orders = await apiGetOrders();
        dashboardData.orders = orders || [];
        updateRevenueCard(orders);
        updateOrdersBadge(orders);
    } catch (err) {
        console.error('Dashboard orders error:', err);
    }
}

function updateRevenueCard(orders) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = (orders || []).filter(o => {
        const d = new Date(o.createdAt || o.date);
        return d >= today && o.status !== 'İptal';
    });

    let totalCash = 0, totalCC = 0, totalOnline = 0;

    todayOrders.forEach(o => {
        const pm = o.paymentMethod || '';
        const src = (o.source || '').toLowerCase();
        const total = o.total || 0;

        if (src.includes('getir') || src.includes('yemeksepeti') || src.includes('trendyol') || src.includes('migros') || src.includes('online')) {
            totalOnline += total;
        } else if (pm === 'Nakit') {
            totalCash += total;
        } else if (pm === 'Kredi Kartı' || pm === 'EFT/POS') {
            totalCC += total;
        } else {
            totalCash += total;
        }
    });

    const grandTotal = totalCash + totalCC + totalOnline;

    document.getElementById('revenue-total').textContent = formatCurrency(grandTotal);
    document.getElementById('revenue-cash').textContent = formatCurrency(totalCash);
    document.getElementById('revenue-card').textContent = formatCurrency(totalCC);
    document.getElementById('revenue-count').textContent = todayOrders.length.toString();
}

function updateOrdersBadge(orders) {
    const activeCount = (orders || []).filter(o =>
        o.status === 'Bekliyor' || o.status === 'Hazırlanıyor' || o.status === 'Yeni'
    ).length;

    const badge = document.getElementById('orders-badge');
    if (activeCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = activeCount;
    } else {
        badge.style.display = 'none';
    }
}

async function loadPlatformStatuses() {
    const platforms = ['yemeksepeti', 'getir', 'trendyol', 'migros'];

    for (const p of platforms) {
        try {
            const result = await apiGetPlatformStatus(p);
            const toggle = document.getElementById(`toggle-${p}`);
            if (toggle) {
                toggle.checked = result.status === 'acik';
            }
        } catch (err) {
            console.error(`Platform ${p} status error:`, err);
        }
    }
}

async function loadRestaurantStatus() {
    try {
        const settings = await apiGetSettings();
        dashboardData.settings = settings;
        const isOpen = settings.isOpen !== false;
        updateRestaurantStatusUI(isOpen);
    } catch (err) {
        console.error('Restaurant status error:', err);
    }
}

function updateRestaurantStatusUI(isOpen) {
    const badge = document.getElementById('restaurant-status-badge');
    const text = badge.querySelector('.status-text');

    if (isOpen) {
        badge.classList.remove('closed');
        text.textContent = 'Açık';
    } else {
        badge.classList.add('closed');
        text.textContent = 'Kapalı';
    }
}

async function toggleRestaurantStatus() {
    const settings = dashboardData.settings || {};
    const newIsOpen = settings.isOpen === false ? true : false;
    settings.isOpen = newIsOpen;

    updateRestaurantStatusUI(newIsOpen);

    try {
        await apiSaveSettings(settings);
        dashboardData.settings = settings;
        showToast(newIsOpen ? 'Restoran açık olarak güncellendi ✅' : 'Restoran kapalı olarak güncellendi 🔴',
            newIsOpen ? 'success' : '');
    } catch (err) {
        showToast('Durum güncellenemedi: ' + err.message, 'error');
        // Revert
        settings.isOpen = !newIsOpen;
        updateRestaurantStatusUI(!newIsOpen);
    }
}

async function togglePlatform(platform, checked) {
    const status = checked ? 'acik' : 'kapali';
    try {
        await apiUpdatePlatformStatus(platform, status);
        showToast(`${platform.charAt(0).toUpperCase() + platform.slice(1)} ${checked ? 'açıldı' : 'kapatıldı'}`, 'success');
    } catch (err) {
        showToast('Platform durumu güncellenemedi', 'error');
        // Revert toggle
        const toggle = document.getElementById(`toggle-${platform}`);
        if (toggle) toggle.checked = !checked;
    }
}

// Helper
function formatCurrency(amount) {
    return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}
