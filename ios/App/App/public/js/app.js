// ═══════════════════════════════════════════════════════
// POSLY iOS — Main App Controller
// ═══════════════════════════════════════════════════════

let socket = null;
let currentPage = 'dashboard';
let notifications = [];

// ─── App Init ───
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Show splash
    document.getElementById('splash-screen').classList.add('active');

    // Check existing token
    const token = getToken();
    if (token) {
        try {
            await apiMe();
            // Auto login success
            setTimeout(() => {
                hideSplash();
                showAppShell();
            }, 1000);
            return;
        } catch {
            // Token expired
            clearToken();
        }
    }

    // Show login
    setTimeout(() => {
        hideSplash();
        showPage('page-login');
        initLoginPage();
    }, 1200);
}

function hideSplash() {
    const splash = document.getElementById('splash-screen');
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.4s';
    splash.style.pointerEvents = 'none';
    setTimeout(() => {
        splash.classList.remove('active');
        splash.style.display = 'none';
    }, 400);
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// ─── Login Success Handler ───
function onLoginSuccess(result) {
    showAppShell();
}

function showAppShell() {
    showPage('app-shell');

    // Init dashboard
    initDashboard();

    // Connect Socket.IO
    connectSocket();

    // Set nav title
    updateNavTitle('dashboard');
}

// ─── Navigation ───
function navigateTo(page) {
    if (currentPage === page) return;
    currentPage = page;

    // Update sections
    document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active');
        s.style.opacity = '0';
        s.style.transform = 'translateY(8px)';
    });

    const section = document.getElementById(`section-${page}`);
    if (section) {
        setTimeout(() => {
            section.classList.add('active');
            setTimeout(() => {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, 10);
        }, 50);
    }

    // Update tab bar
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.tab-item[data-tab="${page}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Update nav title
    updateNavTitle(page);

    // Init page data
    switch (page) {
        case 'dashboard': initDashboard(); break;
        case 'orders': initOrdersPage(); break;
        case 'reports': initReportsPage(); break;
        case 'staff': initStaffPage(); break;
        case 'support': initSupportPage(); break;
    }
}

function updateNavTitle(page) {
    const titles = {
        dashboard: 'Panel',
        orders: 'Siparişler',
        reports: 'Raporlar',
        staff: 'Personel',
        support: 'Destek',
    };
    document.getElementById('nav-title').textContent = titles[page] || 'Posly';
}

// ─── Modal Controls ───
function openModal() {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('modal-sheet').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.getElementById('modal-sheet').classList.remove('active');
}

// ─── Toast ───
let toastTimeout = null;
function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');

    if (toastTimeout) clearTimeout(toastTimeout);

    msgEl.textContent = message;
    toast.className = 'toast show ' + type;

    toastTimeout = setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ─── Socket.IO ───
function connectSocket() {
    if (socket) socket.disconnect();

    try {
        socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
        });

        // New order events
        socket.on('qr_order', (data) => {
            const rid = getRestaurantId();
            if (data.restaurantId === rid) {
                addNotification('Yeni QR Sipariş', `#${data.order?.id} - ${formatCurrency(data.order?.total || 0)}`, 'order');
                if (currentPage === 'orders') loadOrders();
                if (currentPage === 'dashboard') loadDashboardOrders();
            }
        });

        // Trendyol, Getir, Yemeksepeti new orders
        const platformEvents = ['trendyol_new_order', 'yemeksepeti_new_order', 'getir_new_order', 'tiklagelsin_new_order', 'migros_new_order'];
        platformEvents.forEach(evt => {
            socket.on(evt, (data) => {
                const rid = getRestaurantId();
                if (data.restaurantId === rid) {
                    const platformName = evt.split('_')[0].charAt(0).toUpperCase() + evt.split('_')[0].slice(1);
                    addNotification(`Yeni ${platformName} Siparişi`, `Yeni sipariş geldi!`, 'order');
                    if (currentPage === 'orders') loadOrders();
                    if (currentPage === 'dashboard') loadDashboardOrders();
                }
            });
        });

        // Force update
        socket.on('force_update', () => {
            if (currentPage === 'dashboard') initDashboard();
            if (currentPage === 'orders') loadOrders();
        });

        // Waiter call
        socket.on('waiter_call', (data) => {
            const rid = getRestaurantId();
            if (data.restaurantId === rid) {
                addNotification('Garson Çağrısı', `Masa ${data.tableNumber} - ${data.customerName}`, 'waiter');
            }
        });

    } catch (err) {
        console.error('[Socket] Connection error:', err);
    }
}

// ─── Notifications ───
function addNotification(title, body, type = 'info') {
    const notif = {
        id: Date.now(),
        title,
        body,
        type,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    notifications.unshift(notif);
    if (notifications.length > 50) notifications.pop();

    // Update badge
    const badge = document.getElementById('notification-count');
    badge.style.display = 'flex';
    badge.textContent = notifications.length;

    // Try native notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, tag: notif.id.toString() });
    }

    // Show toast
    showToast(`🔔 ${title}: ${body}`, 'success');
}

function showNotifications() {
    const container = document.getElementById('notifications-list');

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state small">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <p>Bildirim bulunmuyor</p>
            </div>`;
    } else {
        const iconColors = {
            order: { bg: 'var(--accent-bg)', color: 'var(--accent)' },
            waiter: { bg: 'var(--yellow-bg)', color: 'var(--yellow)' },
            info: { bg: 'var(--blue-bg)', color: 'var(--blue)' },
        };

        container.innerHTML = notifications.slice(0, 20).map(n => {
            const ic = iconColors[n.type] || iconColors.info;
            return `
                <div class="notif-item">
                    <div class="notif-icon" style="background:${ic.bg};color:${ic.color}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${n.type === 'order' ? '<path d="M9 5h6l3 4v10a2 2 0 01-2 2H8a2 2 0 01-2-2V9l3-4z"/>' :
                    n.type === 'waiter' ? '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>' :
                        '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
                        </svg>
                    </div>
                    <div class="notif-text">
                        <p>${n.title}</p>
                        <small>${n.body} • ${n.time}</small>
                    </div>
                </div>`;
        }).join('');
    }

    document.getElementById('notif-overlay').classList.add('active');
    document.getElementById('notif-sheet').classList.add('active');

    // Clear badge
    document.getElementById('notification-count').style.display = 'none';
}

function closeNotifications() {
    document.getElementById('notif-overlay').classList.remove('active');
    document.getElementById('notif-sheet').classList.remove('active');
}

// ─── Request Notification Permission ───
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Request permission after first interaction
document.addEventListener('click', () => {
    requestNotificationPermission();
}, { once: true });

// ─── Logout ───
function logout() {
    clearToken();
    if (socket) socket.disconnect();
    location.reload();
}

// ─── Auto Refresh ───
setInterval(() => {
    if (getToken()) {
        if (currentPage === 'dashboard') {
            loadDashboardOrders();
        }
    }
}, 60000); // Every 60 seconds
