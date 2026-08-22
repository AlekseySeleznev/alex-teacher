// js/app.js

// 1. Extract the unit ID from the URL parameters (e.g., ?unit=2)
const urlParams = new URLSearchParams(window.location.search);
const unitId = urlParams.get('unit') || '1'; // Default to Unit 1 if no parameter is found

// 2. Retrieve the current unit data from the data.js object
const currentUnit = dictationData[unitId] || dictationData["1"];
const wordsList = currentUnit.words;
const TOTAL_WORDS = wordsList.length;
const TIME_PER_WORD = 25; 

let currentWordIndex = 0;
let timerInterval = null;
let timeLeft = 0;
let group1 = []; // Students 1-15
let group2 = []; // Students 16-33

// Helper function to build the date in "Thursday 26th March 2026" format
function getFormattedDate() {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const now = new Date();
    const dayName = days[now.getDay()];
    const date = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    
    // Determine the correct English ordinal suffix (st, nd, rd, th)
    let suffix = "th";
    if (date < 11 || date > 13) {
        switch (date % 10) {
            case 1: suffix = "st"; break;
            case 2: suffix = "nd"; break;
            case 3: suffix = "rd"; break;
        }
    }
    
    return `${dayName} ${date}${suffix} ${monthName} ${year}`;
}

// Set the correct title and the actual date on the welcome screen
document.getElementById('welcome-subtitle').innerText = currentUnit.title;
document.getElementById('date-display').innerText = getFormattedDate();

function initStudents() {
    group1 = Array.from({length: 15}, (_, i) => i + 1);      // Students 1-15
    group2 = Array.from({length: 18}, (_, i) => i + 16);     // Students 16-33
}

// Returns the current pool based on word index (odd words = group1, even words = group2)
function getStudentPool() {
    return currentWordIndex % 2 === 0 ? group1 : group2;
}

// Removes a student from the specified pool
function setStudentFromPool(pool, student) {
    const index = pool.indexOf(student);
    if (index !== -1) {
        pool.splice(index, 1);
    }
}

function showScreen(screenId) {
    document.getElementById('screen-welcome').classList.add('hidden');
    document.getElementById('screen-dictation').classList.add('hidden');
    document.getElementById('screen-check-student').classList.add('hidden');
    document.getElementById('screen-check-word').classList.add('hidden');
    document.getElementById('screen-finish').classList.add('hidden');
    
    document.getElementById(screenId).classList.remove('hidden');
}

function updateArrows(prevBtnId, nextBtnId) {
    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);
    
    prevBtn.disabled = (currentWordIndex === 0);
    nextBtn.disabled = (currentWordIndex === TOTAL_WORDS - 1);
}

// --- PHASE 1: DICTATION ---
// --- PHASE 1: DICTATION ---
function startDictation() {
    // Play the Zen chime sound
    const chime = document.getElementById('focus-chime');
    if (chime) {
        chime.currentTime = 0; // Reset sound if clicked multiple times
        chime.play().catch(err => console.log("Audio play blocked by browser:", err));
    }

    initStudents(); 
    currentWordIndex = 0;
    showScreen('screen-dictation');
    loadDictationWord();
}

function loadDictationWord() {
    if (currentWordIndex >= TOTAL_WORDS) {
        clearInterval(timerInterval);
        currentWordIndex = 0; 
        startCheckPhase();
        return;
    }

    document.getElementById('dictation-title').innerText = `Look and write word #${currentWordIndex + 1}`;
    
    // Dynamic image path generation based on the active unit
    document.getElementById('dictation-img').src = `images/unit${unitId}/${currentWordIndex + 1}.jpg`;
    document.getElementById('dictation-counter').innerText = `Word ${currentWordIndex + 1} of ${TOTAL_WORDS}`;
    
    updateArrows('dict-prev', 'dict-next');

    timeLeft = TIME_PER_WORD * 10;
    const totalSteps = TIME_PER_WORD * 10;
    const bar = document.getElementById('timer-bar');
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        let percentage = (timeLeft / totalSteps) * 100;
        bar.style.width = percentage + '%';

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            currentWordIndex++;
            loadDictationWord();
        }
    }, 100);
}

function prevDictationWord() {
    if (currentWordIndex > 0) {
        clearInterval(timerInterval);
        currentWordIndex--;
        loadDictationWord();
    }
}

function nextDictationWord() {
    if (currentWordIndex < TOTAL_WORDS - 1) {
        clearInterval(timerInterval);
        currentWordIndex++;
        loadDictationWord();
    } else if (currentWordIndex === TOTAL_WORDS - 1) {
        clearInterval(timerInterval);
        currentWordIndex = 0;
        startCheckPhase();
    }
}

// --- PHASE 2: CHECKING ---
function startCheckPhase() {
    showScreen('screen-check-student');
    document.getElementById('student-number').innerText = "-";
    document.getElementById('check-student-counter').innerText = `Word ${currentWordIndex + 1} of ${TOTAL_WORDS}`;
    
    document.getElementById('btn-roll').classList.remove('hidden');
    document.getElementById('btn-reroll').classList.add('hidden');
    document.getElementById('btn-confirm-student').classList.add('hidden');
}

function rollStudent() {
    const pool = getStudentPool();
    
    if (pool.length === 0) {
        // If pool is empty, restore it
        if (currentWordIndex % 2 === 0) {
            group1 = Array.from({length: 15}, (_, i) => i + 1);
        } else {
            group2 = Array.from({length: 18}, (_, i) => i + 16);
        }
    }

    const display = document.getElementById('student-number');
    let counter = 0;
    
    document.getElementById('btn-roll').classList.add('hidden');
    document.getElementById('btn-reroll').classList.add('hidden');
    document.getElementById('btn-confirm-student').classList.add('hidden');

    let intervalTime = 50;
    let rollInterval = function() {
        // Show random number from full range (1-33) for scrolling effect
        let tempRandom = Math.floor(Math.random() * 33) + 1;
        display.innerText = tempRandom;
        counter++;

        if (counter > 15) {
            const randomIndex = Math.floor(Math.random() * getStudentPool().length);
            const chosenStudent = getStudentPool()[randomIndex];
            
            display.innerText = chosenStudent;
            display.setAttribute('data-chosen', chosenStudent); 
            
            document.getElementById('btn-reroll').classList.remove('hidden');
            document.getElementById('btn-confirm-student').classList.remove('hidden');
        } else {
            setTimeout(rollInterval, intervalTime += 20); 
        }
    };
    setTimeout(rollInterval, intervalTime);
}

function confirmStudent() {
    const chosen = parseInt(document.getElementById('student-number').getAttribute('data-chosen'));
    const pool = getStudentPool();
    setStudentFromPool(pool, chosen);
    
    showCheckWordScreen();
}

function showCheckWordScreen() {
    showScreen('screen-check-word');
    document.getElementById('check-word-title').innerText = `Word #${currentWordIndex + 1}`;
    
    // Dynamic image path for checking phase
    document.getElementById('check-img').src = `images/unit${unitId}/${currentWordIndex + 1}.jpg`;
    document.getElementById('answer-display').innerText = ""; 
    
    document.getElementById('btn-answer').classList.remove('hidden');
    
    updateArrows('check-prev', 'check-next');
}

function showAnswer() {
    const currentWordText = wordsList[currentWordIndex];
    document.getElementById('answer-display').innerText = currentWordText;
}

function prevCheckWord() {
    if (currentWordIndex > 0) {
        currentWordIndex--;
        startCheckPhase(); 
    }
}

function nextCheckWord() {
    if (currentWordIndex < TOTAL_WORDS - 1) {
        currentWordIndex++;
        startCheckPhase(); 
    } else {
        showScreen('screen-finish'); 
    }
}

function startDirectCheck() {
    initStudents();      
    currentWordIndex = 0; 
    startCheckPhase();    
}

function resetApp() {
    clearInterval(timerInterval);
    currentWordIndex = 0;
    initStudents();
    showScreen('screen-welcome');
}