let glucoseData = []; 
const glucoseForm = document.getElementById('glucoseForm');
const dataTableBody = document.querySelector('#dataTable tbody');
let currentFilter = '24h'; 
const TARGET_RANGE_MIN = 70;
const TARGET_RANGE_MAX = 180;

// --- 1. DANE ---
function saveDataToLocalStorage() {
    localStorage.setItem('glucoseRecords', JSON.stringify(glucoseData));
}

function loadDataFromLocalStorage() {
    const storedData = localStorage.getItem('glucoseRecords');
    if (storedData) {
        glucoseData = JSON.parse(storedData);
    }
}

// --- 2. FORMULARZ ---
glucoseForm.addEventListener('submit', function(e) {
    e.preventDefault(); 
    const result = parseInt(document.getElementById('result').value);
    const time = document.getElementById('time').value;
    const category = document.getElementById('category').value;
    const insulin = document.getElementById('insulin').value ? document.getElementById('insulin').value : '-';
    const carbs = document.getElementById('carbs').value ? document.getElementById('carbs').value : '-';

    const newRecord = { result, time, category, insulin, carbs };
    glucoseData.push(newRecord);
    saveDataToLocalStorage(); 
    refreshViews(); 
    
    glucoseForm.reset();
    setTimeDefaults(); 
});

function setTimeDefaults() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('time').value = now.toISOString().slice(0, 16);
}

// --- 3. FILTRY ---
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

// --- 4. TABELA (Zoptymalizowana pod wąski widok) ---
function updateTable(data) {
    dataTableBody.innerHTML = ''; 
    const sorted = [...data].reverse(); 

    if (sorted.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px">Brak danych</td></tr>';
        return;
    }

    sorted.forEach(rec => {
        const row = dataTableBody.insertRow();
        
        let color = 'normal';
        if (rec.result < TARGET_RANGE_MIN) color = 'hypo'; 
        else if (rec.result > TARGET_RANGE_MAX) color = 'hyper'; 

        const d = new Date(rec.time);
        
        // Kolumna 1: Data i Godzina (pod sobą)
        row.insertCell().innerHTML = `
            <div style="font-weight:bold">${d.toLocaleDateString('pl-PL')}</div>
            <div style="font-size:0.85em; color:#777">${d.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})}</div>
        `;

        // Kolumna 2: Wynik
        const resCell = row.insertCell();
        resCell.textContent = rec.result;
        resCell.className = color;
        resCell.style.fontSize = '1.2em';

        // Kolumna 3: Info (Kategoria + Ins/WW)
        row.insertCell().innerHTML = `
            <div style="font-size:0.9em">${rec.category}</div>
            <div style="font-size:0.8em; color:#555">Ins: ${rec.insulin} | WW: ${rec.carbs}</div>
        `;
    });
}

// --- 5. STATYSTYKI ---
function updateMetrics(data) {
    if (data.length === 0) {
        document.getElementById('avg-glucose').textContent = '--';
        document.getElementById('time-in-range').textContent = '--';
        document.getElementById('count-glucose').textContent = '0';
        return;
    }
    const total = data.reduce((s, r) => s + parseInt(r.result), 0);
    const avg = (total / data.length).toFixed(0);
    const inRange = data.filter(r => r.result >= 70 && r.result <= 180).length;
    const tir = ((inRange / data.length) * 100).toFixed(0);

    document.getElementById('avg-glucose').textContent = `${avg} mg/dL`;
    document.getElementById('time-in-range').textContent = `${tir}%`;
    document.getElementById('count-glucose').textContent = data.length;
}

document.addEventListener('DOMContentLoaded', () => {
    loadDataFromLocalStorage();
    setTimeDefaults();
    refreshViews();
});
