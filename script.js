document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ХРАНИЛИЩА (STORAGE)
    // ==========================================
    function getStoredOrders() {
        return JSON.parse(localStorage.getItem('sweet_byte_orders')) || [];
    }

    function saveStoredOrders(orders) {
        localStorage.setItem('sweet_byte_orders', JSON.stringify(orders));
    }

    // История заказов устройства клиента
    function getUserOrderHistory() {
        return JSON.parse(localStorage.getItem('my_sweet_byte_orders')) || [];
    }

    function saveUserOrderHistory(orderId) {
        const history = getUserOrderHistory();
        if (!history.includes(orderId)) {
            history.unshift(orderId);
            localStorage.setItem('my_sweet_byte_orders', JSON.stringify(history));
        }
    }

    // Функция для удаления заказа из памяти клиента (когда он его забрал)
    function removeUserOrderHistory(orderId) {
        let history = getUserOrderHistory();
        history = history.filter(id => id !== orderId);
        localStorage.setItem('my_sweet_byte_orders', JSON.stringify(history));
    }

    const statusNames = {
        1: "Принят",
        2: "Готовится",
        3: "В доставке",
        4: "Доставлен"
    };

    // ==========================================
    // ЛОГИКА АДМИН-ПАНЕЛИ (Если мы на admin.html)
    // ==========================================
    if (document.body.classList.contains('admin-page')) {
        const ordersList = document.getElementById('orders-list');
        const totalOrdersEl = document.getElementById('total-orders');
        const newOrdersEl = document.getElementById('new-orders');
        const processingOrdersEl = document.getElementById('processing-orders');
        const completedOrdersEl = document.getElementById('completed-orders');
        const clearCompletedBtn = document.getElementById('clear-completed-btn');

        const statusModal = document.getElementById('status-modal');
        const statusClose = document.querySelector('.status-close');
        const statusForm = document.getElementById('status-update-form');
        const modalOrderId = document.getElementById('modal-order-id');
        const currentOrderIdInput = document.getElementById('current-order-id');
        const newStatusSelect = document.getElementById('new-status-select');

        function renderAdminPanel() {
            const orders = getStoredOrders();

            totalOrdersEl.textContent = orders.length;
            newOrdersEl.textContent = orders.filter(o => o.status === 1).length;
            processingOrdersEl.textContent = orders.filter(o => o.status === 2 || o.status === 3).length;
            completedOrdersEl.textContent = orders.filter(o => o.status === 4).length;

            ordersList.innerHTML = '';

            if (orders.length === 0) {
                ordersList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#7D6B68;">Заказов пока нет 📦</td></tr>`;
                return;
            }

            orders.forEach(order => {
                const tr = document.createElement('tr');
                const itemsText = order.items.map(i => `${i.title} (${i.quantity} шт.)`).join(', ');

                const actionButton = order.status === 4 
                    ? `<button class="action-btn delete-btn" data-id="${order.id}">Удалить</button>`
                    : `<button class="action-btn edit-status-btn" data-id="${order.id}">Изменить</button>`;

                tr.innerHTML = `
                    <td><strong>#${order.id}</strong></td>
                    <td>${itemsText}<br><small style="color:#7D6B68;">Сумма: ${order.total} ₸</small></td>
                    <td>${order.userName}<br><small style="color:#7D6B68;">${order.address}</small></td>
                    <td>${order.phone}</td>
                    <td><span class="status-button status-${order.status}">${statusNames[order.status]}</span></td>
                    <td>${actionButton}</td>
                `;
                ordersList.appendChild(tr);
            });

            document.querySelectorAll('.edit-status-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.target.getAttribute('data-id'), 10);
                    const order = orders.find(o => o.id === id);
                    if (order) {
                        modalOrderId.textContent = order.id;
                        currentOrderIdInput.value = order.id;
                        newStatusSelect.value = order.status;
                        statusModal.style.display = 'block';
                    }
                });
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.target.getAttribute('data-id'), 10);
                    if (confirm(`Удалить заказ №${id}?`)) {
                        let currentOrders = getStoredOrders();
                        currentOrders = currentOrders.filter(o => o.id !== id);
                        saveStoredOrders(currentOrders);
                        renderAdminPanel();
                    }
                });
            });
        }

        if (clearCompletedBtn) {
            clearCompletedBtn.addEventListener('click', () => {
                let orders = getStoredOrders();
                const completedCount = orders.filter(o => o.status === 4).length;
                
                if (completedCount === 0) {
                    alert("Нет доставленных заказов для удаления!");
                    return;
                }

                if (confirm(`Удалить все доставленные заказы (${completedCount} шт.)?`)) {
                    orders = orders.filter(o => o.status !== 4);
                    saveStoredOrders(orders);
                    renderAdminPanel();
                }
            });
        }

        if (statusClose) statusClose.addEventListener('click', () => statusModal.style.display = 'none');

        if (statusForm) {
            statusForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = parseInt(currentOrderIdInput.value, 10);
                const newStatus = parseInt(newStatusSelect.value, 10);

                let orders = getStoredOrders();
                const orderIndex = orders.findIndex(o => o.id === id);
                if (orderIndex !== -1) {
                    orders[orderIndex].status = newStatus;
                    saveStoredOrders(orders);
                    renderAdminPanel();
                    statusModal.style.display = 'none';
                }
            });
        }

        renderAdminPanel();
        return;
    }

    // ==========================================
    // ЛОГИКА МАГАЗИНА (Если мы на index.html)
    // ==========================================
    let cart = [];

    const cartBtn = document.querySelector('.cart-icon');
    const cartModal = document.getElementById('cart-modal');
    const closeCartBtn = document.querySelector('.close-button');
    const cartCounter = document.querySelector('.cart-counter');
    const cartItemsList = document.getElementById('cart-items-list');
    const cartTotalAmount = document.getElementById('cart-total-amount');

    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutClose = document.querySelector('.checkout-close');
    const checkoutBtn = document.querySelector('.checkout-button');
    const checkoutTotalAmount = document.getElementById('checkout-total-amount');
    const checkoutForm = document.getElementById('checkout-form');

    const trackModal = document.getElementById('track-modal');
    const trackClose = document.querySelector('.track-close');
    const trackLink = document.querySelector('.track-order-link');
    const trackingInfo = document.getElementById('tracking-info');

    const toast = document.getElementById('toast');

    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.product-card');
            const title = card.getAttribute('data-title');
            const price = parseInt(card.getAttribute('data-price'), 10);

            const existing = cart.find(item => item.title === title);
            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({ title, price, quantity: 1 });
            }

            updateCart();
            showToast(`✨ ${title} добавлен в корзину!`);
        });
    });

    function updateCart() {
        if (!cartCounter) return;
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCounter.textContent = totalItems;

        cartItemsList.innerHTML = '';
        let totalPrice = 0;

        if (cart.length === 0) {
            cartItemsList.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 10px;">Корзина пока пуста 🍰</p>';
        }

        cart.forEach((item, index) => {
            totalPrice += item.price * item.quantity;
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = `
                <div>
                    <strong>${item.title}</strong><br>
                    <small>${item.price.toLocaleString()} ₸ × ${item.quantity}</small>
                </div>
                <div>
                    <button class="cart-qty-btn" onclick="changeQty(${index}, -1)">-</button>
                    <button class="cart-qty-btn" onclick="changeQty(${index}, 1)">+</button>
                    <button class="remove-item-btn" onclick="removeItem(${index})">✕</button>
                </div>
            `;
            cartItemsList.appendChild(itemEl);
        });

        const formattedTotal = `${totalPrice.toLocaleString()} ₸`;
        if (cartTotalAmount) cartTotalAmount.textContent = formattedTotal;
        if (checkoutTotalAmount) checkoutTotalAmount.textContent = formattedTotal;
    }

    window.changeQty = (index, delta) => {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) cart.splice(index, 1);
        updateCart();
    };

    window.removeItem = (index) => {
        cart.splice(index, 1);
        updateCart();
    };

    if (cartBtn) cartBtn.addEventListener('click', () => cartModal.style.display = 'block');
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => cartModal.style.display = 'none');

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                showToast('⚠️ Сначала добавьте товары в корзину!');
                return;
            }
            cartModal.style.display = 'none';
            checkoutModal.style.display = 'block';
        });
    }

    if (checkoutClose) checkoutClose.addEventListener('click', () => checkoutModal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target === cartModal) cartModal.style.display = 'none';
        if (e.target === checkoutModal) checkoutModal.style.display = 'none';
        if (e.target === trackModal) trackModal.style.display = 'none';
    });

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const orderId = Math.floor(1000 + Math.random() * 9000);
            const name = document.getElementById('user-name').value;
            const phone = document.getElementById('user-phone').value;
            const address = document.getElementById('user-address').value;

            const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

            const newOrder = {
                id: orderId,
                userName: name,
                phone: phone,
                address: address,
                items: [...cart],
                total: total,
                status: 1,
                date: new Date().toISOString()
            };

            const orders = getStoredOrders();
            orders.unshift(newOrder);
            saveStoredOrders(orders);

            saveUserOrderHistory(orderId);

            showToast(`🎉 Заказ №${orderId} оформлен!`);
            cart = [];
            updateCart();
            checkoutForm.reset();
            checkoutModal.style.display = 'none';
        });
    }

    // ==========================================
    // ТРЕКИНГ ЗАКАЗОВ И ПАМЯТЬ КЛИЕНТА
    // ==========================================
    if (trackLink) {
        trackLink.addEventListener('click', (e) => {
            e.preventDefault();
            trackModal.style.display = 'block';
            renderTrackingWindow();
        });
    }

    if (trackClose) {
        trackClose.addEventListener('click', () => trackModal.style.display = 'none');
    }

    function renderTrackingWindow() {
        const userHistory = getUserOrderHistory();

        let historyHTML = '';
        if (userHistory.length > 0) {
            historyHTML = `
                <div style="margin-bottom: 15px; text-align: left;">
                    <small style="color: #7D6B68; font-weight: 600;">Ваши активные заказы:</small>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
                        ${userHistory.map(id => `
                            <button class="history-chip-btn" data-id="${id}" style="background: #f4f5f7; border: 1px solid #ddd; padding: 4px 10px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 12px; color: #3E2723;">
                                #${id}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        trackingInfo.innerHTML = `
            ${historyHTML}
            <form id="track-form" style="display:flex; gap: 8px; margin-bottom: 15px;">
                <input type="number" id="order-id-input" placeholder="Введите № заказа" required style="flex:1; padding: 10px; border-radius: 10px; border: 1px solid #ddd;">
                <button type="submit" style="background: #3E2723; color: #fff; border: none; padding: 10px 15px; border-radius: 10px; font-weight: 700; cursor: pointer;">Проверить</button>
            </form>
            <div id="status-display-area"></div>
        `;

        document.querySelectorAll('.history-chip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'), 10);
                document.getElementById('order-id-input').value = id;
                showOrderStatus(id);
            });
        });

        document.getElementById('track-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = parseInt(document.getElementById('order-id-input').value, 10);
            showOrderStatus(id);
        });

        if (userHistory.length > 0) {
            document.getElementById('order-id-input').value = userHistory[0];
            showOrderStatus(userHistory[0]);
        }
    }

    function showOrderStatus(orderId) {
        const statusArea = document.getElementById('status-display-area');
        const orders = getStoredOrders();
        const found = orders.find(o => o.id === orderId);

        if (!found) {
            statusArea.innerHTML = `<p style="color: #d32f2f; font-weight:700;">Заказ №${orderId} не найден!</p>`;
            return;
        }

        const status = found.status;
        let confirmBtnHTML = '';

        if (status === 3) {
            confirmBtnHTML = `
                <div style="margin-top: 15px; text-align: center;">
                    <button id="confirm-received-btn" style="background: #4caf50; color: white; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 700; cursor: pointer; width: 100%;">
                        ✅ Я получил(а) заказ
                    </button>
                </div>
            `;
        } else if (status === 4) {
            confirmBtnHTML = `<p style="color: #4caf50; font-weight:700; text-align:center; margin-top:15px;">Спасибо! Заказ успешно доставлен 🍰</p>`;
            // Если статус 4 (уже доставлен), сразу убираем его из списка сохранённых
            removeUserOrderHistory(orderId);
        }

        statusArea.innerHTML = `
            <div class="order-tracker" style="margin-top:10px;">
                <div class="tracker-item ${status >= 1 ? 'active' : ''}"><span class="tracker-dot"></span> Принят в обработку</div>
                <div class="tracker-item ${status >= 2 ? 'active' : ''}"><span class="tracker-dot"></span> Готовится кондитером 🍰</div>
                <div class="tracker-item ${status >= 3 ? 'active' : ''}"><span class="tracker-dot"></span> Передан курьеру 🚗</div>
                <div class="tracker-item ${status >= 4 ? 'active' : ''}"><span class="tracker-dot"></span> Доставлен</div>
            </div>
            ${confirmBtnHTML}
        `;

        const confirmBtn = document.getElementById('confirm-received-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                let currentOrders = getStoredOrders();
                const idx = currentOrders.findIndex(o => o.id === orderId);
                if (idx !== -1) {
                    currentOrders[idx].status = 4;
                    saveStoredOrders(currentOrders);
                    
                    // Удаляем заказ из сохранённых у клиента
                    removeUserOrderHistory(orderId);
                    
                    showToast('Заказ успешно получен!');
                    // Перерисовываем окно отслеживания, чтобы кнопка пропала
                    renderTrackingWindow();
                }
            });
        }
    }
});