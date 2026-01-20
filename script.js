// ==========================================
// 1. ZMIENNE GLOBALNE
// ==========================================
let currentUser = null; 
let glucoseData = [];   
const usersDBKey = 'diabMonitor_users_v2'; 
const TARGET_RANGE_MIN = 70;
const TARGET_RANGE_MAX = 180;
let currentFilter = '24h';

// ==========================================
// 2. FUNKCJE STARTOWE (URUCHAMIANE PO ZAŁADOWANIU STRONY)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Podpięcie obsługi formularzy logowania i rejestracji
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const glucoseForm = document.getElementById('glucoseForm');

    // Obsługa logowania
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const userInput = document.getElementById('loginUser').value.trim();
            const passInput = document.getElementById('loginPass').value;
            
            // Pobranie bazy użytkowników
            const users = getAllUsers();
            const foundUser = users.find(u => u.username === userInput && u.password === passInput);

            if (foundUser) {
                loginUser(foundUser);
            } else {
                alert("Błędny login lub hasło. Upewnij się, że masz konto.");
            }
        });
    }

    // Obsługa rejestracji
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
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

            const newUser = {
                username: user,
                password: pass,
                measurements: []
            };

            users.push(newUser);
            saveAllUsers(users);
            
            alert("Konto utworzone! Teraz możesz się zalogować.");
            switchAuthView('login'); // Przełącz na widok logowania
            registerForm.reset();
        });
    }

    // Obsługa dodawania pomiaru
    if (glucoseForm) {
        glucoseForm.addEventListener('submit', handleAddMeasurement);
    }

    // Ustawienia początkowe
    setTimeDefaults();
    
    // Wymuszamy otwarcie okna logowania na start, jeśli nikt nie jest zalogowany
    openAuthModal();
});

// ==========================================
// 3. LOGIKA UŻYTKOWNIKA (Auth)
// ==========================================

function getAllUsers() {
    const usersJSON = localStorage.getItem(usersDBKey);
    return usersJSON ? JSON.parse(usersJSON) : [];
}

function saveAllUsers(usersArray) {
    localStorage.setItem(usersDBKey, JSON.stringify(usersArray));
}

function validatePassword(pass) {
    const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(pass);
}

// Funkcja logowania - to tutaj dzieje się "magia" po kliknięciu Wejdź
function loginUser(userObj) {
    console.log("Logowanie udane:", userObj.username); // Diagnostyka w konsoli
    currentUser = userObj;
    glucoseData = userObj.measurements || [];
    
    // 1. Zmień wygląd nagłówka (feedback dla użytkownika)
    const authBtn = document.getElementById('authBtn');
    const welcomeMsg = document.getElementById('welcomeMsg');
    const userNameDisplay = document.getElementById('userNameDisplay');

    if (authBtn) {
        authBtn.innerHTML = '👤'; 
        authBtn.style.color = '#27ae60'; // ZMIANA KOLORU NA ZIELONY (Jesteś zalogowana)
        authBtn.title = "Twój Profil (Kliknij aby wylogować)";
    }
    
    if (welcomeMsg && userNameDisplay) {
        welcomeMsg.style.display = 'block';
        userNameDisplay.textContent = currentUser.username;
    }

    // 2. Zamknij okno modalne
    closeAuthModal();

    // 3. Załaduj dane do profilu (JSON)
    if(document.getElementById('jsonDataBox')) {
        document.getElementById('jsonDataBox').value = JSON.stringify(currentUser, null, 2);
    }
    
    // 4. Odśwież tabelę i wykresy
    refreshViews(); 
}

function logout() {
    currentUser = null;
    glucoseData = [];
    
    // Reset wyglądu nagłówka
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.style.color = '#333'; // Powrót do czarnego koloru
        authBtn.title = "Zaloguj się";
    }
    document.getElementById('welcomeMsg').style.display = 'none';
    document.getElementById('loginForm').reset();
    
    alert("Zostałeś wylogowany.");
    
    // Wyczyść widok i pokaż logowanie
    refreshViews(); 
    openAuthModal();
    switchAuthView('login');
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
    // Aktualizuj podgląd JSON w profilu
    if(document.getElementById('jsonDataBox')) {
        document.getElementById('jsonDataBox').value = JSON.stringify(currentUser, null, 2);
    }
}

// ==========================================
// 4. OBSŁUGA OKNA MODALNEGO (Logowanie/Profil)
// ==========================================

// Tę funkcję przypisaliśmy do przycisku w HTML: onclick="openAuthModal()"
function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    modal.style.display = 'flex';
    
    // Kluczowy moment: Co pokazać w oknie?
    if (currentUser) {
        // Jeśli jestem zalogowany -> pokaż PROFIL (z przyciskiem wyloguj)
        switchAuthView('profile'); 
    } else {
        // Jeśli NIE jestem zalogowany -> pokaż formularz LOGOWANIA
        switchAuthView('login'); 
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

function switchAuthView(viewName) {
    const loginView = document.getElementById('loginView');
    const registerView = document.getElementById('registerView');
    const profileView = document.getElementById('profileView');

    if (loginView) loginView.style.display = 'none';
    if (registerView) registerView.style.display = 'none';
    if (profileView) profileView.style.display = 'none';

    if (viewName === 'login' && loginView) loginView.style.display = 'block';
    if (viewName === 'register' && registerView) registerView.style.display = 'block';
    if (viewName === 'profile' && profileView) profileView.style.display = 'block';
}

// Kliknięcie poza oknem zamyka modal (chyba że nie jesteś zalogowany - wtedy wymusza logowanie)
window.onclick = function(event) {
    const modal = document.getElementById('authModal');
    if (event.target == modal) {
        if(currentUser) modal.style.display = "none";
    }
}

// ==========================================
// 5. OBSŁUGA POMIARÓW (Dodawanie/Tabela)
// ==========================================

function handleAddMeasurement(e) {
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

    const newRecord = { 
        id: Date.now(),
        result: parseInt(resultInput.value), 
        time: timeInput.value, 
        category: categoryInput.value, 
        insulin: insulinInput.value !== "" ? insulinInput.value : "-", 
        carbs: carbsInput.value !== "" ? carbsInput.value : "-" 
    };

    glucoseData.push(newRecord);
    saveUserData(); // Zapis do usera
    
    refreshViews(); 
    document.getElementById('glucoseForm').reset();
    setTimeDefaults(); 
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
    const tableBody = document.querySelector('#dataTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = ''; 
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

function setTimeDefaults() {
    const timeInput = document.getElementById('time');
    if (timeInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        timeInput.value = now.toISOString().slice(0, 16);
    }
}
