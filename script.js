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

function getFilteredData()
