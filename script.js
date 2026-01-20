// ==========================================
// 1. ZMIENNE GLOBALNE
// ==========================================
let currentUser = null; // Przechowuje obiekt zalogowanego użytkownika
let glucoseData = [];   // Pomiary AKTUALNEGO użytkownika
const usersDBKey = 'diabMonitor_users_v2'; // Klucz bazy danych w LocalStorage

const glucoseForm = document.getElementById('glucoseForm');
const dataTableBody = document.querySelector('#dataTable tbody');
let currentFilter = '24h';

const TARGET_RANGE_MIN = 70;
const TARGET_RANGE_MAX = 180;

// ==========================================
// 2. SYSTEM UŻYTKOWNIKÓW (Auth & JSON)
// ==========================================

// Pobiera wszystkich użytkowników z bazy
function getAllUsers() {
    const usersJSON = localStorage.getItem(usersDBKey);
    return usersJSON ? JSON.parse(usersJSON) : [];
}

// Zapisuje wszystkich użytkowników do bazy
function saveAllUsers(usersArray) {
    localStorage.setItem(usersDBKey, JSON.stringify(usersArray));
}

// Walidacja hasła (Twoje wymagania)
function validatePassword(pass) {
    // Min 8 znaków, min 1 duża litera (A-Z), min 1 cyfra (0-9)
    const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(pass);
}

// REJESTRACJA
document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value;

    if (!validatePassword(pass)) {
        alert("Hasło musi mieć min. 8 znaków, 1 wielką literę i 1 cyfrę!");
        return;
    }

    const users = getAllUsers();
    if (users.find(u => u.username === user)) {
        alert("Taki użytkownik już istnieje!");
        return;
    }

    // Tworzenie struktury JSON użytkownika
    const newUser = {
        username: user,
        password: pass, // W prawdziwej aplikacji hasła się hashuje!
        measurements: [] // Pusta tablica na start
    };

    users.push(newUser);
    saveAllUsers(users);
    
    alert("Konto utworzone! Możesz się zalogować.");
    switchAuthView('login');
    document.getElementById('registerForm').reset();
});

// LOGOWANIE
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const userInput = document.getElementById('loginUser').value.trim();
    const passInput = document.getElementById('loginPass').value;

    const users = getAllUsers();
    const foundUser = users.find(u => u.username === userInput && u.password === passInput);

    if (foundUser) {
        loginUser(foundUser);
    } else {
        alert("Błędny login lub hasło.");
    }
});

function loginUser(userObj) {
    currentUser = userObj;
    glucoseData = userObj.measurements || []; // Ładujemy dane JSON tego użytkownika
    
    // UI Update
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authBtn').innerHTML = '👤'; // Ikona profilu
    document.getElementById('welcomeMsg').style.display = 'block';
    document.getElementById('userNameDisplay').textContent = currentUser.username;
    
    // Wypełnienie pola JSON w profilu
    updateJsonDisplay();
    
    refreshViews(); // Odśwież tabelę i wykresy danymi użytkownika
}

function logout() {
    currentUser = null;
    glucoseData = [];
    document.getElementById('welcomeMsg').style.display = 'none';
    document.getElementById('loginForm').reset();
    refreshViews(); // Wyczyści widok
    alert("Wylogowano.");
    openAuthModal(); // Pokaż ekran logowania
    switchAuthView('login');
}

// Zapisywanie danych bieżącego użytkownika do "bazy"
function saveUserData() {
    if (!currentUser) return;
    
    currentUser.measurements = glucoseData; // Aktualizujemy lokalną tablicę
    
    // Pobieramy całą bazę, podmieniamy usera i zapisujemy
    const users = getAllUsers();
    const index = users.findIndex(u => u.username === currentUser.username);
    if (index !== -1) {
        users[index] = currentUser;
        saveAllUsers(users);
    }
    updateJsonDisplay();
}

function updateJsonDisplay() {
    if(currentUser) {
        // Pretty print JSON (wcięcie 2 spacje)
        document.getElementById('jsonDataBox').value = JSON.stringify(currentUser, null, 2);
    }
}

// ==========================================
// 3. OBSŁUGA MODALA (Widok)
// ==========================================

function openAuthModal() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'flex';
    
    if (currentUser) {
        switchAuthView('profile'); // Jeśli zalogowany, pokaż profil
    } else {
        switchAuthView('login'); // Jeśli nie, pokaż logowanie
    }
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function switchAuthView(viewName) {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('registerView').style.display = 'none';
    document.getElementById('profileView').style.display = 'none';

    if (viewName === 'login') document.getElementById('loginView').style.display = 'block';
    if (viewName === 'register') document.getElementById('registerView').style.display = 'block';
    if (viewName === 'profile') document.getElementById('profileView').style.display = 'block';
}

// Kliknięcie poza oknem zamyka modal
window.onclick = function(event) {
    const modal = document.getElementById('authModal');
    if (event.target == modal) {
        // Jeśli użytkownik nie jest zalogowany, nie zamykaj (wymuś logowanie)
        if(currentUser) modal.style.display = "none";
    }
}

// ==========================================
// 4. OBSŁUGA FORMULARZA POMIARÓW (Zmodyfikowana)
// ==========================================

if (glucoseForm) {
    glucoseForm.addEventListener('submit', function(e) {
        e.preventDefault(); 
        
        if (!currentUser) {
            alert("Musisz się zalogować, aby zapisać wynik!");
            openAuthModal();
            return;
        }

        const resultInput = document.getElementById('result');
        const timeInput = document.getElementById('time');
        const categoryInput = document.getElementById('category');
        const insulinInput = document.getElementById('insulin');
        const carbsInput = document.getElementById('carbs');

        if (!resultInput || !timeInput) return;

        const result = parseInt(resultInput.value);
        const time = timeInput.value;
        const category = categoryInput.value;
        const insulin = insulinInput.value !== "" ? insulinInput.value : "-";
        const carbs = carbsInput.value !== "" ? carbsInput.value : "-";

        const newRecord = { 
            id: Date.now(),
            result: result, 
            time: time, 
            category: category, 
            insulin: insulin, 
            carbs: carbs 
        };

        glucoseData.push(newRecord);
        saveUserData(); // Zapisujemy do struktury JSON użytkownika
        
        refreshViews(); 
        glucoseForm.reset();
        setTimeDefaults(); 
    });
}

// ==========================================
// 5. RESZTA LOGIKI (Filtry, Tabela, Wykresy) - BEZ ZMIAN
// ==========================================

function setTimeDefaults() {
    const timeInput = document.getElementById('time');
    if (timeInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        timeInput.value = now.toISOString().slice(0, 16);
    }
}

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
        dataTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#777;">Brak pomiarów (lub nie jesteś zalogowany).</td></tr>';
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

    if (!avgEl || !tirEl || !countEl) return;

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

// START
document.addEventListener('DOMContentLoaded', () => {
    setTimeDefaults();
    // Wymuszamy pokazanie okna logowania na start
    openAuthModal();
});
