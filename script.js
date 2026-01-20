let glucoseData = []; 
const glucoseForm = document.getElementById('glucoseForm');
const dataTableBody = document.querySelector('#dataTable tbody');

// Zmienna przechowująca aktualny filtr (domyślnie 24h)
let currentFilter = '24h'; 

// Granice normy
const TARGET_RANGE_MIN = 70;
const TARGET_RANGE_MAX = 180;

// =======================================================================
// 1. OBSŁUGA DANYCH
// =======================================================================
function saveDataToLocalStorage() {
    localStorage.setItem('glucoseRecords', JSON.stringify(glucoseData));
}

function loadDataFromLocalStorage() {
    const storedData = localStorage.getItem('glucoseRecords');
    if (storedData) {
        glucoseData = JSON.parse(storedData);
    }
}

// =======================================================================
// 2. OBSŁUGA FORMULARZA
// =======================================================================
glucoseForm.addEventListener('submit', function(e) {
    e.preventDefault(); 

    const result = parseInt(document.getElementById('result').value);
    const time = document.getElementById('time').value;
    const category = document.getElementById('category').value;
    const insulin = document.getElementById('insulin').value ? parseInt(document.getElementById('insulin').value) : 0;
    const carbs = document.getElementById('carbs').value ? parseFloat(document.getElementById('carbs').value) : 0;

    const newRecord = { result, time, category, insulin, carbs };

    glucoseData.push(newRecord);
    saveDataToLocalStorage(); 
    refreshViews(); 
    
    glucoseForm.reset();
    setTimeDefaults(); 
});

function setTimeDefaults() {
    const now = new Date();
    // Korekta strefy czasowej dla input datetime-local
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('time').value = now.toISOString().slice(0, 16);
}

// =======================================================================
// 3. LOGIKA FILTROWANIA
// =======================================================================
function getFilteredData() {
    // Sortowanie zawsze chronologiczne przed filtrowaniem
    glucoseData.sort((a, b) => new Date(a.time) - new Date(b.time));

    if (currentFilter === 'all') return glucoseData;

    const now = new Date();
    let hoursToSubtract = 24;

    if (currentFilter === '7d') hoursToSubtract = 168; // 7 dni * 24h
    if (currentFilter === '30d') hoursToSubtract = 720; // 30 dni * 24h

    const cutoffTime = now.getTime() - (hoursToSubtract * 60 * 60 * 1000);
    
    return glucoseData.filter(record => new Date(record.time).getTime() > cutoffTime);
}

// Funkcja obsługująca kliknięcie przycisku
window.setFilter = function(filterType, btnElement) {
    currentFilter = filterType;
    
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    refreshViews();
}

function refreshViews() {
    const dataToShow = getFilteredData();
    updateTable(dataToShow);
    updateMetrics(dataToShow);
}

// =======================================================================
// 4. GENEROWANIE TABELI
// =======================================================================
function updateTable(data) {
    dataTableBody.innerHTML = ''; 
    
    // Do tabeli chcemy najnowsze na górze, więc odwracamy kopię tablicy
    const sortedForTable = [...data].reverse(); 

    if (sortedForTable.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Brak danych w tym okresie</td></tr>';
        return;
    }

    sortedForTable.forEach(record => {
        const row = dataTableBody.insertRow();
        
        // Kolorowanie wyniku
        let colorClass = 'normal';
        if (record.result < TARGET_RANGE_MIN) colorClass = 'hypo'; 
        else if (record.result > TARGET_RANGE_MAX) colorClass = 'hyper'; 

        // Formatowanie daty
        const date = new Date(record.time);
        const dateStr = date.toLocaleString('pl-PL', { month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'});

        row.insertCell().textContent = dateStr;

        const resultCell = row.insertCell();
        resultCell.textContent = record.result;
        resultCell.classList.add(colorClass);

        row.insertCell().textContent = record.category;
        row.insertCell().textContent = record.insulin || '-';
        row.insertCell().textContent = record.carbs || '-';
    });
}

// =======================================================================
// 5. OBLICZANIE STATYSTYK
// =======================================================================
function updateMetrics(data) {
    const avgEl = document.getElementById('avg-glucose');
    const tirEl = document.getElementById('time-in-range');
    const countEl = document.getElementById('count-glucose');

    if (data.length === 0) {
        avgEl.textContent = '--';
        tirEl.textContent = '--';
        countEl.textContent = '0';
        return;
    }

    // Średnia
    const total = data.reduce((sum, record) => sum + record.result, 0);
    const average = (total / data.length).toFixed(0);

    // TIR (Time In Range)
    const inRangeCount = data.filter(record => 
        record.result >= TARGET_RANGE_MIN && record.result <= TARGET_RANGE_MAX
    ).length;
    const tirPercentage = ((inRangeCount / data.length) * 100).toFixed(0);

    avgEl.textContent = `${average} mg/dL`;
    tirEl.textContent = `${tirPercentage}%`;
    countEl.textContent = data.length;
}

// =======================================================================
// 6. START
// =======================================================================
document.addEventListener('DOMContentLoaded', function() {
    loadDataFromLocalStorage();
    setTimeDefaults();
    refreshViews(); 
});
