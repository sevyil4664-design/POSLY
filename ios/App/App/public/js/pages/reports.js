// ═══════════════════════════════════════════════════════
// POSLY iOS — Reports Page
// ═══════════════════════════════════════════════════════

async function initReportsPage() {
    // Set default date range (today)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('report-date-start').value = today;
    document.getElementById('report-date-end').value = today;

    await loadReports();
}

async function loadReports() {
    try {
        const orders = await apiGetOrders();
        calculateReportData(orders);
    } catch (err) {
        console.error('Reports load error:', err);
    }
}

function calculateReportData(orders) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayOrders = (orders || []).filter(o => {
        const d = new Date(o.createdAt || o.date);
        return d >= today && d <= todayEnd;
    });

    let totalCash = 0, totalCC = 0, totalOnline = 0, totalMeal = 0, totalCancelled = 0;
    const productCounts = {};
    const hourlyCounts = new Array(24).fill(0);

    const mealCardTypes = ['Yemek Kartı', 'Multinet', 'Multinet Kodu', 'SetCard', 'SetCard Kodu',
        'Pluxee (Sodexo)', 'Pluxee Kodu', 'Metropol', 'Metropol Kodu', 'Paye', 'Paye Kodu',
        'Edenred', 'Edenred Kodu', 'Smart Ticket', 'Tokenflex', 'Tokenflex Kodu', 'iWallet Kodu'];

    todayOrders.forEach(o => {
        const pm = o.paymentMethod || '';
        const src = (o.source || '').toLowerCase();
        const total = o.total || 0;
        const hour = new Date(o.createdAt || o.date).getHours();

        if (o.status === 'İptal') {
            totalCancelled += total;
            return;
        }

        hourlyCounts[hour]++;

        if (src.includes('getir') || src.includes('yemeksepeti') || src.includes('trendyol') ||
            src.includes('migros') || src.includes('online')) {
            totalOnline += total;
        } else if (pm === 'Nakit') {
            totalCash += total;
        } else if (pm === 'Kredi Kartı' || pm === 'EFT/POS') {
            totalCC += total;
        } else if (mealCardTypes.includes(pm)) {
            totalMeal += total;
        } else {
            totalCash += total;
        }

        // Count products
        if (o.items) {
            o.items.forEach(item => {
                const name = item.name || item.productName || 'Bilinmeyen';
                const qty = item.qty || item.quantity || 1;
                productCounts[name] = (productCounts[name] || 0) + qty;
            });
        }
    });

    const grandTotal = totalCash + totalCC + totalOnline + totalMeal;

    // Update summary
    document.getElementById('report-total').textContent = formatCurrency(grandTotal);
    document.getElementById('report-cash').textContent = formatCurrency(totalCash);
    document.getElementById('report-cc').textContent = formatCurrency(totalCC);
    document.getElementById('report-online').textContent = formatCurrency(totalOnline);
    document.getElementById('report-count').textContent = todayOrders.filter(o => o.status !== 'İptal').length.toString();
    document.getElementById('report-cancelled').textContent = formatCurrency(totalCancelled);

    // Payment chart
    renderPaymentChart(grandTotal, totalCash, totalCC, totalOnline, totalMeal);

    // Top products
    renderTopProducts(productCounts);

    // Hourly chart
    renderHourlyChart(hourlyCounts);

    // Past sales
    renderPastSales(orders);
}

function renderPaymentChart(total, cash, cc, online, meal) {
    const chartEl = document.getElementById('payment-chart');
    if (total === 0) {
        chartEl.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:20px">Bugün henüz satış yok</p>';
        return;
    }

    const data = [
        { label: 'Nakit', value: cash, cls: 'cash' },
        { label: 'K.Kartı', value: cc, cls: 'cc' },
        { label: 'Online', value: online, cls: 'online' },
        { label: 'Yemek K.', value: meal, cls: 'meal' },
    ].filter(d => d.value > 0);

    chartEl.innerHTML = data.map(d => {
        const pct = Math.round((d.value / total) * 100);
        return `
            <div class="bar-row">
                <span class="bar-label">${d.label}</span>
                <div class="bar-track">
                    <div class="bar-fill ${d.cls}" style="width:${pct}%">${pct}%</div>
                </div>
            </div>`;
    }).join('');
}

function renderTopProducts(productCounts) {
    const container = document.getElementById('top-products');
    const sorted = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    if (sorted.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:20px">Veri bulunmuyor</p>';
        return;
    }

    container.innerHTML = sorted.map(([name, count], i) => {
        const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        return `
            <div class="top-product-item">
                <span class="product-rank ${rankClass}">${i + 1}</span>
                <span class="product-name">${name}</span>
                <span class="product-count">${count} adet</span>
            </div>`;
    }).join('');
}

function renderHourlyChart(hourlyCounts) {
    const container = document.getElementById('hourly-chart');
    const max = Math.max(...hourlyCounts, 1);

    // Show hour range 8-24 for restaurants
    const startHour = 8;
    const endHour = 24;

    container.innerHTML = '';
    for (let h = startHour; h < endHour; h++) {
        const count = hourlyCounts[h] || 0;
        const height = Math.max((count / max) * 100, 2);
        const isPeak = count === max && count > 0;

        const bar = document.createElement('div');
        bar.className = `hourly-bar${isPeak ? ' peak' : ''}`;
        bar.style.height = height + '%';
        bar.title = `${h}:00 - ${count} sipariş`;

        if (h % 2 === 0) {
            bar.innerHTML = `<span class="hourly-bar-label">${h}</span>`;
        }

        container.appendChild(bar);
    }
}

function renderPastSales(orders) {
    const startDate = document.getElementById('report-date-start').value;
    const endDate = document.getElementById('report-date-end').value;

    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = (orders || []).filter(o => {
        const d = new Date(o.createdAt || o.date);
        return d >= start && d <= end;
    }).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    const container = document.getElementById('past-sales-list');

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state small"><p>Bu tarihlerde satış bulunmuyor</p></div>';
        return;
    }

    container.innerHTML = filtered.slice(0, 50).map(order => {
        const statusClass = getStatusClass(order.status);
        const time = formatOrderTime(order.createdAt || order.date);
        const displayId = (order.id || '').toString().slice(-6);

        return `
            <div class="order-card" onclick="showOrderDetail('${order.id}')">
                <div class="order-info">
                    <div class="order-id">#${displayId}</div>
                    <div class="order-meta"><span>${time}</span></div>
                </div>
                <div class="order-right">
                    <div class="order-total">${formatCurrency(order.total || 0)}</div>
                    <span class="order-status ${statusClass}">${order.status || ''}</span>
                </div>
            </div>`;
    }).join('');
}

function filterSales() {
    apiGetOrders().then(orders => renderPastSales(orders));
}

async function sendZReport() {
    const btn = document.getElementById('btn-zreport');
    btn.classList.add('loading');

    try {
        await apiSendZReport();
        showToast('Z Raporu e-posta ile gönderildi ✅', 'success');
    } catch (err) {
        showToast('Z Raporu gönderilemedi: ' + err.message, 'error');
    }

    btn.classList.remove('loading');
}
