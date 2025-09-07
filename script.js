// ---------- UTILS ----------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const BDT = n => `৳${Number(n).toLocaleString('en-BD')}`;

function lsGet(k, d) {
    try { return JSON.parse(localStorage.getItem(k)) ?? d; }
    catch (e) { return d; }
}
function lsSet(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function escapeHtml(s) { if (!s) return ''; return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }

// Initial product data with images (40 products as requested)
const PRODUCTS = [
    {id:1, name:'Espresso', image:'images/espresso.jpeg', price:150, discount:0, desc:'A strong, concentrated shot of coffee.'},
    {id:2, name:'Americano', image:'images/americano.jpeg', price:180, discount:5, desc:'Espresso diluted with hot water.'},
    {id:3, name:'Latte', image:'images/latte.jpeg', price:250, discount:10, desc:'Espresso with steamed milk and a thin layer of foam.'},
    {id:4, name:'Cappuccino', image:'images/cappuccino.jpeg', price:250, discount:10, desc:'Espresso with steamed milk and a thick, frothy foam.'},
    {id:5, name:'Mocha', image:'images/mocha.jpeg', price:280, discount:0, desc:'Espresso with chocolate and steamed milk, topped with cream.'},
    {id:6, name:'Flat White', image:'images/flatwhite.jpeg', price:260, discount:0, desc:'Espresso with micro-foamed milk for a velvety texture.'},
    {id:7, name:'Iced Americano', image:'images/iced.jpeg', price:200, discount:5, desc:'A refreshing mix of espresso, water, and ice.'},
    {id:8, name:'Iced Latte', image:'images/icedlatte.jpeg', price:270, discount:0, desc:'Chilled espresso with milk over ice.'},
    {id:9, name:'Iced Mocha', image:'images/icedmocha.jpeg', price:300, discount:0, desc:'Espresso, chocolate, and milk over ice.'},
    {id:10, name:'Matcha Latte', image:'images/matchalatte.jpeg', price:320, discount:10, desc:'Premium matcha green tea with steamed milk.'},
    {id:11, name:'Hot Chocolate', image:'images/hot.jpeg', price:220, discount:0, desc:'Rich and creamy hot chocolate.'},
    {id:12, name:'Affogato', image:'images/affogato.jpeg', price:200, discount:0, desc:'A scoop of vanilla ice cream drowned in hot espresso.'},
    {id:13, name:'Croissant', image:'images/croissant.jpeg', price:120, discount:0, desc:'A buttery, flaky French pastry.'},
    {id:14, name:'Chocolate Croissant', image:'images/chococroi.jpeg', price:150, discount:5, desc:'A croissant filled with rich chocolate.'},
    {id:15, name:'Cinnamon Roll', image:'images/cinnamon-roll.jpg', price:180, discount:0, desc:'A soft, sweet pastry swirled with cinnamon.'},
    {id:16, name:'Blueberry Muffin', image:'images/blueberry-muffin.jpg', price:100, discount:0, desc:'A moist muffin loaded with fresh blueberries.'},
    {id:17, name:'Chocolate Chip Cookie', image:'images/choc-cookie.jpg', price:80, discount:0, desc:'A classic cookie with melted chocolate chips.'},
    {id:18, name:'Red Velvet Cake Slice', image:'images/red-velvet.jpg', price:350, discount:10, desc:'A rich and moist red velvet cake with cream cheese frosting.'},
    {id:19, name:'Cheesecake Slice', image:'images/cheesecake.jpg', price:380, discount:0, desc:'Creamy cheesecake with a buttery crust.'},
    {id:20, name:'Lemon Drizzle Cake', image:'images/lemon-cake.jpg', price:320, discount:0, desc:'Tangy lemon cake with a sweet icing drizzle.'},
    
];

// Seed localStorage if not present and if it's not a fresh install
if (!localStorage.getItem('products')) {
    lsSet('products', PRODUCTS);
}
if (!localStorage.getItem('users')) {
    lsSet('users', [
        {name: 'Admin User', email: 'admin@coffee.shop', phone: '01712345678', address: 'Admin Address', password: 'admin', role: 'admin'}
    ]);
}
if (!localStorage.getItem('orders')) {
    lsSet('orders', []);
}

// ---------- Auth & Session ----------
const sessionKey = 'cs_session';
function setSession(email) { lsSet(sessionKey, email ? { email } : null); }
function getSession() { return lsGet(sessionKey, null); }
function currentUser() { const s = getSession(); return s ? lsGet('users', []).find(u => u.email === s.email) : null; }
function isUserAdmin() { const u = currentUser(); return u && u.role === 'admin'; }

function registerUser({ name, email, phone, address, password }) {
    const users = lsGet('users', []);
    if (users.find(u => u.email === email)) throw new Error('Email already registered');
    users.push({ name, email, phone, address, password });
    lsSet('users', users);
}
function loginUser(email, password) {
    const users = lsGet('users', []);
    const u = users.find(x => x.email === email && x.password === password);
    if (!u) throw new Error('Invalid credentials');
    setSession(email);
    return u;
}
function updateCurrentUser(partial) {
    const u = currentUser();
    if (!u) return;
    const users = lsGet('users', []);
    const idx = users.findIndex(x => x.email === u.email);
    users[idx] = { ...users[idx], ...partial };
    lsSet('users', users);
}

// ---------- Cart ----------
function cartKey() { const s = getSession(); return s ? `cart_${s.email}` : 'cart_guest'; }
function getCart() { return lsGet(cartKey(), []); }
function setCart(v) { lsSet(cartKey(), v); renderCart(); refreshCartCount(); }
function addToCart(pid) {
    const cart = getCart();
    const it = cart.find(x => x.id === pid);
    if (it) it.qty++;
    else cart.push({ id: pid, qty: 1 });
    setCart(cart);
}
function changeQty(pid, delta) {
    const cart = getCart();
    const it = cart.find(x => x.id === pid);
    if (!it) return;
    it.qty += delta;
    if (it.qty < 1) cart.splice(cart.indexOf(it), 1);
    setCart(cart);
}

// ---------- Orders ----------
function createOrder() {
    const u = currentUser();
    if (!u) throw new Error('Please login to place an order');
    const cart = getCart();
    if (cart.length === 0) throw new Error('Cart is empty');
    const prods = lsGet('products', []);
    const items = cart.map(c => {
        const p = prods.find(x => x.id === c.id);
        if (!p) return null;
        const price = Math.round(p.price * (1 - (p.discount || 0) / 100));
        return { id: p.id, name: p.name, qty: c.qty, price, image: p.image };
    }).filter(item => item !== null);
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    const orders = lsGet('orders', []);
    const id = 'ORD' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const order = { id, email: u.email, items, total, status: 'PENDING', created: new Date().toISOString(), method: $('#co-method').value, notes: $('#co-notes').value };
    orders.unshift(order);
    lsSet('orders', orders);
    setCart([]);
    return order;
}

function myOrders() {
    const u = currentUser();
    return u ? lsGet('orders', []).filter(o => o.email === u.email) : [];
}

// ---------- Render functions ----------
function effectivePrice(p) { return Math.round(p.price * (1 - (p.discount || 0) / 100)); }

function renderProducts() {
    const prods = lsGet('products', []).slice();
    const q = $('#search').value.trim().toLowerCase();
    const sort = $('#sort').value;
    let filtered = prods.filter(p => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
    if (sort === 'price-asc') filtered.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sort === 'price-desc') filtered.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    if (sort === 'discount-desc') filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    $('#products').innerHTML = filtered.map(p => {
        const priceNow = effectivePrice(p);
        return `
            <div class="product-card">
                <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">
                <div class="info">
                    <div class="price-row">
                        <div class="name">${escapeHtml(p.name)}</div>
                        ${p.discount ? `<div class="badge">${p.discount}% OFF</div>` : ''}
                    </div>
                    <div class="desc">${escapeHtml(p.desc)}</div>
                    <div class="price-row">
                        <div><span class="price">${BDT(priceNow)}</span>${p.discount ? `<span class="old">${BDT(p.price)}</span>` : ''}</div>
                        <button class="btn primary small" onclick="addToCart(${p.id})">Add to Order</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function renderCart() {
    const cart = getCart();
    const prods = lsGet('products', []);
    let total = 0;
    $('#cart-body').innerHTML = cart.map(c => {
        const p = prods.find(x => x.id === c.id);
        if (!p) return '';
        const price = effectivePrice(p);
        const subtotal = price * c.qty;
        total += subtotal;
        return `<tr>
            <td class="cart-item-name"><img src="${p.image}" alt="${escapeHtml(p.name)}"><div>${escapeHtml(p.name)}</div></td>
            <td>${BDT(price)}</td>
            <td>
                <button class="btn small" onclick="changeQty(${p.id},-1)">−</button>
                <span class="qty-display">${c.qty}</span>
                <button class="btn small" onclick="changeQty(${p.id},1)">+</button>
            </td>
            <td>${BDT(subtotal)}</td>
            <td><button class="btn danger small" onclick="changeQty(${p.id},-${c.qty})">Remove</button></td>
        </tr>`;
    }).join('');
    $('#cart-total').textContent = BDT(total);
}

function refreshCartCount() { $('#cart-count').textContent = getCart().reduce((s, i) => s + i.qty, 0); }

function renderDashboard() {
    const u = currentUser();
    const orders = myOrders();
    const spent = orders.reduce((s, o) => s + o.total, 0);
    $('#kpis').innerHTML = `
        <div class="kpi"><h3>Signed in as</h3><div class="big">${u ? escapeHtml(u.name) : 'Guest'}</div><div class="muted">${u ? escapeHtml(u.email) : 'Login to track orders'}</div></div>
        <div class="kpi"><h3>Orders</h3><div class="big">${orders.length}</div></div>
        <div class="kpi"><h3>Total Spent</h3><div class="big">${BDT(spent)}</div></div>
        <div class="kpi"><h3>Cart Items</h3><div class="big">${getCart().reduce((s, i) => s + i.qty, 0)}</div></div>`;
    $('#orders-body').innerHTML = orders.map((o, i) => `<tr><td>${i + 1}</td><td>${(new Date(o.created)).toLocaleString()}</td><td>${o.items.map(it => escapeHtml(it.name) + ' ×' + it.qty).join(', ')}</td><td>${BDT(o.total)}</td><td>${o.status}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--muted)">No orders yet.</td></tr>`;
}

function prefillCheckout() {
    const u = currentUser();
    if (!u) return;
    $('#co-name').value = u.name || '';
    $('#co-phone').value = u.phone || '';
    $('#co-address').value = u.address || '';
}

// ---------- Admin Functions (FIXED) ----------
function renderAdminProducts() {
    const products = lsGet('products', []);
    $('#admin-product-list').innerHTML = products.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${BDT(p.price)}</td>
            <td>
                <button class="btn small primary" onclick="editProduct(${p.id})">Edit</button>
                <button class="btn small danger" onclick="deleteProduct(${p.id})">Delete</button>
            </td>
        </tr>`).join('');
}

function addOrUpdateProduct(e) {
    e.preventDefault();
    const id = $('#admin-product-id').value;
    const name = $('#admin-product-name').value;
    const desc = $('#admin-product-desc').value;
    const price = parseFloat($('#admin-product-price').value);
    const discount = parseInt($('#admin-product-discount').value) || 0;
    const image = $('#admin-product-image').value;

    if (!name || isNaN(price) || !image) {
        alert('Please fill out all required fields (Name, Price, Image URL).');
        return;
    }

    let products = lsGet('products', []);

    if (id) {
        // Update existing product
        const index = products.findIndex(p => p.id == id);
        if (index !== -1) {
            products[index] = { id: parseInt(id), name, desc, price, discount, image };
        }
    } else {
        // Add new product
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push({ id: newId, name, desc, price, discount, image });
    }

    lsSet('products', products);
    $('#admin-product-form').reset();
    $('#admin-product-id').value = '';
    $('#admin-submit-btn').textContent = 'Add Product';
    renderAdminProducts();
    renderProducts();
}

function editProduct(id) {
    const products = lsGet('products', []);
    const product = products.find(p => p.id === id);
    if (product) {
        $('#admin-product-id').value = product.id;
        $('#admin-product-name').value = product.name;
        $('#admin-product-desc').value = product.desc;
        $('#admin-product-price').value = product.price;
        $('#admin-product-discount').value = product.discount || 0;
        $('#admin-product-image').value = product.image;
        $('#admin-submit-btn').textContent = 'Update Product';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        let products = lsGet('products', []);
        products = products.filter(p => p.id !== id);
        lsSet('products', products);
        renderAdminProducts();
        renderProducts();
    }
}

// ---------- Tab switching ----------
function switchTab(tab) {
    if (tab === 'admin' && !isUserAdmin()) {
        alert('You do not have permission to access the admin panel.');
        return;
    }
    
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    $$('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
    
    if (tab === 'cart') renderCart();
    if (tab === 'checkout') { renderCart(); prefillCheckout(); }
    if (tab === 'dashboard') renderDashboard();
    if (tab === 'admin') renderAdminProducts();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- Events ----------
$$('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
$$('.btn.ghost').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

$('#reg-btn').addEventListener('click', () => {
    try {
        const u = { name: $('#reg-name').value.trim(), email: $('#reg-email').value.trim(), phone: $('#reg-phone').value.trim(), address: $('#reg-address').value.trim(), password: $('#reg-pass').value };
        if (!u.name || !u.email || !u.password) throw new Error('Name, email, and password are required.');
        registerUser(u);
        $('#reg-msg').textContent = 'Account created successfully! You can now log in.';
        $$('#panel-account input, #panel-account textarea').forEach(el => el.value = '');
    } catch (e) { $('#reg-msg').textContent = e.message; }
});

$('#log-btn').addEventListener('click', () => {
    try {
        const email = $('#log-email').value.trim(), pass = $('#log-pass').value;
        const user = loginUser(email, pass);
        $('#log-msg').textContent = 'Logged in successfully.';
        
        // Update UI based on user login
        $('#welcome').textContent = `Hi, ${user.name}`;
        $('#logoutBtn').style.display = 'inline-block';
        if (user.role === 'admin') {
            $('#admin-tab').style.display = 'inline-block';
        } else {
            $('#admin-tab').style.display = 'none';
        }
        
        switchTab('shop');
    } catch (e) { $('#log-msg').textContent = e.message; }
});

$('#logoutBtn').addEventListener('click', () => {
    setSession(null);
    $('#welcome').textContent = '';
    $('#logoutBtn').style.display = 'none';
    $('#admin-tab').style.display = 'none';
    switchTab('account');
});

$('#place-order').addEventListener('click', () => {
    try {
        if (!currentUser()) throw new Error('Please login before placing an order.');
        if (!getCart().length) throw new Error('Your cart is empty.');
        if (!$('#co-name').value.trim() || !$('#co-phone').value.trim() || !$('#co-address').value.trim()) throw new Error('Please complete delivery details.');
        updateCurrentUser({ name: $('#co-name').value.trim(), phone: $('#co-phone').value.trim(), address: $('#co-address').value.trim() });
        const ord = createOrder();
        $('#co-msg').textContent = `Order #${ord.id} confirmed! We will contact you soon.`;
        renderDashboard();
        refreshCartCount();
    } catch (e) { $('#co-msg').textContent = e.message; }
});

// Search / sort events
$('#search').addEventListener('input', renderProducts);
$('#sort').addEventListener('change', renderProducts);
$('#admin-product-form').addEventListener('submit', addOrUpdateProduct);

// Init
(function init() {
    $('#year').textContent = new Date().getFullYear();
    renderProducts();
    renderCart();
    refreshCartCount();
    const u = currentUser();
    if (u) {
        $('#welcome').textContent = `Hi, ${u.name}`;
        $('#logoutBtn').style.display = 'inline-block';
        if (isUserAdmin()) {
            $('#admin-tab').style.display = 'inline-block';
        } else {
            $('#admin-tab').style.display = 'none';
        }
    }
})();