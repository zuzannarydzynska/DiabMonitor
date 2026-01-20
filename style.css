let glucoseData = []; 
let userProfile = null;
let currentFilter = '24h';

const glucoseForm = document.getElementById('glucoseForm');
const loginForm = document.getElementById('loginForm');
const dataTableBody = document.querySelector('#dataTable tbody');
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const headerSubtitle = document.getElementById('header-subtitle');

// --- SESJA I LOGOWANIE ---
function checkSession() {
    const storedUser = localStorage.getItem('userProfile');
    if (storedUser) {
        userProfile = JSON.parse(storedUser);
        showAppScreen();
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
}

function showAppScreen() {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    headerSubtitle.textContent = `Pacjent: ${userProfile.name} | ${userProfile.diabetesType}`;
    loadData();
    setTimeDefaults();
    refreshViews();
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const type = document.getElementById('diabetesType').value;
    if(username && type) {
        userProfile = { name: username, diabetesType: type };
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        showAppScreen();
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    if(confirm('Wylogować?')) {
        localStorage.removeItem('userProfile');
        location.reload();
    }
});

// --- DANE I FORMULARZ ---
function loadData() {
    const stored = localStorage.getItem('glucoseRecords');
    if(stored) glucoseData = JSON.parse(stored);
}

glucoseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = parseInt(document.getElementById('result').value);
    const time = document.getElementById('time').value;
    const category = document.getElementById('category').value;
    const insulin = document.getElementById('insulin').value || "-";
    const carbs = document.getElementById('carbs').value || "-";

    glucoseData.push({ result, time, category, insulin, carbs });
    localStorage.setItem('glucoseRecords', JSON.stringify(glucoseData));
    
    refreshViews();
    glucoseForm.reset();
    setTimeDefaults();
});

function setTimeDefaults() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('time').value = now.toISOString().slice(0, 16);
}

// --- TABELA I STATYSTYKI ---
function refreshViews() {
    // Filtrowanie
    glucoseData.sort((a,b) => new Date(a.time) - new Date(b.time));
    let data = glucoseData;
    
    if(currentFilter !== 'all') {
        const now = new Date();
        const hours = currentFilter === '7d' ? 168 : 24;
        const cutoff = now.getTime() - (hours * 60 * 60 * 1000);
        data = glucoseData.filter(r => new Date(r.time).getTime() > cutoff);
    }

    // Tabela
    dataTableBody.innerHTML = '';
    const displayData = [...data].reverse();
    
    if(displayData.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px">Brak danych</td></tr>';
    } else {
        displayData.forEach(r => {
            const row = dataTableBody.insertRow();
            let color = 'normal';
            if(r.result < 70) color = 'hypo';
            else if(r.result > 180) color = 'hyper';
            
            const d = new Date(r.time);
            row.insertCell().innerHTML = `<b>${d.toLocaleDateString()}</b><br><small>${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small>`;
            
            const resCell = row.insertCell();
            resCell.textContent = r.result;
            resCell.className = color;
            resCell.style.fontSize = '1.2em';
            
            row.insertCell().innerHTML = `<small>${r.category}<br>Ins: ${r.insulin} | WW: ${r.carbs}</small>`;
        });
    }

    // Statystyki
    const avgEl = document.getElementById('avg-glucose');
    const tirEl = document.getElementById('time-in-range');
    const countEl = document.getElementById('count-glucose');

    if(data.length === 0) {
        avgEl.innerText = '--'; tirEl.innerText = '--'; countEl.innerText = '0';
    } else {
        const total = data.reduce((s, r) => s + parseInt(r.result), 0);
        const inRange = data.filter(r => r.result >= 70 && r.result <= 180).length;
        
        avgEl.innerText = (total / data.length).toFixed(0) + ' mg/dL';
        tirEl.innerText = ((inRange / data.length) * 100).toFixed(0) + '%';
        countEl.innerText = data.length;
    }
}

window.setFilter = function(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    refreshViews();
};

document.addEventListener('DOMContentLoaded', checkSession);
