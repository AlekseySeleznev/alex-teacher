// js/app.js

// 1. Extract the unit ID from the URL parameters (e.g., ?unit=2).
//    Unknown IDs fall back to Unit 1 for BOTH the words and the images.
const urlParams = new URLSearchParams(window.location.search);
const requestedUnit = urlParams.get('unit');
const unitId = (requestedUnit && dictationData[requestedUnit]) ? requestedUnit : '1';

// 2. Retrieve the current unit data from the data.js object
const currentUnit = dictationData[unitId];
const wordsList = currentUnit.words;
const TOTAL_WORDS = wordsList.length;
const TIME_PER_WORD = 25;            // seconds
const LOW_TIME_MS = 5000;            // bar turns warm in the last 5 seconds
const PENCILS_DOWN_MS = 3500;        // how long "Pencils down!" stays on screen

let currentWordIndex = 0;
let activeScreen = 'screen-welcome';
let group1 = []; // Students 1-15
let group2 = []; // Students 16-33

// Timer state (timestamp based, so it never drifts)
let timerInterval = null;
let wordDeadline = 0;
let remainingMs = 0;
let isPaused = false;
let pencilsTimeout = null;
let isRolling = false;

// Helper function to build the correct image path for standard units and final test
function getImagePath(index) {
    const folder = (unitId === 'final') ? 'final' : `unit${unitId}`;
    return `images/${folder}/${index + 1}.jpg`;
}

// Load every picture of the unit up front so words never flash blank
function preloadImages() {
    for (let i = 0; i < TOTAL_WORDS; i++) {
        const img = new Image();
        img.src = getImagePath(i);
    }
}

// Shows the picture for a word. If the file is missing and the unit has an
// emoji for that word, a big emoji is shown instead.
function showPicture(imgId, fallbackId, index) {
    const img = document.getElementById(imgId);
    const fallback = document.getElementById(fallbackId);
    const emoji = currentUnit.emoji && currentUnit.emoji[index];

    fallback.classList.add('hidden');
    img.classList.remove('hidden');
    img.dataset.index = index;

    img.onerror = () => {
        if (emoji && Number(img.dataset.index) === index) {
            img.classList.add('hidden');
            fallback.textContent = emoji;
            fallback.classList.remove('hidden');
        }
    };
    img.src = getImagePath(index);
}

function playSound(id) {
    const el = document.getElementById(id);
    if (el) {
        el.currentTime = 0;
        el.play().catch(err => console.log("Audio play blocked by browser:", err));
    }
}

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
document.title = `${currentUnit.title} – Zen Dictation`;
document.getElementById('welcome-subtitle').innerText = currentUnit.title;
document.getElementById('date-display').innerText = getFormattedDate();
preloadImages();

// A clicked button must not keep keyboard focus, otherwise Space/Enter
// would trigger it a second time
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) btn.blur();
});

// --- KEYBOARD / PRESENTATION REMOTE ---
// ←/→ or PageUp/PageDown : previous / next word
// Space                   : pause (dictation), roll / OK (student), show answer (check)
// Enter                   : same as Space on every screen except dictation
// Esc                     : back to the menu
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const isSpace = (e.key === ' ' || e.code === 'Space');
    const isPrev = (e.key === 'ArrowLeft' || e.key === 'PageUp');
    const isNext = (e.key === 'ArrowRight' || e.key === 'PageDown');
    const isEnter = (e.key === 'Enter');

    if (isSpace || isPrev || isNext || isEnter || e.key === 'Escape') e.preventDefault();
    if (e.repeat) return;

    if (e.key === 'Escape') { requestExit(); return; }

    switch (activeScreen) {
        case 'screen-welcome':
            if (isSpace || isEnter) startDictation();
            break;

        case 'screen-dictation':
            if (isPrev) prevDictationWord();
            else if (isNext) nextDictationWord();
            else if (isSpace) togglePause();
            break;

        case 'screen-pencils-down':
            if (isSpace || isEnter || isNext) skipPencilsDown();
            break;

        case 'screen-check-student':
            if (isSpace || isEnter) {
                if (!document.getElementById('btn-confirm-student').classList.contains('hidden')) {
                    confirmStudent();
                } else if (!isRolling) {
                    rollStudent();
                }
            }
            break;

        case 'screen-check-word':
            if (isPrev) prevCheckWord();
            else if (isNext) nextCheckWord();
            else if (isSpace || isEnter) showAnswer();
            break;
    }
});

function requestExit() {
    if (activeScreen === 'screen-welcome') {
        window.location.href = 'index.html';
        return;
    }
    // Freeze the clock while the question is open
    const wasRunning = (activeScreen === 'screen-dictation' && !isPaused);
    if (wasRunning) pauseTimer();
    if (confirm('Back to the menu?')) {
        window.location.href = 'index.html';
    } else if (wasRunning) {
        resumeTimer();
    }
}

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
    ['screen-welcome', 'screen-dictation', 'screen-pencils-down',
     'screen-check-student', 'screen-check-word', 'screen-finish'].forEach((id) => {
        document.getElementById(id).classList.add('hidden');
    });

    document.getElementById(screenId).classList.remove('hidden');
    activeScreen = screenId;
}

function updateArrows(prevBtnId, nextBtnId) {
    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);

    if (prevBtn) prevBtn.disabled = (currentWordIndex === 0);
    if (nextBtn) nextBtn.disabled = (currentWordIndex === TOTAL_WORDS - 1);
}

// --- TIMER ---
function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function setPausedUI(paused) {
    const bar = document.getElementById('timer-bar');
    bar.classList.toggle('paused', paused);
    document.getElementById('pause-note').classList.toggle('hidden', !paused);
}

function startWordTimer() {
    stopTimer();
    isPaused = false;
    setPausedUI(false);
    remainingMs = TIME_PER_WORD * 1000;
    wordDeadline = Date.now() + remainingMs;
    renderTimer(remainingMs);
    timerInterval = setInterval(tick, 100);
}

function renderTimer(leftMs) {
    const bar = document.getElementById('timer-bar');
    bar.style.width = (leftMs / (TIME_PER_WORD * 1000) * 100) + '%';
    bar.classList.toggle('low', leftMs <= LOW_TIME_MS);
}

function tick() {
    if (isPaused) return;
    const left = Math.max(0, wordDeadline - Date.now());
    renderTimer(left);

    if (left <= 0) {
        stopTimer();
        currentWordIndex++;
        if (currentWordIndex >= TOTAL_WORDS) {
            finishDictation();
        } else {
            loadDictationWord(true);
        }
    }
}

function pauseTimer() {
    if (isPaused || !timerInterval) return;
    remainingMs = Math.max(0, wordDeadline - Date.now());
    isPaused = true;
    setPausedUI(true);
}

function resumeTimer() {
    if (!isPaused) return;
    wordDeadline = Date.now() + remainingMs;
    isPaused = false;
    setPausedUI(false);
}

function togglePause() {
    if (isPaused) resumeTimer();
    else pauseTimer();
}

// --- PHASE 1: DICTATION ---
function startDictation() {
    playSound('focus-chime');

    initStudents();
    currentWordIndex = 0;
    showScreen('screen-dictation');
    loadDictationWord(false);
}

function loadDictationWord(withSound) {
    showPicture('dictation-img', 'dictation-fallback', currentWordIndex);
    document.getElementById('dictation-counter').innerText = `Word ${currentWordIndex + 1} of ${TOTAL_WORDS}`;

    updateArrows('dict-prev', 'dict-next');
    if (withSound) playSound('transition-sound');
    startWordTimer();
}

function prevDictationWord() {
    if (currentWordIndex > 0) {
        currentWordIndex--;
        loadDictationWord(true);
    }
}

function nextDictationWord() {
    if (currentWordIndex < TOTAL_WORDS - 1) {
        currentWordIndex++;
        loadDictationWord(true);
    } else {
        finishDictation();
    }
}

// Short "Pencils down!" pause before the checking phase
function finishDictation() {
    stopTimer();
    clearTimeout(pencilsTimeout);
    currentWordIndex = 0;
    showScreen('screen-pencils-down');
    playSound('transition-sound');
    pencilsTimeout = setTimeout(skipPencilsDown, PENCILS_DOWN_MS);
}

function skipPencilsDown() {
    clearTimeout(pencilsTimeout);
    if (activeScreen === 'screen-pencils-down') startCheckPhase();
}

// --- PHASE 2: CHECKING ---
function startCheckPhase() {
    showScreen('screen-check-student');
    isRolling = false;
    document.getElementById('student-number').innerText = "-";
    document.getElementById('check-student-counter').innerText = `Word ${currentWordIndex + 1} of ${TOTAL_WORDS}`;

    document.getElementById('btn-roll').classList.remove('hidden');
    document.getElementById('btn-reroll').classList.add('hidden');
    document.getElementById('btn-confirm-student').classList.add('hidden');
}

function rollStudent() {
    if (isRolling) return;
    isRolling = true;

    if (getStudentPool().length === 0) {
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

            isRolling = false;
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

    showPicture('check-img', 'check-fallback', currentWordIndex);
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
    stopTimer();
    clearTimeout(pencilsTimeout);
    currentWordIndex = 0;
    initStudents();
    showScreen('screen-welcome');
}
