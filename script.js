// ==========================================
// 1. ZMIENNE I KONFIGURACJA
// ==========================================
let glucoseData = []; 
let userProfile = null; // Tutaj będziemy trzymać dane pacjenta

const glucoseForm = document.getElementById('glucoseForm');
const loginForm = document.getElementById('loginForm');
const dataTableBody = document.querySelector('#dataTable tbody');
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const headerSubtitle = document.getElementById('header-subtitle');

let currentFilter = '24h';
const TARGET_RANGE_MIN = 70;
const TARGET_RANGE_MAX = 180;

// ==========================================
// 2. OBSŁUGA LOGOWANIA I SESJI
// ==========================================

// Sprawdzamy na starcie, czy użytkownik już istnieje w pamięci
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
    
    // Aktualizujemy nagłówek strony o imię i typ cukrzycy
    if (userProfile) {
        headerSubtitle.textContent = `Pacjent: ${userProfile.name} | ${userProfile.diabetesType}`;
    }
    
    // Po zalogowaniu ładujemy dane i odświeżamy widok
    loadDataFromLocalStorage();
    setTimeDefaults();
    refreshViews();
}

// Logika przycisku "Zaloguj się"
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const diabetesType = document.getElementById('diabetesType').value;
        // Hasło jest tutaj tylko "pro forma" (symulacja), w prawdziwej apce wysyłalibyśmy je na serwer.

        if (username && diabetesType) {
            userProfile = {
                name: username,
                diabetesType: diabetesType
            };
            
            // Zapisz profil w przeglądarce na stałe
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
            
            showAppScreen();
        }
    });
}

// Logika przycisku "Wyloguj się"
document.getElementById('logout-btn').addEventListener('click', function() {
    if(confirm("Czy na pewno chcesz się wylogować?")) {
        localStorage.removeItem('userProfile'); // Usuń sesję użytkownika
        userProfile = null;
        location.reload(); // Odśwież stronę, by wrócić do logowania
    }
});

// ==========================================
// 3. OBSŁUGA BAZY DANYCH (POMIARY)
// ==========================================

function saveDataToLocalStorage() {
    localStorage.setItem('glucoseRecords', JSON.stringify(glucoseData));
}

function loadDataFromLocalStorage() {
    const storedData = localStorage.getItem('glucoseRecords');
    if (storedData) {
        glucoseData = JSON.parse(storedData);
    }
}

// ==========================================
// 4. OBSŁUGA DODAWANIA WYNIKU
// ==========================================

if (glucoseForm) {
    glucoseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const result = parseInt(document.getElementById('result').value);
        const time = document.getElementById('time').value;
        const category = document.getElementById('category').value;
        
        const insulinVal = document.getElementById('insulin').value;
        const carbsVal = document.getElementById('carbs').value;
        const insulin = insulinVal !== "" ? insulinVal : "-";
        const carbs = carbsVal !== "" ? carbsVal : "-";

        const newRecord = { 
            id: Date.now(), 
            result: result, 
            time: time, 
            category: category, 
            insulin: insulin, 
            carbs: carbs 
        };

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

// ==========================================
// 5. FILTROWANIE I WIDOKI
// ==========================================

function getFilteredData() {
    glucoseData.sort((a, b) => new Date(a.time) - new Date(b.time));

    if (currentFilter === 'all') return glucoseData;

    const now = new Date();
    let hoursToSubtract = 24;

    if (currentFilter === '7d') hoursToSubtract = 168; 
    if (currentFilter === '30d') hoursToSubtract = 720; 

    const cutoffTime = now.getTime() - (hoursToSubtract * 60 * 60 * 1000);
    return glucoseData.filter(record => new Date(record.time).getTime() > cutoffTime);
}

window.setFilter = function(filterType, btnElement) {
    currentFilter = filterType;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    refreshViews();
}

function refreshViews() {
    const dataToShow = getFilteredData();
    updateTable(dataToShow);
    updateMetrics(dataToShow);
}

function updateTable(data) {
    if (!dataTableBody) return;
    dataTableBody.innerHTML = ''; 
    const sortedForDisplay = [...data].reverse(); 

    if (sortedForDisplay.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#777;">Brak pomiarów.</td></tr>';
        return;
    }

    sortedForDisplay.forEach(record => {
        const row = dataTableBody.insertRow();
        
        let colorClass = 'normal';
        if (record.result < TARGET_RANGE_MIN) colorClass = 'hypo'; 
        else if (record.result > TARGET_RANGE_MAX) colorClass = 'hyper'; 

        const d = new Date(record.time);
        
        const cellDate = row.insertCell();
        cellDate.innerHTML = `
            <div style="font-weight:600; color:#333;">${d.toLocaleDateString('pl-PL')}</div>
            <div style="font-size:0.85em; color:#888;">${d.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})}</div>
        `;

        const cellResult = row.insertCell();
        cellResult.textContent = record.result;
        cellResult.className = colorClass; 
        cellResult.style.fontSize = '1.3em'; 

        const cellDetails = row.insertCell();
        cellDetails.innerHTML = `
            <div style="font-size:0.9em; margin-bottom:2px;">${record.category}</div>
            <div style="font-size:0.8em; color:#666;">
                Ins: <b>${record.insulin}</b> | WW: <b>${record.carbs}</b>
            </div>
        `;
    });
}

function updateMetrics(data) {
    const avgEl = document.getElementById('avg-glucose');
    const tirEl = document.getElementById('time-in-range');
    const countEl = document.getElementById('count-glucose');

    if (!avgEl) return;

    if (data.length === 0) {
        avgEl.textContent = '--';
        tirEl.textContent = '--';
        countEl.textContent = '0';
        return;
    }

    const total = data.reduce((sum, r) => sum + parseInt(r.result), 0);
    const average = (total / data.length).toFixed(0);
    
    const inRangeCount = data.filter(r => r.result >= TARGET_RANGE_MIN && r.result <= TARGET_RANGE_MAX).length;
    const tirPercentage = ((inRangeCount / data.length) * 100).toFixed(0);

    avgEl.textContent = `${average} mg/dL`;
    tirEl.textContent = `${tirPercentage}%`;
    countEl.textContent = data.length;
}

// ==========================================
// 6. START APLIKACJI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Najpierw sprawdzamy, czy ktoś jest zalogowany
    checkSession();
});
