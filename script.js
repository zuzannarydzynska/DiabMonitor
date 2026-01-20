// --- ZMIENNE GLOBALNE ---
let glucoseData = []; 
const glucoseForm = document.getElementById('glucoseForm');
const dataTableBody = document.querySelector('#dataTable tbody');
let currentFilter = '24h'; // Domyślny filtr

// Zakresy normy (do kolorowania wyników)
const TARGET_RANGE_MIN = 70;
const TARGET_RANGE_MAX = 180;

// =======================================================================
// 1. OBSŁUGA BAZY DANYCH (LocalStorage)
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
// 2. OBSŁUGA FORMULARZA (DODAWANIE POMIARU)
// =======================================================================
glucoseForm.addEventListener('submit', function(e) {
    e.preventDefault(); // Zatrzymaj przeładowanie strony
    
    // Pobieranie danych z pól
    const result = parseInt(document.getElementById('result').value);
    const time = document.getElementById('time').value;
    const category = document.getElementById('category').value;
    
    // Obsługa pól opcjonalnych (jeśli puste, wstaw myślnik)
    let insulinVal = document.getElementById('insulin').value;
    let carbsVal = document.getElementById('carbs').value;
    
    // Jeśli użytkownik nic nie wpisał, wstawiamy "-"
    const insulin = insulinVal !== "" ? insulinVal : "-";
    const carbs = carbsVal !== "" ? carbsVal : "-";

    // Tworzenie obiektu z nowym pomiarem
    const newRecord = { 
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
    
    // Wyczyszczenie formularza i ustawienie aktualnego czasu
    glucoseForm.reset();
    setTimeDefaults(); 
});

// Funkcja ustawiająca domyślną datę na "Teraz"
function setTimeDefaults() {
    const now = new Date();
    // Sztuczka, aby input datetime-local pokazał poprawną godzinę w strefie PL
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('time').value = now.toISOString().slice(0, 16);
}

// =======================================================================
// 3. LOGIKA FILTROWANIA (24h / 7 dni / 30 dni)
// =======================================================================
function getFilteredData() {
    // Najpierw sortujemy dane chronologicznie
    glucoseData.sort((a, b) => new Date(a.time) - new Date(b.time));

    // Jeśli wybrano "Wszystkie", zwracamy całą tablicę
    if (currentFilter === 'all') return glucoseData;

    const now = new Date();
    let hoursToSubtract = 24;

    if (currentFilter === '7d') hoursToSubtract = 168; // 7 * 24h
    if (currentFilter === '30d') hoursToSubtract = 720; // 30 * 24h

    // Obliczamy datę graniczną (np. teraz minus 24 godziny)
    const cutoffTime = now.getTime() - (hoursToSubtract * 60 * 60 * 1000);
    
    // Zwracamy tylko te rekordy, które są nowsze niż data graniczna
    return glucoseData.filter(record => new Date(record.time).getTime() > cutoffTime);
}

// Ta funkcja jest wywoływana przez przyciski w HTML (onclick)
window.setFilter = function(filterType, btnElement) {
    currentFilter = filterType;
    
    // Zmieniamy wygląd przycisków (usuwamy klasę active ze wszystkich, dodajemy do klikniętego)
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    // Odświeżamy tabelę i wyniki
    refreshViews();
}

function refreshViews() {
    const dataToShow = getFilteredData();
    updateTable(dataToShow);
    updateMetrics(dataToShow);
}

// =======================================================================
// 4. GENEROWANIE TABELI HTML
// =======================================================================
function updateTable(data) {
    dataTableBody.innerHTML = ''; // Czyścimy obecną zawartość tabeli
    
    // Robimy kopię i odwracamy, żeby najnowsze pomiary były na górze listy
    const sortedForDisplay = [...data].reverse(); 

    // Jeśli nie ma danych w tym okresie
    if (sortedForDisplay.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#777;">Brak pomiarów w wybranym okresie.</td></tr>';
        return;
    }

    // Pętla po każdym pomiarze
    sortedForDisplay.forEach(record => {
        const row = dataTableBody.insertRow();
        
        // Ustalenie koloru wyniku (klasa CSS)
        let colorClass = 'normal';
        if (record.result < TARGET_RANGE_MIN) colorClass = 'hypo'; 
        else if (record.result > TARGET_RANGE_MAX) colorClass = 'hyper'; 

        const dateObj = new Date(record.time);
        
        // KOLUMNA 1: Data i Godzina
        // Używamy HTML wewnątrz komórki, aby ładnie sformatować datę pod godziną
        row.insertCell().innerHTML = `
            <div style="font-weight:600; color:#333;">${dateObj.toLocaleDateString('pl-PL')}</div>
            <div style="font-size:0.85em; color:#888;">${dateObj.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})}</div>
        `;

        // KOLUMNA 2: Wynik
        const resultCell = row.insertCell();
        resultCell.textContent = record.result;
        resultCell.classList.add(colorClass); // Dodajemy kolor (zielony/czerwony)
        resultCell.style.fontSize = '1.3em'; 

        // KOLUMNA 3: Szczegóły (Kategoria + Insulina/WW)
        row.insertCell().innerHTML = `
            <div style="font-size:0.9em; margin-bottom:2px;">${record.category}</div>
            <div style="font-size:0.8em; color:#666;">
                Ins: <b>${record.insulin}</b> | WW: <b>${record.carbs}</b>
            </div>
        `;
    });
}

// =======================================================================
// 5. OBLICZANIE STATYSTYK (Średnia, TIR)
// =======================================================================
function updateMetrics(data) {
    const avgEl = document.getElementById('avg-glucose');
    const tirEl = document.getElementById('time-in-range');
    const countEl = document.getElementById('count-glucose');

    // Jeśli brak danych, wyświetlamy kreski
    if (data.length === 0) {
        avgEl.textContent = '--';
        tirEl.textContent = '--';
        countEl.textContent = '0';
        return;
    }

    // Obliczanie średniej
    const total = data.reduce((sum, record) => sum + parseInt(record.result), 0);
    const average = (total / data.length).toFixed(0);
    
    // Obliczanie TIR (Time In Range - ile % wyników jest w normie)
    const inRangeCount = data.filter(r => r.result >= TARGET_RANGE_MIN && r.result <= TARGET_RANGE_MAX).length;
    const tirPercentage = ((inRangeCount / data.length) * 100).toFixed(0);

    // Wyświetlanie wyników
    avgEl.textContent = `${average} mg/dL`;
    tirEl.textContent = `${tirPercentage}%`;
    countEl.textContent = data.length;
}

// =======================================================================
// 6. URUCHOMIENIE NA START
// =======================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromLocalStorage(); // Wczytaj dane z pamięci przeglądarki
    setTimeDefaults();          // Ustaw datę w formularzu
    refreshViews();             // Wyświetl tabelę
});
