// ═══════════════════════════════════════════════════════
// POSLY iOS — Support Page
// ═══════════════════════════════════════════════════════

let supportTickets = [];

async function initSupportPage() {
    await loadTickets();
}

async function loadTickets() {
    try {
        const result = await apiGetTickets();
        supportTickets = result.content || [];
        renderTicketsList();
    } catch (err) {
        console.error('Support load error:', err);
    }
}

function renderTicketsList() {
    const container = document.getElementById('tickets-list');

    if (supportTickets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <p>Destek talebi bulunmuyor</p>
            </div>`;
        return;
    }

    container.innerHTML = supportTickets.map(ticket => {
        const statusClass = getTicketStatusClass(ticket.status);
        const statusLabel = ticket.status || 'Açık';
        const date = ticket.created_at
            ? new Date(ticket.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';

        return `
            <div class="ticket-card" onclick="showTicketDetail('${ticket.id}')">
                <div class="ticket-header">
                    <span class="ticket-id">${ticket.id}</span>
                    <span class="ticket-status ${statusClass}">${statusLabel}</span>
                </div>
                <div class="ticket-title">${ticket.title || 'Başlıksız'}</div>
                <div class="ticket-desc">${ticket.description || ''}</div>
                <div class="ticket-date">${date}</div>
            </div>`;
    }).join('');
}

function getTicketStatusClass(status) {
    const map = {
        'Açık': 'ticket-status-acik',
        'Yanıtlandı': 'ticket-status-yanitlandi',
        'Yanıt Bekliyor': 'ticket-status-yanit-bekliyor',
        'Kapalı': 'ticket-status-kapali',
    };
    return map[status] || 'ticket-status-acik';
}

function showTicketDetail(ticketId) {
    const ticket = supportTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const chatHistory = ticket.chat_history || [];
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = `
        <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <span style="font-size:12px;color:var(--text-tertiary)">${ticket.id}</span>
                <span class="ticket-status ${getTicketStatusClass(ticket.status)}">${ticket.status || 'Açık'}</span>
            </div>
            <h3 style="font-size:17px;font-weight:800">${ticket.title}</h3>
        </div>

        <div class="ticket-chat" id="ticket-chat">
            ${chatHistory.map(msg => `
                <div class="chat-message ${msg.role === 'agent' ? 'agent' : 'user'}">
                    <div style="font-size:11px;font-weight:600;margin-bottom:3px;opacity:0.7">${msg.sender}</div>
                    <div>${msg.message}</div>
                    <div class="chat-time">${msg.timestamp ? new Date(msg.timestamp).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''}</div>
                </div>
            `).join('')}
        </div>

        ${ticket.status !== 'Kapalı' ? `
        <div class="chat-reply-area">
            <input type="text" id="ticket-reply-input" placeholder="Yanıt yazın...">
            <button onclick="replyToTicket('${ticket.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
        </div>` : '<p style="text-align:center;color:var(--text-tertiary);padding:12px;font-size:13px">Bu talep kapatılmıştır.</p>'}
    `;

    openModal();

    // Scroll to bottom of chat
    setTimeout(() => {
        const chatEl = document.getElementById('ticket-chat');
        if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
    }, 100);
}

async function replyToTicket(ticketId) {
    const input = document.getElementById('ticket-reply-input');
    const message = input.value.trim();
    if (!message) return;

    try {
        await apiReplyTicket(ticketId, message);
        input.value = '';
        showToast('Yanıt gönderildi ✅', 'success');

        // Reload tickets and refresh detail
        await loadTickets();
        showTicketDetail(ticketId);
    } catch (err) {
        showToast('Yanıt gönderilemedi: ' + err.message, 'error');
    }
}

// ─── New Ticket Form ───
function showNewTicketForm() {
    document.getElementById('ticket-modal-overlay').classList.add('active');
    document.getElementById('ticket-modal-sheet').classList.add('active');
}

function closeTicketModal() {
    document.getElementById('ticket-modal-overlay').classList.remove('active');
    document.getElementById('ticket-modal-sheet').classList.remove('active');
}

async function submitTicket(e) {
    e.preventDefault();

    const title = document.getElementById('ticket-title').value.trim();
    const description = document.getElementById('ticket-description').value.trim();
    const user = getStoredUser();
    const restaurant = getStoredRestaurant();

    if (!title || !description) {
        showToast('Lütfen tüm alanları doldurun', 'error');
        return;
    }

    const btn = document.getElementById('btn-submit-ticket');
    btn.classList.add('loading');

    try {
        await apiCreateTicket({
            restaurantId: restaurant?.id || '',
            userName: user ? `${user.firstName} ${user.lastName}` : 'Kullanıcı',
            email: user?.email || '',
            title,
            description,
        });

        showToast('Destek talebi oluşturuldu ✅', 'success');
        closeTicketModal();
        document.getElementById('ticket-form').reset();
        await loadTickets();
    } catch (err) {
        showToast('Talep gönderilemedi: ' + err.message, 'error');
    }

    btn.classList.remove('loading');
}
