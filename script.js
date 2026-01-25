// globalne zmienne
let currentUser = null; 
let glucoseData = [];   
const usersDBKey = 'diabMonitor_users_v2'; 
const TARGET_RANGE_MIN = 70;
const TARGET_RANGE_MAX = 180;
let currentFilter = '24h';
//start 
document.addEventListener('DOMContentLoaded', () => {
    console.log("Aplikacja startuje...");

    //formulatze co html
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const glucoseForm = document.getElementById('glucoseForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (glucoseForm) glucoseForm.addEventListener('submit', handleAddMeasurement);

    // poczatek
    setTimeDefaults();
    
    // musi sie ktos zalogowac
    openAuthModal();
});

// BAZA DANYCH ten json
function getAllUsers() {
    const usersJSON = localStorage.getItem(usersDBKey);
    return usersJSON ? JSON.parse(usersJSON) : [];
}

function saveAllUsers(usersArray) {
    localStorage.setItem(usersDBKey, JSON.stringify(usersArray));
}

// LOGOWANIE I REJESTRACJA

function handleRegister(e) {
    e.preventDefault();
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value;

    // walidacja hasla
    const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regex.test(pass)) {
        alert("Hasło musi mieć min. 8 znaków, 1 wielką literę i 1 cyfrę!");
        return;
    }
   // sprawdzanie czy konto istnieje
    const users = getAllUsers();
    if (users.find(u => u.username === user)) {
        alert("Taki użytkownik już istnieje!");
        return;
    }
//twworzenie obiektuu
    const newUser = {
        username: user,
        password: pass,
        measurements: []
    };

    users.push(newUser);
    saveAllUsers(users);
    
    alert("Konto utworzone! Możesz się zalogować.");
    switchAuthView('login');
    document.getElementById('registerForm').reset();
}

function handleLogin(e) {
    e.preventDefault();
    const userInput = document.getElementById('loginUser').value.trim();
    const passInput = document.getElementById('loginPass').value;
    
    const users = getAllUsers();
    const foundUser = users.find(u => u.username === userInput && u.password === passInput);

    if (foundUser) {
        // logowanie udane
        currentUser = foundUser;
        glucoseData = foundUser.measurements || [];
        
        // nie ma konta?
        updateAuthUI(true);
        refreshViews();
        closeAuthModal();
    } else {
        alert("Błędny login lub hasło. Jeśli nie masz konta, kliknij 'Zarejestruj się'.");
    }
}

function logout() {
    currentUser = null;
    glucoseData = [];
    updateAuthUI(false);
    
    document.getElementById('loginForm').reset();
    refreshViews(); 
    alert("Wylogowano.");
    
    openAuthModal();
    switchAuthView('login');
}

function updateAuthUI(isLoggedIn) {
    const authBtn = document.getElementById('authBtn');
    const welcomeMsg = document.getElementById('welcomeMsg');
    const userNameDisplay = document.getElementById('userNameDisplay');

    if (isLoggedIn) {
        authBtn.style.color = '#27ae60'; // Zielony
        authBtn.title = "Twój Profil";
        welcomeMsg.style.display = 'block';
        userNameDisplay.textContent = currentUser.username;
        // Wypełnij JSON
        document.getElementById('jsonDataBox').value = JSON.stringify(currentUser, null, 2);
    } else {
        authBtn.style.color = '#333'; // Czarny
        authBtn.title = "Zaloguj się";
        welcomeMsg.style.display = 'none';
        userNameDisplay.textContent = '';
    }
}

function saveUserData() {
    if (!currentUser) return;
    currentUser.measurements = glucoseData;
    
    const users = getAllUsers();
    const index = users.findIndex(u => u.username === currentUser.username);
    if (index !== -1) {
        users[index] = currentUser;
        saveAllUsers(users);
    }
    // Aktualizacja podglądu JSON
    if(currentUser) document.getElementById('jsonDataBox').value = JSON.stringify(currentUser, null, 2);
}

// --- OBSŁUGA MODALA ---
function openAuthModal() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'flex';
    
    if (currentUser) {
        switchAuthView('profile');
    } else {
        switchAuthView('login');
    }
}

function closeAuthModal() {
    // Pozwól zamknąć tylko jeśli jest zalogowany
    if (currentUser) {
        document.getElementById('authModal').style.display = 'none';
    } else {
        // Opcjonalnie: alert("Musisz się zalogować!");
    }
}

function switchAuthView(viewName) {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('registerView').style.display = 'none';
    document.getElementById('profileView').style.display = 'none';

    if (viewName === 'login') document.getElementById('loginView').style.display = 'block';
    if (viewName === 'register') document.getElementById('registerView').style.display = 'block';
    if (viewName === 'profile') document.getElementById('profileView').style.display = 'block';
}

// pomiary 
function handleAddMeasurement(e) {
    e.preventDefault(); 
    
    if (!currentUser) {
        alert("Najpierw się zaloguj!");
        openAuthModal();
        return;
    }

    const resultInput = document.getElementById('result');
    const timeInput = document.getElementById('time');
    
    // zbieranie danych
    const result = parseInt(resultInput.value);
    const time = timeInput.value;
    const category = document.getElementById('category').value;
    const insulin = document.getElementById('insulin').value || "-";
    const carbs = document.getElementById('carbs').value || "-";

    const newRecord = { 
        id: Date.now(),
        result: result, 
        time: time, 
        category: category, 
        insulin: insulin, 
        carbs: carbs 
    };

    glucoseData.push(newRecord);
    saveUserData();
    
    refreshViews(); 
    document.getElementById('glucoseForm').reset();
    setTimeDefaults(); 
}

function getFilteredData() {
    // Sortowanie chronologiczne
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
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = ''; 
    
    // Do wyświetlania odwracamy (najnowsze na górze)
    const sortedForDisplay = [...data].reverse(); 

    if (sortedForDisplay.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#777;">Brak danych.</td></tr>';
        return;
    }

    sortedForDisplay.forEach(record => {
        const row = tableBody.insertRow();
        let colorClass = 'normal';
        if (record.result < TARGET_RANGE_MIN) colorClass = 'hypo'; 
        else if (record.result > TARGET_RANGE_MAX) colorClass = 'hyper'; 

        const d = new Date(record.time);
        
        row.insertCell().innerHTML = `
            <div style="font-weight:600; color:#333;">${d.toLocaleDateString('pl-PL')}</div>
            <div style="font-size:0.85em; color:#888;">${d.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})}</div>
        `;

        const cellResult = row.insertCell();
        cellResult.textContent = record.result;
        cellResult.className = colorClass;
        cellResult.style.fontSize = '1.3em'; 

        row.insertCell().innerHTML = `
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

function setTimeDefaults() {
    const timeInput = document.getElementById('time');
    if (timeInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        timeInput.value = now.toISOString().slice(0, 16);
    }
}

