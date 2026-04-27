let currentUser = localStorage.getItem('active_user');
let transactions = [];
let currentFilter = 'all';
let charts = {};

// STATES
let chartView = 'daily';
let chartMonth = 'all';

// custom date filter
let selectedDateFilter = null;

// ✅ FIX: Sidebar Toggle (Hamburger menu click cheyyumpo work aakan)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// ✅ FIX: Auto close sidebar when clicking outside (Content area-il click cheythaal close aakum)
document.addEventListener('click', function(e) {
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.getElementById('sidebarToggle'); // Navbar-ile icon ID

    if (!sidebar) return;

    // Sidebar active aayirikkumpo athinte puratho, toggle button-u puratho click cheythaal close aakum
    if (sidebar.classList.contains('active')) {
        if (!sidebar.contains(e.target) && (menuBtn && !menuBtn.contains(e.target))) {
            sidebar.classList.remove('active');
        }
    }
});


// 1. Clock Logic
function updateClock() {
    const now = new Date();
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const timeEl = document.getElementById('live-time');
    const dateEl = document.getElementById('live-date');
    const dayEl = document.getElementById('live-day');
    if(timeEl) timeEl.innerText = now.toLocaleTimeString('en-IN', { hour12: true });
    if(dateEl) dateEl.innerText = now.toLocaleDateString('en-GB');
    if(dayEl) dayEl.innerText = days[now.getDay()];
}
setInterval(updateClock, 1000);
updateClock();

// 2. Initialization
window.onload = () => {
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
    const dateInput = document.getElementById('custom-date');
    if(dateInput) dateInput.valueAsDate = new Date();
    !currentUser ? showUserModal(false) : initApp();
};

function initApp() {
    const nameEl = document.getElementById('display-name');
    if(nameEl) nameEl.innerText = currentUser;
    const modal = document.getElementById('userModal');
    if(modal) modal.style.display = 'none';
    transactions = JSON.parse(localStorage.getItem(`data_${currentUser}`)) || [];
    updateUI();
}

// 3. User Management
function showUserModal(showBack = false) {
    const modal = document.getElementById('userModal');
    if(!modal) return;
    modal.style.display = 'flex';
    const users = JSON.parse(localStorage.getItem('mycash_users')) || [];
    const userListEl = document.getElementById('userList');
    if(userListEl) {
        userListEl.innerHTML = users.map(u => 
            `<div onclick="selectUser('${u}')" class="transaction-item" style="cursor:pointer; border:${u === currentUser ? '1px solid var(--primary)' : '1px solid transparent'}">
                <span>${u}</span>
                ${u === currentUser ? '<i class="fas fa-check-circle" style="color:var(--primary)"></i>' : ''}
            </div>`
        ).join('');
    }
    const backBtn = document.getElementById('backBtn');
    if(backBtn) backBtn.style.display = (showBack && currentUser) ? 'block' : 'none';
}

function closeModal() { if(currentUser) document.getElementById('userModal').style.display = 'none'; }

function addUser() {
    const nameInput = document.getElementById('newUserName');
    if(!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) return;
    let users = JSON.parse(localStorage.getItem('mycash_users')) || [];
    if (!users.includes(name)) users.push(name);
    localStorage.setItem('mycash_users', JSON.stringify(users));
    nameInput.value = '';
    selectUser(name);
}

function selectUser(name) {
    currentUser = name;
    localStorage.setItem('active_user', name);
    initApp();
}

// 4. Core App Functions
function addTransaction() {
    const descEl = document.getElementById('desc');
    const amountEl = document.getElementById('amount');
    const typeEl = document.getElementById('type');
    const accEl = document.getElementById('account');
    const dateEl = document.getElementById('custom-date');

    if(!descEl || !amountEl) return;

    const desc = descEl.value;
    const amount = parseFloat(amountEl.value);
    const type = typeEl.value;
    const acc = accEl.value;
    const date = dateEl.value;

    if (!desc || isNaN(amount)) return alert("Please fill all details");

    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour12: true });

    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const day = dayNames[new Date(date).getDay()];

    transactions.push({ 
        id: Date.now(), 
        desc, 
        amount, 
        type, 
        acc, 
        date, 
        day,
        time
    });

    saveAndRefresh();
    descEl.value = '';
    amountEl.value = '';
}

function saveAndRefresh() {
    localStorage.setItem(`data_${currentUser}`, JSON.stringify(transactions));
    updateUI();
}

function deleteTransaction(id) {
    if(confirm("Remove this transaction?")) {
        transactions = transactions.filter(t => t.id !== id);
        saveAndRefresh();
    }
}

function setFilter(f, btn) {
    currentFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateUI();
}

function setChartView(view) {
    chartView = view;
    updateUI();
}

function setMonthFilter(val) {
    chartMonth = val;
    updateUI();
}

function setCustomDateFilter(date) {
    selectedDateFilter = date;
    updateUI();
}

// 5. UI Rendering
function updateUI() {
    const list = document.getElementById('list-container');
    if(!list) return;
    list.innerHTML = "";

    let accTotals = { "Cash": 0, "Bank": 0, "UPI": 0 };
    let totalIncome = 0, totalExpense = 0;
    let trendMap = {};

    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(t => {
        if (chartMonth !== 'all') {
            if (new Date(t.date).getMonth() != chartMonth) return;
        }

        if (selectedDateFilter) {
            if (t.date !== selectedDateFilter) return;
        }

        const isInc = t.type === 'income';
        if (isInc) totalIncome += t.amount; else totalExpense += t.amount;
        accTotals[t.acc] += isInc ? t.amount : -t.amount;

        let key;
        const d = new Date(t.date);

        if (chartView === 'daily') key = t.date;
        else if (chartView === 'weekly') key = `${d.getFullYear()}-W${Math.ceil(d.getDate()/7)}`;
        else key = `${d.getFullYear()}-${d.getMonth()+1}`;

        trendMap[key] = (trendMap[key] || 0) + (isInc ? t.amount : -t.amount);
    });

    const trendLabels = Object.keys(trendMap);
    const trendData = Object.values(trendMap);

    const cashEl = document.getElementById('acc-cash');
    const bankEl = document.getElementById('acc-bank');
    const upiEl = document.getElementById('acc-upi');
    
    if(cashEl) cashEl.innerText = `₹${accTotals["Cash"]}`;
    if(bankEl) bankEl.innerText = `₹${accTotals["Bank"]}`;
    if(upiEl) upiEl.innerText = `₹${accTotals["UPI"]}`;

    transactions.slice().reverse().forEach(t => {
        if (currentFilter !== 'all' && t.type !== currentFilter) return;
        if (selectedDateFilter && t.date !== selectedDateFilter) return;

        list.innerHTML += `
        <div class="transaction-item" style="border-left: 4px solid ${t.type === 'income' ? 'var(--income)' : 'var(--expense)'}">
            <div style="flex:1">
                <div style="display:flex; justify-content:space-between;">
                    <b>${t.desc}</b>
                    <small>${t.day}</small>
                </div>
                <small>${t.date} | ${t.time} | ${t.acc}</small>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
                <b style="color:${t.type==='income'?'green':'red'}">
                    ${t.type==='income'?'+':'-'}₹${t.amount}
                </b>
                <i class="fas fa-trash" style="cursor:pointer; color:red;" onclick="deleteTransaction(${t.id})"></i>
            </div>
        </div>`;
    });

    renderCharts(totalIncome, totalExpense, trendData, trendLabels);
}

// 6. Charts
function renderCharts(inc, exp, trend, labels) {
    const config = { responsive: true, maintainAspectRatio: false };

    createChart('trendChart', 'line', {
        labels: labels,
        datasets: [{ data: trend, borderColor: '#6c5ce7', fill: true }]
    }, config);

    const max = (inc + exp) || 1;
    createChart('balanceGauge', 'doughnut', gaugeData(inc-exp, max, '#6c5ce7'), gaugeOpts());
    createChart('flowGauge', 'doughnut', gaugeData(inc, max, '#00d1b2'), gaugeOpts());
    createChart('spendGauge', 'doughnut', gaugeData(exp, inc || 1, '#ff3860'), gaugeOpts());
}

function createChart(id, type, data, options) {
    if (charts[id]) charts[id].destroy();
    const canvas = document.getElementById(id);
    if(canvas) {
        charts[id] = new Chart(canvas.getContext('2d'), { type, data, options });
    }
}

function gaugeData(v, m, c) {
    return {
        datasets: [{
            data: [Math.max(0, v), Math.max(0, m - v)],
            backgroundColor: [c, 'rgba(255,255,255,0.05)'],
            borderWidth: 0,
            circumference: 180,
            rotation: 270
        }]
    };
}

function gaugeOpts() {
    return { 
        cutout: '80%', 
        plugins: { 
            tooltip: { enabled: false },
            legend: { display: false } 
        } 
    };
}

// 7. PDF
function downloadPDF() {
    let filtered = transactions.filter(t => {
        if (currentFilter !== 'all' && t.type !== currentFilter) return false;
        if (selectedDateFilter && t.date !== selectedDateFilter) return false;
        return true;
    });

    let inc = 0, exp = 0;
    const tableBody = document.getElementById('pdf-table-body');
    if(!tableBody) return;

    tableBody.innerHTML = filtered.map(t => {
        if(t.type==='income') inc+=t.amount; else exp+=t.amount;
        return `<tr>
            <td style="border:1px solid #ddd;padding:8px;">${t.day}</td>
            <td style="border:1px solid #ddd;padding:8px;">${t.date}</td>
            <td style="border:1px solid #ddd;padding:8px;">${t.time}</td>
            <td style="border:1px solid #ddd;padding:8px;">${t.desc}</td>
            <td style="border:1px solid #ddd;padding:8px;">${t.acc}</td>
            <td style="border:1px solid #ddd;padding:8px; color:${t.type==='income'?'green':'red'}">
                ${t.type==='income'?'+':'-'}₹${t.amount}
            </td>
        </tr>`;
    }).join('');

    document.getElementById('pdf-user').innerText = currentUser;
    document.getElementById('pdf-report-date').innerText = new Date().toLocaleDateString();
    document.getElementById('pdf-income').innerText = `₹${inc}`;
    document.getElementById('pdf-expense').innerText = `₹${exp}`;
    document.getElementById('pdf-balance').innerText = `₹${inc-exp}`;

    const element = document.getElementById('pdf-template');
    if(element) {
        element.style.display = 'block';
        html2pdf().from(element).save().then(() => {
            element.style.display = 'none';
        });
    }
}

// Utils
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

function logout() {
    if(confirm("Are you sure?")) {
        localStorage.removeItem('active_user');
        location.reload();
    }
}

function clearHistory() {
    if(confirm("Permanently delete data for " + currentUser + "?")) {
        localStorage.removeItem(`data_${currentUser}`);
        location.reload();
    }
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}