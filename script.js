let glucoseData = []; 
const glucoseForm = document.getElementById('glucoseForm');
const dataTableBody = document.querySelector('#dataTable tbody');
let myChart; 

// Zmienna przechowująca aktualny filtr (domyślnie 24h)
let currentFilter = '24h'; 

const TARGET_RANGE_MIN = 70;
const TARGET_RANGE_MAX = 180;

// =======================================================================
// 1. OBSŁUGA LOCALSTORAGE
// =======================================================================
function saveDataToLocalStorage() {
    localStorage.setItem('glucoseRecords', JSON.stringify(glucoseData));
}

function loadDataFromLocalStorage() {
    const storedData = localStorage.getItem('glucoseRecords');
    if (storedData) {
        glucoseData = JSON.parse(storedData);
        glucoseData.sort((a, b) => new Date(a.time) - new Date(b.time));
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
    glucoseData.sort((a, b) => new Date(a.time) - new Date(b.time));
    
    saveDataToLocalStorage(); 
    refreshViews(); // Odśwież wszystko
    
    glucoseForm.reset();
    setTimeDefaults(); 
});

function setTimeDefaults() {
    const now = new Date();
    // Przesunięcie czasu dla strefy PL, aby input datetime-local działał poprawnie
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('time').value = now.toISOString().slice(0, 16);
}

// =======================================================================
// 3. FILTROWANIE DANYCH
// =======================================================================
function getFilteredData() {
    if (currentFilter === 'all') return glucoseData;

    const now = new Date();
    let hoursToSubtract = 24;

    if (currentFilter === '7d') hoursToSubtract = 168; // 7 * 24
    if (currentFilter === '30d') hoursToSubtract = 720; // 30 * 24

    const cutoffTime = now.getTime() - (hoursToSubtract * 60 * 60 * 1000);
    
    return glucoseData.filter(record => new Date(record.time).getTime() > cutoffTime);
}

// Funkcja wywoływana po kliknięciu przycisku filtra
window.setFilter = function(filterType, btnElement) {
    currentFilter = filterType;
    
    // Obsługa klas CSS przycisków
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    refreshViews();
}

function refreshViews() {
    const dataToShow = getFilteredData();
    updateTable(dataToShow);
    updateMetrics(dataToShow);
    drawChart(dataToShow);
}

// =======================================================================
// 4. AKTUALIZACJA TABELI
// =======================================================================
function updateTable(data) {
    dataTableBody.innerHTML = ''; 
    
    // Kopia i odwrócenie do tabeli (najnowsze na górze)
    const sortedForTable = [...data].reverse(); 

    if (sortedForTable.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Brak danych w tym okresie</td></tr>';
        return;
    }

    sortedForTable.forEach(record => {
        const row = dataTableBody.insertRow();
        
        let colorClass = 'normal';
        if (record.result < TARGET_RANGE_MIN) colorClass = 'hypo'; 
        else if (record.result > TARGET_RANGE_MAX) colorClass = 'hyper'; 

        const date = new Date(record.time);
        row.insertCell().textContent = date.toLocaleString('pl-PL', { month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'});

        const resultCell = row.insertCell();
        resultCell.textContent = record.result;
        resultCell.classList.add(colorClass);

        row.insertCell().textContent = record.category;
        row.insertCell().textContent = record.insulin || '-';
        row.insertCell().textContent = record.carbs || '-';
    });
}

// =======================================================================
// 5. AKTUALIZACJA STATYSTYK
// =======================================================================
function updateMetrics(data) {
    if (data.length === 0) {
        document.getElementById('avg-glucose').textContent = '--';
        document.getElementById('time-in-range').textContent = '--';
        return;
    }

    const total = data.reduce((sum, record) => sum + record.result, 0);
    const average = (total / data.length).toFixed(0);

    const inRangeCount = data.filter(record => 
        record.result >= TARGET_RANGE_MIN && record.result <= TARGET_RANGE_MAX
    ).length;
    const tirPercentage = ((inRangeCount / data.length) * 100).toFixed(0);

    document.getElementById('avg-glucose').textContent = `${average} mg/dL`;
    document.getElementById('time-in-range').textContent = `${tirPercentage}%`;
}

// =======================================================================
// 6. WYKRES (Chart.js)
// =======================================================================
function drawChart(data) {
    const ctx = document.getElementById('glucoseChart').getContext('2d');

    // Przygotowanie danych
    const labels = data.map(record => new Date(record.time).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' }));
    const dataPoints = data.map(record => record.result);

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Glikemia',
                data: dataPoints,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 40,
                    suggestedMax: 300,
                    grid: {
                        color: (ctx) => {
                            if (ctx.tick.value === 70 || ctx.tick.value === 180) return 'rgba(46, 204, 113, 0.5)';
                            return '#f0f0f0';
                        },
                        lineWidth: (ctx) => {
                            if (ctx.tick.value === 70 || ctx.tick.value === 180) return 2;
                            return 1;
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// =======================================================================
// 7. START
// =======================================================================
document.addEventListener('DOMContentLoaded', function() {
    loadDataFromLocalStorage();
    setTimeDefaults();
    
    // Jeśli baza jest pusta, nic nie dodajemy, czekamy na dane użytkownika
    
    refreshViews(); // Uruchomienie z domyślnym filtrem 24h
});
