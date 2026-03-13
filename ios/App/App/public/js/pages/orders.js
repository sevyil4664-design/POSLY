// ═══════════════════════════════════════════════════════
// POSLY iOS — Orders Page
// ═══════════════════════════════════════════════════════

let allOrders = [];
let currentOrderFilter = 'active';
let currentPlatformFilter = 'all';

async function initOrdersPage() {
    await loadOrders();
}

async function loadOrders() {
    try {
        allOrders = await apiGetOrders();
        renderOrders();
    } catch (err) {
        console.error('Load orders error:', err);
    }
}

function filterOrders(type) {
    currentOrderFilter = type;

    // Update segment buttons
    document.querySelectorAll('#order-segments .segment-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Show/hide platform filter
    document.getElementById('platform-filter').style.display = type === 'platform' ? 'flex' : 'none';

    renderOrders();
}

function filterByPlatform(platform) {
    currentPlatformFilter = platform;

    document.querySelectorAll('#platform-filter .filter-chip').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    renderOrders();
}

function renderOrders() {
    const listEl = document.getElementById('orders-list');
    let filtered = [...allOrders];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (currentOrderFilter === 'active') {
        filtered = filtered.filter(o =>
            o.status === 'Bekliyor' || o.status === 'Hazırlanıyor' || o.status === 'Yeni' ||
            o.status === 'Onaylandı' || o.status === 'Kuryede'
        );
    } else if (currentOrderFilter === 'platform') {
        filtered = filtered.filter(o => {
            const src = (o.source || '').toLowerCase();
            return src.includes('getir') || src.includes('yemeksepeti') || src.includes('trendyol') ||
                src.includes('tiklagelsin') || src.includes('migros');
        });

        if (currentPlatformFilter !== 'all') {
            filtered = filtered.filter(o =>
                (o.source || '').toLowerCase().includes(currentPlatformFilter)
            );
        }
    } else {
        // history
        filtered = filtered.filter(o =>
            o.status === 'Teslim Edildi' || o.status === 'Tamamlandı' || o.status === 'İptal'
        );
    }

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                    <path d="M9 5h6l3 4v10a2 2 0 01-2 2H8a2 2 0 01-2-2V9l3-4z"/>
                    <line x1="9" y1="5" x2="15" y2="5"/>
                </svg>
                <p>${currentOrderFilter === 'active' ? 'Aktif sipariş bulunmuyor' :
                currentOrderFilter === 'platform' ? 'Platform siparişi bulunmuyor' :
                    'Geçmiş sipariş bulunmuyor'}</p>
            </div>`;
        return;
    }

    // Sort by date desc
    filtered.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    listEl.innerHTML = filtered.map(order => {
        const source = (order.source || '').toLowerCase();
        let sourceColor = '#2DB55D';
        let sourceText = 'POS';

        if (source.includes('yemeksepeti')) { sourceColor = '#D42127'; sourceText = 'YS'; }
        else if (source.includes('getir')) { sourceColor = '#5D3EBC'; sourceText = 'GY'; }
        else if (source.includes('trendyol')) { sourceColor = '#F27A1A'; sourceText = 'TY'; }
        else if (source.includes('migros')) { sourceColor = '#F58220'; sourceText = 'MY'; }
        else if (source.includes('tiklagelsin')) { sourceColor = '#FF0060'; sourceText = 'TG'; }
        else if (source.includes('qr')) { sourceColor = '#3b82f6'; sourceText = 'QR'; }

        const statusClass = getStatusClass(order.status);
        const time = formatOrderTime(order.createdAt || order.date);
        const customer = order.customerName || order.customer?.name || '';
        const displayId = (order.id || '').toString().slice(-6);

        return `
            <div class="order-card" onclick="showOrderDetail('${order.id}')">
                <div class="order-source-icon" style="background:${sourceColor}">${sourceText}</div>
                <div class="order-info">
                    <div class="order-id">#${displayId}${customer ? ` • ${customer}` : ''}</div>
                    <div class="order-meta">
                        <span>${time}</span>
                        <span>•</span>
                        <span>${order.items ? order.items.length + ' ürün' : ''}</span>
                    </div>
                </div>
                <div class="order-right">
                    <div class="order-total">${formatCurrency(order.total || 0)}</div>
                    <span class="order-status ${statusClass}">${order.status || 'Bekliyor'}</span>
                </div>
            </div>`;
    }).join('');
}

function showOrderDetail(orderId) {
    const order = allOrders.find(o => o.id === orderId || o.id === parseInt(orderId));
    if (!order) return;

    const modalContent = document.getElementById('modal-content');
    const items = order.items || [];
    const customer = order.customerName || order.customer?.name || 'Müşteri';
    const source = order.source || 'Lokal';
    const time = formatOrderTime(order.createdAt || order.date);

    modalContent.innerHTML = `
        <div class="order-detail-header">
            <h3 style="font-size:18px;font-weight:800;margin-bottom:4px">#${(order.id || '').toString().slice(-6)}</h3>
            <p style="color:var(--text-secondary);font-size:13px">${customer} • ${source} • ${time}</p>
            <span class="order-status ${getStatusClass(order.status)}" style="margin-top:8px">${order.status || 'Bekliyor'}</span>
        </div>

        <h4 style="font-size:14px;font-weight:700;margin-bottom:10px">Sipariş Detayı</h4>
        <div class="order-detail-items">
            ${items.map(item => `
                <div class="order-detail-item">
                    <div>
                        <div class="item-name">${item.name || item.productName || 'Ürün'}</div>
                        <div class="item-qty">x${item.qty || item.quantity || 1}</div>
                    </div>
                    <div class="item-price">${formatCurrency((item.price || 0) * (item.qty || item.quantity || 1))}</div>
                </div>
            `).join('')}
        </div>

        <div class="order-detail-total">
            <span>Toplam</span>
            <strong>${formatCurrency(order.total || 0)}</strong>
        </div>

        ${order.status !== 'Teslim Edildi' && order.status !== 'Tamamlandı' && order.status !== 'İptal' ? `
        <div class="order-status-btns">
            <button class="btn-status ${order.status === 'Hazırlanıyor' ? 'active' : ''}" onclick="updateOrderStatus('${order.id}', 'Hazırlanıyor')">
                🔥 Hazırlanıyor
            </button>
            <button class="btn-status ${order.status === 'Kuryede' ? 'active' : ''}" onclick="updateOrderStatus('${order.id}', 'Kuryede')">
                🛵 Kuryede
            </button>
            <button class="btn-status" onclick="updateOrderStatus('${order.id}', 'Teslim Edildi')">
                ✅ Teslim
            </button>
        </div>` : ''}

        ${order.paymentMethod ? `<p style="text-align:center;margin-top:14px;font-size:13px;color:var(--text-secondary)">Ödeme: ${order.paymentMethod}</p>` : ''}
    `;

    openModal();
}

async function updateOrderStatus(orderId, newStatus) {
    const order = allOrders.find(o => o.id === orderId || o.id === parseInt(orderId));
    if (!order) return;

    order.status = newStatus;

    try {
        await apiSaveOrder(order);

        // Also sync to platform if applicable
        const source = (order.source || '').toLowerCase();
        if (source.includes('trendyol') || source.includes('getir') || source.includes('yemeksepeti')) {
            const platformKey = source.includes('trendyol') ? 'trendyol' :
                source.includes('getir') ? 'getir' : 'yemeksepeti';
            await apiUpdatePlatformOrderStatus(order.id, platformKey, newStatus);
        }

        showToast(`Sipariş durumu: ${newStatus}`, 'success');
        renderOrders();
        closeModal();
        updateOrdersBadge(allOrders);
    } catch (err) {
        showToast('Durum güncellenemedi: ' + err.message, 'error');
    }
}

// Helpers
function getStatusClass(status) {
    const map = {
        'Bekliyor': 'status-bekliyor',
        'Yeni': 'status-bekliyor',
        'Onaylandı': 'status-bekliyor',
        'Hazırlanıyor': 'status-hazirlaniyor',
        'Kuryede': 'status-kuryede',
        'Teslim Edildi': 'status-teslim',
        'Tamamlandı': 'status-tamamlandi',
        'İptal': 'status-iptal',
    };
    return map[status] || 'status-bekliyor';
}

function formatOrderTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;

    const date = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    return `${date} ${time}`;
}
