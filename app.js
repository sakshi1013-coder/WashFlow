document.addEventListener('DOMContentLoaded', () => {
    // API URL Base
    const API_URL = '/api';

    // --- State ---
    let currentTab = 'dashboard';
    let currentUser = null;
    
    // --- Elements ---
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    
    const navBtns = document.querySelectorAll('.nav-btn:not(#logout-btn)');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Dashboard Elems
    const dashTotalOrders = document.getElementById('dash-total-orders');
    const dashTotalRevenue = document.getElementById('dash-total-revenue');
    const dashProcessing = document.getElementById('dash-processing');
    const dashReady = document.getElementById('dash-ready');
    const recentOrdersTableBody = document.querySelector('#recent-orders-table tbody');
    
    // Create Order Elems
    const orderForm = document.getElementById('order-form');
    const addGarmentBtn = document.getElementById('add-garment-btn');
    const garmentsList = document.getElementById('garments-list');
    const liveTotalSpan = document.getElementById('live-total');
    
    // All Orders Elems
    const allOrdersTableBody = document.querySelector('#all-orders-table tbody');
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    
    const toast = document.getElementById('toast');

    // --- Authentication ---
    async function checkAuth() {
        try {
            const res = await fetch(`${API_URL}/me`);
            if (res.ok) {
                const user = await res.json();
                currentUser = user;
                loginModal.classList.remove('active');
                loadDashboard();
            } else {
                loginModal.classList.add('active');
            }
        } catch (err) {
            loginModal.classList.add('active');
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value.trim();
        const password = e.target.password.value;

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const data = await res.json();
                currentUser = data.user;
                loginModal.classList.remove('active');
                showToast('Welcome back, ' + currentUser.username);
                loadDashboard();
            } else {
                showToast('Invalid username or password', 'error');
            }
        } catch (err) {
            showToast('Connection error', 'error');
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await fetch(`${API_URL}/logout`, { method: 'POST' });
        currentUser = null;
        loginModal.classList.add('active');
        showToast('Logged out successfully');
    });

    // --- Navigation ---
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            currentTab = btn.getAttribute('data-tab');
            document.getElementById(currentTab).classList.add('active');
            
            loadDataForTab(currentTab);
        });
    });

    function loadDataForTab(tab) {
        if (!currentUser) return;
        if (tab === 'dashboard') loadDashboard();
        if (tab === 'orders-list') loadAllOrders();
    }

    // --- Utility Functions ---
    function showToast(message, type = 'success') {
        const icon = type === 'success' ? '<i class="fa-solid fa-check-circle" style="color: #10B981"></i>' : '<i class="fa-solid fa-exclamation-circle" style="color: #EF4444"></i>';
        toast.innerHTML = `${icon} ${message}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    const getBadgeHtml = (status) => {
        const lower = status.toLowerCase();
        return `<span class="badge badge-${lower}">${status}</span>`;
    };

    // --- Dashboard ---
    async function loadDashboard() {
        try {
            const [dashRes, ordersRes] = await Promise.all([
                fetch(`${API_URL}/dashboard`),
                fetch(`${API_URL}/orders`)
            ]);
            
            if (!dashRes.ok || !ordersRes.ok) {
                if (dashRes.status === 401) return checkAuth();
                throw new Error('Failed to load data');
            }
            
            const stats = await dashRes.json();
            const orders = await ordersRes.json();
            
            dashTotalOrders.textContent = stats.totalOrders || 0;
            dashTotalRevenue.textContent = formatCurrency(stats.totalRevenue || 0);
            dashProcessing.textContent = (stats.ordersPerStatus && stats.ordersPerStatus.PROCESSING) || 0;
            dashReady.textContent = (stats.ordersPerStatus && stats.ordersPerStatus.READY) || 0;

            renderRecentOrders(orders.slice(0, 5));
        } catch (error) {
            console.error('Dashboard Error:', error);
            showToast('Error loading dashboard data', 'error');
        }
    }

    function renderRecentOrders(orders) {
        recentOrdersTableBody.innerHTML = '';
        if (orders.length === 0) {
            recentOrdersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">No orders found.</td></tr>';
            return;
        }

        orders.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${o.id}</strong></td>
                <td>${o.customerName}</td>
                <td><strong>${formatCurrency(o.totalAmount)}</strong></td>
                <td>${getBadgeHtml(o.status)}</td>
                <td>${o.estimatedDelivery}</td>
            `;
            recentOrdersTableBody.appendChild(tr);
        });
    }

    // --- All Orders & Search ---
    async function loadAllOrders() {
        const search = searchInput.value.trim();
        const status = statusFilter.value;
        
        let url = `${API_URL}/orders?`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (status) url += `status=${encodeURIComponent(status)}&`;

        try {
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 401) return checkAuth();
                throw new Error('Failed to fetch orders');
            }
            const orders = await res.json();
            renderAllOrders(orders);
        } catch (error) {
            console.error('All Orders Error:', error);
            showToast('Error fetching orders', 'error');
        }
    }

    function renderAllOrders(orders) {
        allOrdersTableBody.innerHTML = '';
        if (orders.length === 0) {
            allOrdersTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem; color: var(--text-muted);">No orders match criteria.</td></tr>';
            return;
        }

        orders.forEach(o => {
            const tr = document.createElement('tr');
            const items = o.garments || [];
            const itemsSummary = items.map(g => `${g.quantity}x ${g.type}`).join(', ');
            
            tr.innerHTML = `
                <td><strong>${o.id}</strong></td>
                <td>
                    <div>${o.customerName}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${o.phone}</div>
                </td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${itemsSummary}">${itemsSummary}</td>
                <td><strong>${formatCurrency(o.totalAmount)}</strong></td>
                <td>
                    <select class="status-select" data-id="${o.id}">
                        <option value="RECEIVED" ${o.status === 'RECEIVED' ? 'selected' : ''}>Received</option>
                        <option value="PROCESSING" ${o.status === 'PROCESSING' ? 'selected' : ''}>Processing</option>
                        <option value="READY" ${o.status === 'READY' ? 'selected' : ''}>Ready</option>
                        <option value="DELIVERED" ${o.status === 'DELIVERED' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
                <td>${o.estimatedDelivery}</td>
                <td>
                    <button class="btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="alert('Print functionality coming soon!')">Receipt</button>
                </td>
            `;
            allOrdersTableBody.appendChild(tr);
        });

        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                await updateOrderStatus(id, newStatus);
            });
        });
    }

    async function updateOrderStatus(id, status) {
        try {
            const res = await fetch(`${API_URL}/orders/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error('Update failed');
            showToast(`Order ${id} updated to ${status}`);
        } catch (error) {
            console.error(error);
            showToast('Failed to update status', 'error');
            loadAllOrders();
        }
    }

    searchInput.addEventListener('input', debounce(loadAllOrders, 300));
    statusFilter.addEventListener('change', loadAllOrders);

    // --- Order Creation ---
    addGarmentBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'garment-row';
        row.innerHTML = `
            <div class="form-group">
                <select class="garment-type" required>
                    <option value="Shirt">Shirt</option>
                    <option value="Pants">Pants</option>
                    <option value="Dress">Dress</option>
                    <option value="Jacket">Jacket</option>
                    <option value="Saree">Saree</option>
                    <option value="Blanket">Blanket</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <input type="number" class="garment-qty" placeholder="Qty" min="1" required>
            </div>
            <div class="form-group">
                <input type="number" class="garment-price" placeholder="Price/ea (₹)" min="0" step="0.5" required>
            </div>
            <button type="button" class="btn-remove"><i class="fa-solid fa-trash"></i></button>
        `;
        garmentsList.appendChild(row);
        updateRemoveButtons();
        attachGarmentListeners();
    });

    garmentsList.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove')) {
            const btn = e.target.closest('.btn-remove');
            if (btn.disabled) return;
            btn.closest('.garment-row').remove();
            updateRemoveButtons();
            calculateLiveTotal();
        }
    });

    function updateRemoveButtons() {
        const rows = document.querySelectorAll('.garment-row');
        const btns = document.querySelectorAll('.btn-remove');
        btns.forEach(b => b.disabled = rows.length === 1);
    }

    function attachGarmentListeners() {
        document.querySelectorAll('.garment-qty, .garment-price').forEach(input => {
            input.removeEventListener('input', calculateLiveTotal);
            input.addEventListener('input', calculateLiveTotal);
        });
    }

    function calculateLiveTotal() {
        let total = 0;
        document.querySelectorAll('.garment-row').forEach(row => {
            const qty = Number(row.querySelector('.garment-qty').value) || 0;
            const price = Number(row.querySelector('.garment-price').value) || 0;
            total += (qty * price);
        });
        liveTotalSpan.textContent = formatCurrency(total);
    }

    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerName = document.getElementById('customerName').value;
        const phone = document.getElementById('phone').value;
        const garments = [];
        let valid = true;

        document.querySelectorAll('.garment-row').forEach(row => {
            const type = row.querySelector('.garment-type').value;
            const quantity = Number(row.querySelector('.garment-qty').value);
            const price = Number(row.querySelector('.garment-price').value);
            if (quantity <= 0 || price < 0) valid = false;
            garments.push({ type, quantity, price });
        });

        if (!valid || garments.length === 0) {
            showToast('Please check garment quantities and prices.', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerName, phone, garments })
            });

            if (!res.ok) throw new Error('Submit failed');
            const newOrder = await res.json();
            showToast(`Order ${newOrder.id} created successfully`);
            
            orderForm.reset();
            garmentsList.innerHTML = '';
            addGarmentBtn.click();
            calculateLiveTotal();
            navBtns[0].click();
        } catch (error) {
            console.error(error);
            showToast('Failed to create order', 'error');
        }
    });

    // --- Helpers ---
    function debounce(func, timeout = 300){
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }

    // Init
    checkAuth();
    updateRemoveButtons();
    attachGarmentListeners();
});
