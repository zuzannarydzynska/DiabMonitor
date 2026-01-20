// --- ZMIENNE ---
let glucoseData = []; 
let userProfile = null;

const glucoseForm = document.getElementById('glucoseForm');
const loginForm = document.getElementById('loginForm');
const dataTableBody = document.querySelector('#dataTable tbody');
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const headerSubtitle = document.getElementById('header-subtitle');

let currentFilter = '24h';
const TARGET_RANGE_MIN = 70;
const TARGET_RANGE_MAX = 180;

// --- LOGIKA SESJI ---
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
    
    if (userProfile) {
        headerSubtitle.textContent = `${userProfile.name} | ${userProfile.diabetesType}`;
    }
    
    loadDataFromLocalStorage();
    setTimeDefaults();
    refreshViews();
}

// Obsługa Logowania
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const diabetesType = document.getElementById('diabetesType').value;

        if (username && diabetesType) {
            userProfile = { name: username, diabetesType: diabetesType };
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
            showAppScreen();
        }
    });
}

// Obsługa Wylogowania
document.getElementById('logout-btn').addEventListener('click', function() {
    if(confirm("Wylogować?")) {
        localStorage.removeItem('userProfile');
        userProfile = null;
        location.reload();
    }
});

// --- OBSŁUGA DANYCH ---
function saveDataToLocalStorage() {
    localStorage.setItem('glucoseRecords', JSON.stringify(glucoseData));
}

function loadDataFromLocalStorage() {
    const storedData = localStorage.getItem('glucoseRecords');
    if (storedData) {
        glucoseData = JSON.parse(storedData);
    }
}

// --- DODAWANIE WYNIKU ---
if (glucoseForm) {
    glucoseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const result = parseInt(document.getElementById('result').value);
        const time = document.getElementById('time').value;
        const category = document.getElementById('category').value;
        const insulin = document.getElementById('insulin').value || "-";
        const carbs = document.getElementById('carbs').value || "-";

        const newRecord = { result, time, category, insulin, carbs };

        glucoseData.push(newRecord);
        saveDataToLocalStorage(); 
        refreshViews(); 
        
        glucoseForm.reset();
        setTimeDefaults(); 
    });
}

function setTimeDefaults() {
    const timeInput = document.getElementById('time');
    if (timeInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        timeInput.value = now.toISOString().slice(0, 16);
    }
}

// --- FILTRY I TABELA ---
function getFilteredData() {
    glucoseData.sort((a, b) => new Date(a.time) - new Date(b.time));
    if (currentFilter === 'all') return glucoseData;

    const now = new Date();
    let hours = 24;
    if (currentFilter === '7d') hours = 168; 
    if (currentFilter === '30d') hours = 720; 

    const cutoff = now.getTime() - (hours * 60 * 60 * 1000);
    return glucoseData.filter(r => new Date(r.time).getTime() > cutoff);
}

window.setFilter = function(filterType, btn) {
    currentFilter = filterType;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    refreshViews();
}

function refreshViews() {
    const data = getFilteredData();
    updateTable(data);
    updateMetrics(data);
}

function updateTable(data) {
    if (!dataTableBody) return;
    dataTableBody.innerHTML = ''; 
    const sorted = [...data].reverse(); 

    if (sorted.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#777;">Brak danych.</td></tr>';
        return;
    }

    sorted.forEach(rec => {
        const row = dataTableBody.insertRow();
        let color = 'normal';
        if (rec.result < TARGET_RANGE_MIN) color = 'hypo'; 
        else if (rec.result > TARGET_RANGE_MAX) color = 'hyper'; 

        const d = new Date(rec.time);
        
        row.insertCell().innerHTML = `
            <div style="font-weight:bold">${d.toLocaleDateString('pl-PL')}</div>
            <div style="font-size:0.85em; color:#888">${d.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})}</div>
        `;
        
        const resCell = row.insertCell();
        resCell.textContent = rec.result;
        resCell.className = color;
        resCell.style.fontSize = '1.3em';

        row.insertCell().innerHTML = `
            <div style="font-size:0.9em">${rec.category}</div>
            <div style="font-size:0.8em; color:#666">Ins: ${rec.insulin} | WW: ${rec.carbs}</div>
        `;
    });
}

function updateMetrics(data) {
    const avgEl = document.getElementById('avg-glucose');
    const tirEl = document.getElementById('time-in-range');
    const countEl = document.getElementById('count-glucose');

    if (!avgEl) return;
    if (data.length === 0) {
        avgEl.textContent = '--'; tirEl.textContent = '--'; countEl.textContent = '0';
        return;
    }
    const total = data.reduce((s, r) => s + parseInt(r.result), 0);
    const avg = (total / data.length).toFixed(0);
    const inRange = data.filter(r => r.result >= 70 && r.result <= 180).length;
    const tir = ((inRange / data.length) * 100).toFixed(0);

    avgEl.textContent = `${avg} mg/dL`;
    tirEl.textContent = `${tir}%`;
    countEl.textContent = data.length;
}

// --- START ---
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});
