let glucoseData = []; 
const glucoseForm = document.getElementById('glucoseForm');
const dataTableBody = document.querySelector('#dataTable tbody');
let myChart; // Zmienna do przechowywania instancji wykresu

// Ustawienia zakresów (mg/dL)
const TARGET_RANGE_MIN = 70;
const TARGET_RANGE_MAX = 180;

// =======================================================================
// 2. FUNKCJE OBSŁUGI DANYCH (localStorage)
// =======================================================================

function saveDataToLocalStorage() {
    localStorage.setItem('glucoseRecords', JSON.stringify(glucoseData));
}

function loadDataFromLocalStorage() {
    const storedData = localStorage.getItem('glucoseRecords');
    if (storedData) {
        glucoseData = JSON.parse(storedData);
        // Sortowanie danych od najstarszych do najnowszych (lepsze dla wykresów)
        glucoseData.sort((a, b) => new Date(a.time) - new Date(b.time));
    }
}

// =======================================================================
// 3. OBSŁUGA FORMULARZA
// =======================================================================

glucoseForm.addEventListener('submit', function(e) {
    e.preventDefault(); 

    const result = parseInt(document.getElementById('result').value);
    const time = document.getElementById('time').value;
    const category = document.getElementById('category').value;
    const insulin = document.getElementById('insulin').value ? parseInt(document.getElementById('insulin').value) : 0;
    const carbs = document.getElementById('carbs').value ? parseFloat(document.getElementById('carbs').value) : 0;

    const newRecord = {
        result: result,
        time: time,
        category: category,
        insulin: insulin,
        carbs: carbs
    };

    // Dodajemy nowy rekord, a następnie sortujemy całą tablicę
    glucoseData.push(newRecord);
    glucoseData.sort((a, b) => new Date(a.time) - new Date(b.time));
    
    saveDataToLocalStorage(); 
    
    // Aktualizacja widoku
    updateTable();
    updateMetrics();
    drawChart();

    // Czyszczenie formularza
    glucoseForm.reset();
    setTimeDefaults(); 
});


// =======================================================================
// 4. AKTUALIZACJA WIDOKU
// =======================================================================

function setTimeDefaults() {
    const now = new Date();
    // Ustawia domyślny czas na ten moment
    const formattedDate = now.toISOString().slice(0, 16); 
    document.getElementById('time').value = formattedDate;
}

function updateTable() {
    dataTableBody.innerHTML = ''; 

    // Odwracamy kolejność, aby najnowsze były na górze tabeli (wizualnie)
    const sortedForTable = [...glucoseData].reverse(); 

    sortedForTable.forEach(record => {
        const row = dataTableBody.insertRow();
        
        // Klasyfikacja kolorystyczna
        let colorClass = 'normal';
        if (record.result < TARGET_RANGE_MIN) {
            colorClass = 'hypo'; 
        } else if (record.result > TARGET_RANGE_MAX) {
            colorClass = 'hyper'; 
        }

        const date = new Date(record.time);
        row.insertCell().textContent = date.toLocaleString('pl-PL');

        const resultCell = row.insertCell();
        resultCell.textContent = record.result;
        resultCell.classList.add(colorClass);

        row.insertCell().textContent = record.category;
        row.insertCell().textContent = record.insulin;
        row.insertCell().textContent = record.carbs;
    });
}

function updateMetrics() {
    if (glucoseData.length === 0) {
        document.getElementById('avg-glucose').textContent = '--';
        document.getElementById('time-in-range').textContent = '--';
        return;
    }

    // Obliczenia
    const total = glucoseData.reduce((sum, record) => sum + record.result, 0);
    const average = (total / glucoseData.length).toFixed(1);

    // Czas w Zakresie (Time In Range, TIR)
    const inRangeCount = glucoseData.filter(record => 
        record.result >= TARGET_RANGE_MIN && record.result <= TARGET_RANGE_MAX
    ).length;
    const tirPercentage = ((inRangeCount / glucoseData.length) * 100).toFixed(1);

    // Wyświetlanie
    document.getElementById('avg-glucose').textContent = `${average} mg/dL`;
    document.getElementById('time-in-range').textContent = `${tirPercentage}%`;
}


// =======================================================================
// 5. WIZUALIZACJA (Chart.js)
// =======================================================================

function drawChart() {
    // 1. Zniszcz stary wykres, jeśli istnieje
    if (myChart) {
        myChart.destroy();
    }

    // 2. Przygotowanie danych do wykresu (wykres z ostatnich 24h dla przykładu)
    const now = new Date();
    const oneDayAgo = now.getTime() - (24 * 60 * 60 * 1000);

    const filteredData = glucoseData.filter(record => new Date(record.time).getTime() > oneDayAgo);
    
    const labels = filteredData.map(record => new Date(record.time).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }));
    const dataPoints = filteredData.map(record => record.result);

    const ctx = document.getElementById('glucoseChart').getContext('2d');

    // 3. Konfiguracja wykresu Chart.js
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Poziom Glikemii',
                data: dataPoints,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Glikemia (mg/dL)'
                    },
                    // Dodanie linii referencyjnych dla zakresu docelowego (TARGET_RANGE)
                    min: 50, // stała minimalna wartość na osi Y
                    max: 300, // stała maksymalna wartość na osi Y
                    ticks: {
                        stepSize: 50
                    },
                    border: {
                        display: false
                    },
                    // Strefy kolorystyczne
                    // Wykorzystuje się Chart.js Plugin 'Annotation' dla lepszych stref, ale zrobimy to prosto:
                    // Zaznaczenie strefy docelowej (zielonej)
                    
                    // Linie referencyjne
                    // Source: https://www.chartjs.org/docs/latest/axes/styling.html#grid-line-styling
                    grid: {
                        drawOnChartArea: true,
                        // Linia dla górnej granicy normy
                        color: (context) => {
                            if (context.tick.value === TARGET_RANGE_MAX) return 'red';
                            if (context.tick.value === TARGET_RANGE_MIN) return 'red';
                            return '#e9ecef';
                        },
                        lineWidth: (context) => {
                             if (context.tick.value === TARGET_RANGE_MAX || context.tick.value === TARGET_RANGE_MIN) return 2;
                            return 1;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

// =======================================================================
// 6. INICJALIZACJA APLIKACJI
// =======================================================================

document.addEventListener('DOMContentLoaded', function() {
    loadDataFromLocalStorage();
    setTimeDefaults(); 
    updateMetrics(); // Zaktualizuj metryki przed tabelą
    updateTable(); 
    drawChart(); // Narysuj wykres przy starcie
});
