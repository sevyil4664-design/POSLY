// ═══════════════════════════════════════════════════════
// POSLY iOS — Staff Page
// ═══════════════════════════════════════════════════════

async function initStaffPage() {
    await loadStaff();
}

async function loadStaff() {
    try {
        const users = await apiGetUsers();
        renderStaffList(users);
    } catch (err) {
        console.error('Staff load error:', err);
        document.getElementById('staff-list').innerHTML = `
            <div class="empty-state">
                <p>Personel bilgisi yüklenemedi</p>
            </div>`;
    }
}

function renderStaffList(users) {
    const container = document.getElementById('staff-list');

    if (!users || users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                    <path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
                <p>Personel bulunmuyor</p>
            </div>`;
        return;
    }

    // Sort: Yönetici first, then Şef, then others
    const roleOrder = { 'Yönetici': 0, 'Süper Yönetici': 0, 'Şef': 1, 'Garson': 2, 'Personel': 3 };
    users.sort((a, b) => (roleOrder[a.role] || 3) - (roleOrder[b.role] || 3));

    container.innerHTML = users.map(user => {
        const initials = getInitials(user.firstName, user.lastName);
        const roleClass = getRoleClass(user.role);
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

        return `
            <div class="staff-card">
                <div class="staff-avatar">${initials}</div>
                <div class="staff-info">
                    <div class="staff-name">${fullName}</div>
                    <div class="staff-email">${user.email || ''}</div>
                </div>
                <span class="staff-role ${roleClass}">${user.role || 'Personel'}</span>
            </div>`;
    }).join('');
}

function getInitials(firstName, lastName) {
    const f = (firstName || '').charAt(0).toUpperCase();
    const l = (lastName || '').charAt(0).toUpperCase();
    return f + l || '??';
}

function getRoleClass(role) {
    const map = {
        'Yönetici': 'role-yonetici',
        'Süper Yönetici': 'role-yonetici',
        'Şef': 'role-sef',
        'Garson': 'role-garson',
        'Personel': 'role-personel',
    };
    return map[role] || 'role-personel';
}
