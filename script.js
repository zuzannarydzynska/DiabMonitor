// REJESTRACJA
document.getElementById("regBtn").addEventListener("click", function () {
    const user = document.getElementById("regUser").value;
    const pass = document.getElementById("regPass").value;
    const msg = document.getElementById("msg");

    if (!user || !pass) {
        msg.innerText = "Uzupełnij wszystkie pola";
        return;
    }

    const regex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

    if (!regex.test(pass)) {
        msg.innerText = "Hasło: min. 6 znaków, 1 duża litera i 1 cyfra";
        return;
    }

    localStorage.setItem("user", user);
    localStorage.setItem("pass", pass);

    msg.innerText = "Rejestracja OK";
});

// LOGOWANIE
document.getElementById("logBtn").addEventListener("click", function () {
    const user = document.getElementById("logUser").value;
    const pass = document.getElementById("logPass").value;
    const msg = document.getElementById("msg");

    if (
        user === localStorage.getItem("user") &&
        pass === localStorage.getItem("pass")
    ) {
        localStorage.setItem("logged", "true");
        window.location.href = "profile.html";
    } else {
        msg.innerText = "Błędne dane logowania";
    }
});


// ==========================================
// 1. ZMIENNE GLOBALNE I KONFIGURACJA
// ==========================================
let glucoseData = []; 
const glucoseForm = document.getElementById('glucoseForm');
const dataTableBody = document.querySelector('#dataTable tbody');
let currentFilter = '24h'; // Domyślny filtr na start

// Granice normy (do kolorowania wyników)
const TARGET_RANGE_MIN = 70;
const TARGET_RANGE_MAX = 180;

// ==========================================
// 2. OBSŁUGA BAZY DANYCH (LocalStorage)
// ==========================================

// Zapisywanie danych do pamięci przeglądarki
function saveDataToLocalStorage() {
    localStorage.setItem('glucoseRecords', JSON.stringify(glucoseData));
}

// Wczytywanie danych przy starcie
function loadDataFromLocalStorage() {
    const storedData = localStorage.getItem('glucoseRecords');
    if (storedData) {
        glucoseData = JSON.parse(storedData);
    }
}

// ==========================================
// 3. OBSŁUGA FORMULARZA
// ==========================================

if (glucoseForm) {
    glucoseForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Zapobiega odświeżeniu strony
        
        // Pobranie wartości z pól
        const resultInput = document.getElementById('result');
        const timeInput = document.getElementById('time');
        const categoryInput = document.getElementById('category');
        const insulinInput = document.getElementById('insulin');
        const carbsInput = document.getElementById('carbs');

        // Walidacja (czy elementy istnieją)
        if (!resultInput || !timeInput) return;

        const result = parseInt(resultInput.value);
        const time = timeInput.value;
        const category = categoryInput.value;
        
        // Obsługa pól opcjonalnych (jeśli puste, wstawiamy "-")
        const insulin = insulinInput.value !== "" ? insulinInput.value : "-";
        const carbs = carbsInput.value !== "" ? carbsInput.value : "-";

        // Tworzenie nowego rekordu
        const newRecord = { 
            id: Date.now(), // Unikalne ID
            result: result, 
            time: time, 
            category: category, 
            insulin: insulin, 
            carbs: carbs 
        };

        // Dodanie do tablicy i zapisanie
        glucoseData.push(newRecord);
        saveDataToLocalStorage(); 
        
        // Odświeżenie widoku
        refreshViews(); 
        
        // Reset formularza
        glucoseForm.reset();
        setTimeDefaults(); 
    });
}

// Ustawia aktualną datę i godzinę w polu formularza
function setTimeDefaults() {
    const timeInput = document.getElementById('time');
    if (timeInput) {
        const now = new Date();
        // Korekta strefy czasowej dla inputa datetime-local
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        timeInput.value = now.toISOString().slice(0, 16);
    }
}

// ==========================================
// 4. FILTROWANIE DANYCH
// ==========================================

function getFilteredData() {
    // 1. Sortowanie (od najstarszych do najnowszych dla logiki, potem odwrócimy do wyświetlania)
    glucoseData.sort((a, b) => new Date(a.time) - new Date(b.time));

    // 2. Jeśli filtr to "Wszystkie", zwracamy całość
    if (currentFilter === 'all') return glucoseData;

    // 3. Obliczanie zakresu czasu
    const now = new Date();
    let hoursToSubtract = 24; // Domyślnie 24h

    if (currentFilter === '7d') hoursToSubtract = 168; // 7 dni * 24h
    if (currentFilter === '30d') hoursToSubtract = 720; // 30 dni * 24h

    const cutoffTime = now.getTime() - (hoursToSubtract * 60 * 60 * 1000);
    
    // 4. Filtrowanie
    return glucoseData.filter(record => new Date(record.time).getTime() > cutoffTime);
}

// Funkcja przypisana do przycisków w HTML (musi być window.setFilter)
window.setFilter = function(filterType, btnElement) {
    currentFilter = filterType;
    
    // Zmiana klasy 'active' na przyciskach
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    refreshViews();
}

function refreshViews() {
    const dataToShow = getFilteredData();
    updateTable(dataToShow);
    updateMetrics(dataToShow);
}

// ==========================================
// 5. GENEROWANIE TABELI
// ==========================================

function updateTable(data) {
    if (!dataTableBody) return;

    dataTableBody.innerHTML = ''; // Czyścimy tabelę
    
    // Kopia i odwrócenie kolejności (najnowsze na górze)
    const sortedForDisplay = [...data].reverse(); 

    if (sortedForDisplay.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#777;">Brak pomiarów w tym okresie.</td></tr>';
        return;
    }

    sortedForDisplay.forEach(record => {
        const row = dataTableBody.insertRow();
        
        // Kolorowanie wyniku
        let colorClass = 'normal';
        if (record.result < TARGET_RANGE_MIN) colorClass = 'hypo'; 
        else if (record.result > TARGET_RANGE_MAX) colorClass = 'hyper'; 

        const d = new Date(record.time);
        
        // Kolumna 1: Data
        const cellDate = row.insertCell();
        cellDate.innerHTML = `
            <div style="font-weight:600; color:#333;">${d.toLocaleDateString('pl-PL')}</div>
            <div style="font-size:0.85em; color:#888;">${d.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})}</div>
        `;

        // Kolumna 2: Wynik
        const cellResult = row.insertCell();
        cellResult.textContent = record.result;
        cellResult.className = colorClass; // Dodaje klasę CSS (np. .hypo)
        cellResult.style.fontSize = '1.3em'; 

        // Kolumna 3: Szczegóły
        const cellDetails = row.insertCell();
        cellDetails.innerHTML = `
            <div style="font-size:0.9em; margin-bottom:2px;">${record.category}</div>
            <div style="font-size:0.8em; color:#666;">
                Ins: <b>${record.insulin}</b> | WW: <b>${record.carbs}</b>
            </div>
        `;
    });
}

// ==========================================
// 6. STATYSTYKI
// ==========================================

function updateMetrics(data) {
    const avgEl = document.getElementById('avg-glucose');
    const tirEl = document.getElementById('time-in-range');
    const countEl = document.getElementById('count-glucose');

    if (!avgEl || !tirEl || !countEl) return;

    if (data.length === 0) {
        avgEl.textContent = '--';
        tirEl.textContent = '--';
        countEl.textContent = '0';
        return;
    }

    // Średnia
    const total = data.reduce((sum, r) => sum + parseInt(r.result), 0);
    const average = (total / data.length).toFixed(0);
    
    // TIR (Time In Range)
    const inRangeCount = data.filter(r => r.result >= TARGET_RANGE_MIN && r.result <= TARGET_RANGE_MAX).length;
    const tirPercentage = ((inRangeCount / data.length) * 100).toFixed(0);

    avgEl.textContent = `${average} mg/dL`;
    tirEl.textContent = `${tirPercentage}%`;
    countEl.textContent = data.length;
}

// ==========================================
// 7. START APLIKACJI
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadDataFromLocalStorage();
    setTimeDefaults();
    refreshViews();
});




