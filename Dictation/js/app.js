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
const SPELL_STEP_MS = 700;           // pause between spelled letters
const TOOLBAR_SCREENS = ['screen-dictation', 'screen-check-student', 'screen-check-word'];

let currentWordIndex = 0;
let activeScreen = 'screen-welcome';
let group1 = []; // Students 1-15
let group2 = []; // Students 16-33
let studentForWord = {};   // word index -> student chosen for it (so ← → never re-rolls)

// Timer state (timestamp based, so it never drifts)
let timerInterval = null;
let wordDeadline = 0;
let remainingMs = 0;
let isPaused = false;
let lowWarned = false;
let pencilsTimeout = null;
let isRolling = false;
let answerShown = false;
let spellTimer = null;

// Helper function to build the correct image path: a unit may name its own
// folder (imageFolder), otherwise images/unit<N>/ (or images/final/)
function getImagePath(index) {
    const folder = currentUnit.imageFolder || ((unitId === 'final') ? 'final' : `unit${unitId}`);
    return `images/${folder}/${index + 1}.jpg`;
}

// Load every picture of the unit up front so words never flash blank
function preloadImages() {
    for (let i = 0; i < TOTAL_WORDS; i++) {
        const img = new Image();
        img.src = getImagePath(i);
    }
}

// Restart a CSS animation on an element
function restartAnimation(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
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
            restartAnimation(fallback, 'swap');
        }
    };
    restartAnimation(img, 'swap');
    img.src = getImagePath(index);
}

// Row of dots: finished words, the current word, words still to come
function renderDots(id) {
    const el = document.getElementById(id);
    if (el.children.length !== TOTAL_WORDS) {
        el.innerHTML = '';
        for (let i = 0; i < TOTAL_WORDS; i++) {
            const dot = document.createElement('div');
            el.appendChild(dot);
        }
    }
    Array.from(el.children).forEach((dot, i) => {
        dot.className = 'dot' + (i < currentWordIndex ? ' done' : (i === currentWordIndex ? ' current' : ''));
    });
    el.setAttribute('aria-label', `Word ${currentWordIndex + 1} of ${TOTAL_WORDS}`);
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

// --- SOUND CONTROLS ---
function updateMuteUI() {
    const icon = Sound.isMuted() ? '🔇' : '🔊';
    document.getElementById('btn-mute').textContent = icon;
    document.getElementById('tb-sound').textContent = icon;
}

function showToast(text) {
    const toast = document.getElementById('toast');
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 1400);
}

function toggleMute() {
    Sound.setMuted(!Sound.isMuted());
    updateMuteUI();
    showToast(Sound.isMuted() ? '🔇 Sound off' : '🔊 Sound on');
    if (!Sound.isMuted()) Sound.preview();
}

function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
}

const volumeInput = document.getElementById('volume');
const ambientInput = document.getElementById('ambient');
volumeInput.value = Math.round(Sound.getVolume() * 100);
ambientInput.checked = Sound.isAmbientOn();
volumeInput.addEventListener('input', () => Sound.setVolume(volumeInput.value / 100));
volumeInput.addEventListener('change', () => { Sound.preview(); volumeInput.blur(); });
ambientInput.addEventListener('change', () => {
    Sound.setAmbientEnabled(ambientInput.checked);
    ambientInput.blur();
});
updateMuteUI();

// A clicked button must not keep keyboard focus, otherwise Space/Enter
// would trigger it a second time
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) btn.blur();
});

// --- FLOATING TOOLBAR + HIDDEN MOUSE ---
const toolbar = document.getElementById('toolbar');
let toolbarTimer = null;
let cursorTimer = null;

function showToolbar(ms) {
    if (!TOOLBAR_SCREENS.includes(activeScreen)) return;
    toolbar.classList.add('show');
    clearTimeout(toolbarTimer);
    toolbarTimer = setTimeout(() => toolbar.classList.remove('show'), ms);
}

function scheduleCursorHide() {
    clearTimeout(cursorTimer);
    document.body.classList.remove('hide-cursor');
    if (activeScreen === 'screen-dictation') {
        cursorTimer = setTimeout(() => {
            if (!toolbar.matches(':hover')) document.body.classList.add('hide-cursor');
        }, 2000);
    }
}

document.addEventListener('mousemove', () => { showToolbar(2500); scheduleCursorHide(); });
document.addEventListener('touchstart', () => showToolbar(3500), { passive: true });

function updateToolbar() {
    document.getElementById('tb-prev').disabled = (currentWordIndex === 0);
    document.getElementById('tb-pause').classList.toggle('hidden', activeScreen !== 'screen-dictation');
}

function goPrev() {
    if (activeScreen === 'screen-dictation') {
        prevDictationWord();
    } else if (!isRolling && (activeScreen === 'screen-check-student' || activeScreen === 'screen-check-word')) {
        prevCheckWord();
    }
}

function goNext() {
    if (activeScreen === 'screen-dictation') {
        nextDictationWord();
    } else if (activeScreen === 'screen-check-word') {
        nextCheckWord();
    } else if (activeScreen === 'screen-check-student' && !isRolling && currentWordIndex < TOTAL_WORDS - 1) {
        nextCheckWord();   // never jump to the finish screen from the roller by accident
    }
}

// --- KEYBOARD / PRESENTATION REMOTE ---
// ←/→ or PageUp/PageDown : previous / next word
// Space or Enter          : the one "main" action of the screen
//                           dictation: pause · roller: roll, then OK · check: show answer, then next word
// R reroll · S spell the word · M sound · F full screen · Esc menu
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Don't steal keys from the volume slider or the checkbox
    if (e.target && e.target.tagName === 'INPUT' && e.key !== 'Escape') return;

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const isSpace = (key === ' ' || e.code === 'Space');
    const isPrev = (key === 'ArrowLeft' || key === 'PageUp');
    const isNext = (key === 'ArrowRight' || key === 'PageDown');
    const isEnter = (key === 'Enter');

    if (isSpace || isPrev || isNext || isEnter || key === 'Escape') e.preventDefault();
    if (e.repeat) return;

    if (key === 'Escape') { requestExit(); return; }
    if (key === 'm') { toggleMute(); return; }
    if (key === 'f') { toggleFullscreen(); return; }

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
            if (isPrev || isNext) {
                if (isPrev) goPrev(); else goNext();
            } else if (isSpace || isEnter) {
                if (!document.getElementById('btn-confirm-student').classList.contains('hidden')) {
                    confirmStudent();
                } else if (!isRolling) {
                    rollStudent();
                }
            } else if (key === 'r' && !document.getElementById('btn-reroll').classList.contains('hidden')) {
                rollStudent();
            }
            break;

        case 'screen-check-word':
            if (isPrev) prevCheckWord();
            else if (isNext) nextCheckWord();
            else if (isSpace || isEnter) mainCheckAction();
            else if (key === 's') spellAnswer();
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
    studentForWord = {};
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

    toolbar.classList.remove('show');
    toolbar.classList.toggle('hidden', !TOOLBAR_SCREENS.includes(screenId));
    updateToolbar();
    scheduleCursorHide();
}

// --- TIMER ---
function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function setPausedUI(paused) {
    document.getElementById('timer-bar').classList.toggle('paused', paused);
    document.getElementById('pause-note').classList.toggle('hidden', !paused);
    document.getElementById('tb-pause').textContent = paused ? '⏯' : '⏸';
}

function startWordTimer() {
    stopTimer();
    isPaused = false;
    lowWarned = false;
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

    if (left <= LOW_TIME_MS && left > 0 && !lowWarned) {
        lowWarned = true;
        Sound.low();
    }

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
    if (activeScreen !== 'screen-dictation') return;
    if (isPaused) { resumeTimer(); Sound.resume(); }
    else { pauseTimer(); Sound.pause(); }
}

// --- PHASE 1: DICTATION ---
function startDictation() {
    Sound.chime();
    Sound.ambientStart();

    initStudents();
    currentWordIndex = 0;
    showScreen('screen-dictation');
    loadDictationWord(false);
}

function loadDictationWord(withSound) {
    showPicture('dictation-img', 'dictation-fallback', currentWordIndex);
    renderDots('dictation-dots');
    updateToolbar();
    if (withSound) Sound.word();
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
    Sound.ambientStop();
    clearTimeout(pencilsTimeout);
    currentWordIndex = 0;
    showScreen('screen-pencils-down');
    Sound.pencilsDown();
    pencilsTimeout = setTimeout(skipPencilsDown, PENCILS_DOWN_MS);
}

function skipPencilsDown() {
    clearTimeout(pencilsTimeout);
    if (activeScreen === 'screen-pencils-down') startCheckPhase();
}

// --- PHASE 2: CHECKING ---
function startCheckPhase() {
    cancelSpell();
    showScreen('screen-check-student');
    isRolling = false;
    renderDots('check-student-dots');

    const display = document.getElementById('student-number');
    const assigned = studentForWord[currentWordIndex];

    if (assigned !== undefined) {
        // Coming back to a word: show the same student again instead of rolling a new one
        display.innerText = assigned;
        display.setAttribute('data-chosen', assigned);
        document.getElementById('btn-roll').classList.add('hidden');
        document.getElementById('btn-reroll').classList.remove('hidden');
        document.getElementById('btn-confirm-student').classList.remove('hidden');
    } else {
        display.innerText = "-";
        display.removeAttribute('data-chosen');
        document.getElementById('btn-roll').classList.remove('hidden');
        document.getElementById('btn-reroll').classList.add('hidden');
        document.getElementById('btn-confirm-student').classList.add('hidden');
    }
}

// A reroll on an already chosen word gives that student back to the pool
function releaseAssigned() {
    const student = studentForWord[currentWordIndex];
    if (student !== undefined) {
        const pool = getStudentPool();
        if (!pool.includes(student)) pool.push(student);
        delete studentForWord[currentWordIndex];
    }
}

function rollStudent() {
    if (isRolling) return;
    isRolling = true;
    releaseAssigned();

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
            Sound.land();

            isRolling = false;
            document.getElementById('btn-reroll').classList.remove('hidden');
            document.getElementById('btn-confirm-student').classList.remove('hidden');
        } else {
            Sound.tick();
            setTimeout(rollInterval, intervalTime += 20);
        }
    };
    setTimeout(rollInterval, intervalTime);
}

function confirmStudent() {
    const chosen = parseInt(document.getElementById('student-number').getAttribute('data-chosen'));
    if (studentForWord[currentWordIndex] === undefined) {
        setStudentFromPool(getStudentPool(), chosen);
        studentForWord[currentWordIndex] = chosen;
    }

    showCheckWordScreen();
}

function mainButtonLabel() {
    return currentWordIndex === TOTAL_WORDS - 1 ? 'Finish ✓' : 'Next Word →';
}

function showCheckWordScreen() {
    cancelSpell();
    showScreen('screen-check-word');
    document.getElementById('check-word-title').innerText = `Word #${currentWordIndex + 1}`;

    showPicture('check-img', 'check-fallback', currentWordIndex);
    answerShown = false;
    document.getElementById('answer-display').innerText = "";
    document.getElementById('btn-answer').textContent = 'Show the Answer';
    document.getElementById('btn-spell').classList.add('hidden');
}

// One main button / key: first it reveals the answer, then it moves on
function mainCheckAction() {
    if (!answerShown) showAnswer();
    else nextCheckWord();
}

function showAnswer() {
    if (answerShown) return;
    answerShown = true;

    const display = document.getElementById('answer-display');
    display.innerHTML = '';
    Array.from(wordsList[currentWordIndex]).forEach((ch) => {
        const span = document.createElement('span');
        span.className = ch === ' ' ? 'letter space' : 'letter';
        span.textContent = ch === ' ' ? ' ' : ch;
        display.appendChild(span);
    });

    Sound.answer();
    document.getElementById('btn-answer').textContent = mainButtonLabel();
    document.getElementById('btn-spell').classList.remove('hidden');
}

// "Spell it": the letters light up one by one with a soft note so the class can spell aloud
function cancelSpell() {
    clearInterval(spellTimer);
    spellTimer = null;
    document.querySelectorAll('#answer-display .letter').forEach((l) => l.classList.remove('dim', 'on'));
}

function spellAnswer() {
    if (activeScreen !== 'screen-check-word') return;
    if (!answerShown) showAnswer();
    cancelSpell();

    const spans = Array.from(document.querySelectorAll('#answer-display .letter'));
    spans.forEach((l) => l.classList.add('dim'));

    let step = 0;
    let letterNo = 0;
    let previous = null;
    spellTimer = setInterval(() => {
        if (previous) previous.classList.remove('on');
        // Spaces between words appear at once, without a note;
        // every new word starts the scale again from "do"
        while (step < spans.length && spans[step].classList.contains('space')) {
            spans[step].classList.remove('dim');
            letterNo = 0;
            step++;
        }
        if (step >= spans.length) {
            cancelSpell();
            return;
        }
        const span = spans[step];
        span.classList.remove('dim');
        span.classList.add('on');
        Sound.letter(letterNo);
        previous = span;
        step++;
        letterNo++;
    }, SPELL_STEP_MS);
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
        cancelSpell();
        showScreen('screen-finish');
        Sound.finish();
    }
}

function startDirectCheck() {
    initStudents();
    currentWordIndex = 0;
    startCheckPhase();
}

function resetApp() {
    stopTimer();
    cancelSpell();
    Sound.ambientStop();
    clearTimeout(pencilsTimeout);
    currentWordIndex = 0;
    initStudents();
    showScreen('screen-welcome');
}
