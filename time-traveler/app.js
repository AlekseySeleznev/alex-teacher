// ═══════════════════════════════════════════════════════════════
// TIME TRAVELER — app logic
// Plain JS, no build step. Reads verb data from verbs.js.
// ═══════════════════════════════════════════════════════════════

const $ = (sel) => document.querySelector(sel);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const ISLANDS = [
  { emoji: '🏝️', title: 'Verb Island',    desc: 'Verb Match: Present → Past Simple' },
  { emoji: '⛰️',  title: 'Question Cove',  desc: 'Have You Ever…? questions' },
  { emoji: '🌋', title: 'Confession Bay',  desc: '“I’ve never…” sentences' },
];
const MODULE_KEYS = ['m1', 'm2', 'm3'];
const STAGE_NAMES = { 1: 'Multiple Choice', 2: 'Word Order', 3: 'Type It' };
const STORAGE_KEY = 'timeTraveler.v1';

// ═══════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════
const STATE = { totalStars: 0, screen: 'menu' };
let roundStartStars = 0;
let currentChoice = null;   // generic keyboard-driven multiple-choice controller
let menuButtons = [];
let m1 = null, m2 = null, m3 = null, m2Tiles = null;

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ totalStars: STATE.totalStars })); } catch (e) {}
}
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (typeof data.totalStars === 'number') STATE.totalStars = data.totalStars;
    }
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
// LEVELS & HEADER
// ═══════════════════════════════════════════════════════════════
function getLevel(stars) {
  if (stars >= 40) return { name: 'Gold',   emoji: '🥇' };
  if (stars >= 20) return { name: 'Silver', emoji: '🥈' };
  return { name: 'Bronze', emoji: '🥉' };
}

function syncHeaderStars() {
  $('#star-counter').textContent = `⭐ ${STATE.totalStars}`;
  const lvl = getLevel(STATE.totalStars);
  $('#level-badge').textContent = `${lvl.emoji} ${lvl.name}`;
}

function addStars(n) {
  const prevLevel = getLevel(STATE.totalStars).name;
  STATE.totalStars += n;
  saveProgress();
  syncHeaderStars();

  const starEl = $('#star-counter');
  starEl.classList.remove('pop'); void starEl.offsetWidth; starEl.classList.add('pop');

  const newLevel = getLevel(STATE.totalStars);
  if (newLevel.name !== prevLevel) {
    const badge = $('#level-badge');
    badge.classList.remove('level-up'); void badge.offsetWidth; badge.classList.add('level-up');
    playFanfare();
    launchFireworks(2200);
  }
}

function updateHeader({ islandName, progressPct } = {}) {
  if (islandName !== undefined) $('#island-name').textContent = islandName;
  if (progressPct !== undefined) $('#progress-fill').style.width = Math.max(0, Math.min(100, progressPct)) + '%';
}

function avatarReact(kind) {
  const el = $('#avatar');
  el.classList.remove('happy', 'encourage');
  void el.offsetWidth;
  el.classList.add(kind);
  setTimeout(() => el.classList.remove(kind), 700);
}

function setFeedback(prefix, text, cls) {
  const el = $(`#${prefix}-feedback`);
  el.textContent = text;
  el.className = 'feedback-banner' + (cls ? ' ' + cls : '');
}

// ═══════════════════════════════════════════════════════════════
// SOUND — Web Audio, no external files
// ═══════════════════════════════════════════════════════════════
let audioCtx = null;
function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playDing() {
  try {
    const c = ctx(), t = c.currentTime;
    const osc = c.createOscillator(), g = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t); osc.stop(t + 0.4);
  } catch (e) {}
}
function playWrong() {
  try {
    const c = ctx(), t = c.currentTime;
    const osc = c.createOscillator(), g = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.28);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t); osc.stop(t + 0.3);
  } catch (e) {}
}
function playFanfare() {
  try {
    const c = ctx();
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => {
      const osc = c.createOscillator(), g = c.createGain();
      osc.connect(g); g.connect(c.destination);
      osc.type = 'triangle';
      const t = c.currentTime + i * 0.11;
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.26, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.18);
    });
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
// FIREWORKS (canvas)
// ═══════════════════════════════════════════════════════════════
const fwCanvas = document.getElementById('fireworks-canvas');
const fwCtx = fwCanvas.getContext('2d');
let particles = [];
let fwRafId = null;
function resizeFwCanvas() { fwCanvas.width = window.innerWidth; fwCanvas.height = window.innerHeight; }
window.addEventListener('resize', resizeFwCanvas);
resizeFwCanvas();

function spawnBurst(x, y) {
  const colors = ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#ce93d8', '#f48fb1', '#80deea'];
  const count = 26 + Math.random() * 18 | 0;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 4 + Math.random() * 6;
    particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      color: colors[Math.random() * colors.length | 0],
      life: 1, decay: 0.017 + Math.random() * 0.014, r: 3 + Math.random() * 4,
    });
  }
}
function animateFireworks() {
  fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.vx *= 0.97; p.life -= p.decay;
    fwCtx.globalAlpha = Math.max(0, p.life);
    fwCtx.fillStyle = p.color;
    fwCtx.beginPath(); fwCtx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); fwCtx.fill();
  });
  fwCtx.globalAlpha = 1;
  particles = particles.filter(p => p.life > 0);
  fwRafId = particles.length > 0 ? requestAnimationFrame(animateFireworks) : null;
}
function launchFireworks(duration = 2200) {
  const w = fwCanvas.width, h = fwCanvas.height;
  const start = Date.now();
  (function burst() {
    spawnBurst(w * (0.15 + Math.random() * 0.7), h * (0.1 + Math.random() * 0.5));
    if (Date.now() - start < duration) setTimeout(burst, 180 + Math.random() * 180);
  })();
  if (!fwRafId) fwRafId = requestAnimationFrame(animateFireworks);
}
function flash(color) {
  const el = $('#flash');
  el.style.background = color;
  el.style.opacity = '0.16';
  setTimeout(() => { el.style.opacity = '0'; }, 320);
}

// ═══════════════════════════════════════════════════════════════
// GENERIC KEYBOARD-DRIVEN MULTIPLE CHOICE
// ═══════════════════════════════════════════════════════════════
function buildOptionButtons(container, items, opts = {}) {
  const { vertical = false, className = 'option-card' } = opts;
  container.innerHTML = '';
  if (container.classList.contains('options-row')) container.classList.toggle('vertical', vertical);
  return items.map((item, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.tabIndex = 0;
    btn.dataset.idx = i;
    btn.innerHTML = item.html !== undefined
      ? item.html
      : `<span class="opt-num">${i + 1}</span><span>${item.label}</span>`;
    btn.addEventListener('focus', () => setHighlight(i));
    btn.addEventListener('click', () => { setHighlight(i); confirmChoice(); });
    container.appendChild(btn);
    return btn;
  });
}

function setHighlight(i) {
  if (!currentChoice) return;
  currentChoice.index = i;
  currentChoice.buttons.forEach((b, idx) => b.classList.toggle(currentChoice.highlightClass, idx === i));
}

function setupChoice(buttons, items, onConfirm, opts = {}) {
  currentChoice = { buttons, items, index: 0, locked: false, onConfirm, highlightClass: opts.highlightClass || 'highlighted' };
  setHighlight(0);
  if (buttons[0]) buttons[0].focus({ preventScroll: true });
}

function choiceMove(delta) {
  if (!currentChoice || currentChoice.locked) return;
  const n = currentChoice.buttons.length;
  currentChoice.buttons[(currentChoice.index + delta + n) % n].focus({ preventScroll: true });
}
function choiceSetIndexKey(i) {
  if (!currentChoice || currentChoice.locked || i < 0 || i >= currentChoice.buttons.length) return;
  currentChoice.buttons[i].focus({ preventScroll: true });
}
function confirmChoice() {
  if (!currentChoice || currentChoice.locked) return;
  currentChoice.locked = true;
  currentChoice.buttons.forEach(b => b.disabled = true);
  currentChoice.onConfirm(currentChoice.items[currentChoice.index], currentChoice.index);
}
function handleChoiceKey(e) {
  if (!currentChoice) return;
  if (currentChoice.locked) {
    if (e.key === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (window.advanceFn) window.advanceFn();
    }
    return;
  }
  if (['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); choiceSetIndexKey(Number(e.key) - 1); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); choiceMove(-1); }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); choiceMove(1); }
  else if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); confirmChoice(); }
}

// ═══════════════════════════════════════════════════════════════
// SCREEN SWITCHING
// ═══════════════════════════════════════════════════════════════
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(`#screen-${name}`).classList.add('active');
  updateKeyHints();
}

function goToMenu() {
  STATE.screen = 'menu';
  currentChoice = null;
  window.advanceFn = null;
  showScreen('menu');
  updateHeader({ islandName: 'Main Menu', progressPct: 0 });
  buildMenu();
}

function enterModule(n) {
  roundStartStars = STATE.totalStars;
  if (n === 1) startM1();
  else if (n === 2) startM2();
  else startM3();
}

function moduleNumFromKey(key) { return MODULE_KEYS.indexOf(key) + 1; }

// ═══════════════════════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════════════════════
function buildMenu() {
  STATE.screen = 'menu';
  const items = ISLANDS.map((isl, i) => ({
    html: `<div class="island-num">${i + 1}</div><div class="island-emoji">${isl.emoji}</div>` +
          `<div class="island-title">${isl.title}</div><div class="island-desc">${isl.desc}</div>`,
    action: () => enterModule(i + 1),
  }));
  const buttons = buildOptionButtons($('#island-row'), items, { className: 'island-card' });
  setupChoice(buttons, items, (item) => item.action(), { highlightClass: 'selected' });
}

// ═══════════════════════════════════════════════════════════════
// MODULE 1 — VERB MATCH
// ═══════════════════════════════════════════════════════════════
const M1_ROUND_SIZE = 12;

function startM1() {
  STATE.screen = 'm1';
  showScreen('m1');
  const chosen = shuffle(VERBS.slice()).slice(0, Math.min(M1_ROUND_SIZE, VERBS.length));
  m1 = {
    queue: chosen.map(v => ({ verb: v })),
    total: chosen.length,
    masteredBases: new Set(),
    wrongVerbs: {},
    startTime: 0,
  };
  updateHeader({ islandName: '🏝️ Verb Island — Verb Match', progressPct: 0 });
  nextM1Question();
}

function buildM1Options(verb) {
  const correct = verb.pastSimple;
  const pool = new Set();
  if (verb.irregular) {
    pool.add(verb.base + (/e$/.test(verb.base) ? 'd' : 'ed')); // naive "regularized" mistake
  }
  for (const o of shuffle(VERBS.filter(v => v.base !== verb.base))) {
    if (pool.size >= 2) break;
    if (o.pastSimple !== correct) pool.add(o.pastSimple);
  }
  const distractors = shuffle([...pool]).slice(0, 2);
  return shuffle([{ label: correct, correct: true }, ...distractors.map(d => ({ label: d, correct: false }))]);
}

function nextM1Question() {
  if (m1.queue.length === 0) { finishRound('m1'); return; }
  const item = m1.queue.shift();
  m1.startTime = Date.now();
  const verb = item.verb;

  $('#m1-progress').textContent = `⭐ Mastered ${m1.masteredBases.size} / ${m1.total}`;
  updateHeader({ progressPct: (m1.masteredBases.size / m1.total) * 100 });
  $('#m1-emoji').textContent = verb.emoji;
  $('#m1-base').innerHTML = verb.base + (verb.irregular ? ' <span class="irregular-tag" title="Irregular verb">⭐</span>' : '');

  const options = buildM1Options(verb);
  const buttons = buildOptionButtons($('#m1-options'), options);
  setupChoice(buttons, options, (opt) => onM1Answer(opt, verb));
  setFeedback('m1', '', '');
  $('#next-hint-m1').textContent = '';
  window.advanceFn = null;
}

function onM1Answer(chosenOpt, verb) {
  const elapsed = Date.now() - m1.startTime;
  currentChoice.buttons.forEach((b, i) => { if (currentChoice.items[i].correct) b.classList.add('correct-answer'); });

  if (chosenOpt.correct) {
    m1.masteredBases.add(verb.base);
    addStars(1);
    let msg = `✅ Yes! "${verb.base}" → "${verb.pastSimple}"`;
    if (elapsed <= 4000) { addStars(1); msg += '  ⚡ Speed Bonus +1!'; }
    setFeedback('m1', msg, 'ok');
    avatarReact('happy');
    playDing();
  } else {
    const idx = currentChoice.items.indexOf(chosenOpt);
    currentChoice.buttons[idx].classList.add('wrong-answer');
    m1.wrongVerbs[verb.base] = (m1.wrongVerbs[verb.base] || 0) + 1;
    const requeuePos = Math.min(m1.queue.length, 3 + Math.floor(Math.random() * 3));
    m1.queue.splice(requeuePos, 0, { verb });
    setFeedback('m1', `Not quite! "${verb.base}" → "${verb.pastSimple}". Let's try more! 💪`, 'bad');
    avatarReact('encourage');
    playWrong();
  }

  updateHeader({ progressPct: (m1.masteredBases.size / m1.total) * 100 });
  $('#next-hint-m1').textContent = 'Press Enter or Space for the next verb ➜';
  window.advanceFn = nextM1Question;
}

// ═══════════════════════════════════════════════════════════════
// MODULE 2 — HAVE YOU EVER...?
// ═══════════════════════════════════════════════════════════════
function m2QuestionText(topic) {
  const verb = VERBS.find(v => v.base === topic.verb);
  return `Have you ever ${verb.pastParticiple} ${topic.object}?`;
}
function m2AnswerSentence(topic) {
  return topic.keyAnswer ? 'Yes, I have.' : "No, I haven't.";
}
function m2AnswerTokens(keyAnswer) {
  return keyAnswer ? ['Yes', ',', 'I', 'have'] : ['No', ',', 'I', "haven't"];
}
function normalizeAnswer(s) {
  return s.toLowerCase().replace(/['’]/g, "'").replace(/[^a-z' ]/g, '').replace(/\s+/g, ' ').trim();
}

function startM2() {
  STATE.screen = 'm2';
  showScreen('m2');
  m2 = { stage: 'intro', wrongTopics: {}, totalQuestions: 0, answeredCount: 0, correctCount: 0 };
  showM2Intro();
}

function showM2Intro() {
  m2.stage = 'intro';
  $('#m2-intro-wrap').classList.remove('hidden');
  $('#m2-play-wrap').classList.add('hidden');
  updateHeader({ islandName: '⛰️ Question Cove — Have You Ever...?', progressPct: 0 });
  $('#m2-progress').textContent = 'Choose a stage';

  const items = [
    { label: 'Multiple Choice', stage: 1 },
    { label: 'Word Order', stage: 2 },
    { label: 'Type It', stage: 3 },
    { label: '▶️ Auto (All Stages)', stage: 'auto' },
  ];
  const buttons = buildOptionButtons($('#m2-intro-wrap'), items);
  setupChoice(buttons, items, (item) => beginM2Stages(item.stage));
  updateKeyHints();
}

function beginM2Stages(stageChoice) {
  const shuffled = shuffle(HAVE_YOU_EVER_TOPICS.slice());
  if (stageChoice === 'auto') {
    m2.stageOrder = [1, 2, 3];
    m2.pools = { 1: shuffled.slice(0, 5), 2: shuffled.slice(5, 10), 3: shuffled.slice(10, 15) };
  } else {
    m2.stageOrder = [stageChoice];
    m2.pools = { [stageChoice]: shuffled.slice(0, 8) };
  }
  m2.stageIdx = 0;
  m2.totalQuestions = m2.stageOrder.reduce((s, st) => s + m2.pools[st].length, 0);
  m2.answeredCount = 0;
  m2.correctCount = 0;
  m2.wrongTopics = {};

  $('#m2-intro-wrap').classList.add('hidden');
  $('#m2-play-wrap').classList.remove('hidden');
  startNextM2Stage();
}

function startNextM2Stage() {
  if (m2.stageIdx >= m2.stageOrder.length) { finishRound('m2'); return; }
  const stage = m2.stageOrder[m2.stageIdx];
  m2.currentStage = stage;
  m2.queue = m2.pools[stage].map(t => ({ topic: t }));
  m2.stageQuestionTotal = m2.queue.length;
  m2.stageAnswered = 0;
  nextM2Question();
}

function nextM2Question() {
  if (m2.queue.length === 0) { m2.stageIdx++; startNextM2Stage(); return; }
  const item = m2.queue.shift();
  m2.current = item;
  m2.stage = m2.currentStage;
  renderM2Question(item.topic, m2.currentStage);
}

function showM2SubPanel(stage) {
  $('#m2-mc').classList.toggle('hidden', stage !== 1);
  $('#m2-tiles').classList.toggle('hidden', stage !== 2);
  $('#m2-type').classList.toggle('hidden', stage !== 3);
}

function renderM2Question(topic, stage) {
  $('#m2-emoji').textContent = topic.emoji;
  $('#m2-badge').textContent = `🐲 Zippy's Diary: ${topic.keyAnswer ? '✅ YES!' : '🚫 NEVER!'}`;
  $('#m2-question').textContent = m2QuestionText(topic);
  $('#m2-stage-label').textContent = `Stage ${stage}: ${STAGE_NAMES[stage]}`;
  $('#m2-progress').textContent = `Stage ${stage} • Question ${m2.stageAnswered + 1} / ${m2.stageQuestionTotal}`;
  updateHeader({ progressPct: (m2.answeredCount / m2.totalQuestions) * 100 });
  setFeedback('m2', '', '');
  $('#next-hint-m2').textContent = '';
  window.advanceFn = null;

  showM2SubPanel(stage);
  if (stage === 1) renderM2MC(topic);
  else if (stage === 2) renderM2Tiles(topic);
  else renderM2Type(topic);
  updateKeyHints();
}

function renderM2MC(topic) {
  const options = shuffle([{ label: 'Yes, I have', value: true }, { label: "No, I haven't", value: false }]);
  const buttons = buildOptionButtons($('#m2-mc'), options, { vertical: true });
  setupChoice(buttons, options, (item) => onM2Answer(item.value === topic.keyAnswer));
}

function renderM2Tiles(topic) {
  const tokens = m2AnswerTokens(topic.keyAnswer);
  const shuffledTokens = shuffle(tokens.map((t, i) => ({ text: t, id: i })));
  m2Tiles = { tokens, slots: new Array(tokens.length).fill(null), placedOrder: [], locked: false };

  const bankEl = $('#m2-tiles-bank');
  bankEl.innerHTML = '';
  m2Tiles.bankButtons = shuffledTokens.map(tok => {
    const btn = document.createElement('button');
    btn.className = 'word-tile';
    btn.type = 'button';
    btn.tabIndex = 0;
    btn.textContent = tok.text;
    btn.addEventListener('click', () => placeTile(tok, btn));
    bankEl.appendChild(btn);
    return btn;
  });
  renderSlots();
  if (m2Tiles.bankButtons[0]) m2Tiles.bankButtons[0].focus({ preventScroll: true });
}

function renderSlots() {
  $('#m2-tiles-slots').innerHTML = m2Tiles.slots
    .map(s => s ? `<span class="slot-tile">${s.text}</span>` : `<span class="slot-empty"></span>`)
    .join('');
}

function placeTile(tok, btn) {
  if (btn.disabled || m2Tiles.locked) return;
  const emptyIdx = m2Tiles.slots.findIndex(s => s === null);
  if (emptyIdx === -1) return;
  m2Tiles.slots[emptyIdx] = tok;
  m2Tiles.placedOrder.push({ tok, btn });
  btn.disabled = true;
  renderSlots();
  const nextBtn = m2Tiles.bankButtons.find(b => !b.disabled);
  if (nextBtn) nextBtn.focus({ preventScroll: true });
  if (m2Tiles.slots.every(s => s !== null)) checkM2Tiles();
}

function removeLastPlacedTile() {
  if (!m2Tiles || m2Tiles.locked || m2Tiles.placedOrder.length === 0) return;
  const last = m2Tiles.placedOrder.pop();
  const idx = m2Tiles.slots.lastIndexOf(last.tok);
  m2Tiles.slots[idx] = null;
  last.btn.disabled = false;
  renderSlots();
  last.btn.focus({ preventScroll: true });
}

function checkM2Tiles() {
  m2Tiles.locked = true;
  m2Tiles.bankButtons.forEach(b => b.disabled = true);
  const placedText = m2Tiles.slots.map(s => s.text).join('');
  const correctText = m2Tiles.tokens.join('');
  onM2Answer(placedText === correctText);
}

function renderM2Type(topic) {
  const input = $('#type-input');
  input.value = '';
  input.disabled = false;
  input.focus({ preventScroll: true });
  $('#type-submit-btn').onclick = submitTypeAnswer;
}

function submitTypeAnswer() {
  const input = $('#type-input');
  if (input.disabled) return;
  const topic = m2.current.topic;
  const val = normalizeAnswer(input.value);
  const accepted = topic.keyAnswer ? ['yes i have'] : ["no i haven't", 'no i havent', 'no i have not'];
  const isCorrect = accepted.includes(val);
  input.disabled = true;
  onM2Answer(isCorrect);
}

function onM2Answer(isCorrect) {
  const topic = m2.current.topic;
  m2.answeredCount++;
  m2.stageAnswered++;

  if (isCorrect) {
    m2.correctCount++;
    addStars(1);
    setFeedback('m2', `✅ Correct! "${m2AnswerSentence(topic)}"`, 'ok');
    avatarReact('happy');
    playDing();
  } else {
    const key = `${topic.verb}-${topic.object}`;
    m2.wrongTopics[key] = (m2.wrongTopics[key] || 0) + 1;
    setFeedback('m2', `Almost! The answer is: "${m2AnswerSentence(topic)}" 💪`, 'bad');
    avatarReact('encourage');
    playWrong();
  }

  updateHeader({ progressPct: (m2.answeredCount / m2.totalQuestions) * 100 });
  $('#next-hint-m2').textContent = 'Press Enter or Space for the next question ➜';
  window.advanceFn = nextM2Question;
}

// ═══════════════════════════════════════════════════════════════
// MODULE 3 — I'VE NEVER...
// ═══════════════════════════════════════════════════════════════
const M3_REACTIONS = ['Oh really?! 😲', 'Me too! 🙋', 'No way! 😮', 'Wow, tell me more! 🤩', 'That sounds fun! 🎉'];

function startM3() {
  STATE.screen = 'm3';
  showScreen('m3');
  const prompts = shuffle(NEVER_PROMPTS.slice());
  m3 = { queue: prompts.map(p => ({ prompt: p })), total: prompts.length, correctCount: 0, wrongPrompts: {} };
  updateHeader({ islandName: "🌋 Confession Bay — I've Never...", progressPct: 0 });
  nextM3Question();
}

function buildM3Options(verb) {
  const correct = verb.pastParticiple;
  const pool = new Set([verb.base, verb.pastSimple].filter(w => w !== correct));
  for (const o of shuffle(VERBS.filter(v => v.base !== verb.base))) {
    if (pool.size >= 2) break;
    if (o.pastParticiple !== correct) pool.add(o.pastParticiple);
  }
  const distractors = shuffle([...pool]).slice(0, 2);
  return shuffle([{ label: correct, correct: true }, ...distractors.map(d => ({ label: d, correct: false }))]);
}

function nextM3Question() {
  if (m3.queue.length === 0) { finishRound('m3'); return; }
  const item = m3.queue.shift();
  m3.current = item;
  const prompt = item.prompt;
  const verb = VERBS.find(v => v.base === prompt.verb);
  const answeredSoFar = m3.total - m3.queue.length - 1;

  $('#m3-emoji').textContent = prompt.emoji;
  $('#m3-progress').textContent = `Prompt ${answeredSoFar + 1} / ${m3.total}`;
  updateHeader({ progressPct: (answeredSoFar / m3.total) * 100 });
  $('#m3-sentence').innerHTML = `I've never <span class="blank">___ (${verb.base})</span> ${prompt.object}.`;
  $('#m3-react').textContent = '';
  setFeedback('m3', '', '');
  $('#next-hint-m3').textContent = '';
  window.advanceFn = null;

  const options = buildM3Options(verb);
  const buttons = buildOptionButtons($('#m3-options'), options);
  setupChoice(buttons, options, (opt) => onM3Answer(opt, verb, prompt));
}

function onM3Answer(chosenOpt, verb, prompt) {
  currentChoice.buttons.forEach((b, i) => { if (currentChoice.items[i].correct) b.classList.add('correct-answer'); });
  $('#m3-sentence').innerHTML = `I've never <span class="filled">${verb.pastParticiple}</span> ${prompt.object}.`;

  if (chosenOpt.correct) {
    m3.correctCount++;
    addStars(1);
    setFeedback('m3', '✅ Great grammar!', 'ok');
    avatarReact('happy');
    playDing();
  } else {
    const idx = currentChoice.items.indexOf(chosenOpt);
    currentChoice.buttons[idx].classList.add('wrong-answer');
    m3.wrongPrompts[verb.base] = (m3.wrongPrompts[verb.base] || 0) + 1;
    setFeedback('m3', `Close! The correct form is "${verb.pastParticiple}". 💪`, 'bad');
    avatarReact('encourage');
    playWrong();
  }

  $('#m3-react').textContent = pick(M3_REACTIONS);
  const answeredSoFar = m3.total - m3.queue.length;
  updateHeader({ progressPct: (answeredSoFar / m3.total) * 100 });
  $('#next-hint-m3').textContent = 'Press Enter or Space for the next confession ➜';
  window.advanceFn = nextM3Question;
}

// ═══════════════════════════════════════════════════════════════
// SESSION REPORT
// ═══════════════════════════════════════════════════════════════
function finishRound(moduleKey) {
  const starsThisRound = STATE.totalStars - roundStartStars;
  let wrongMap, total, correctCount;
  if (moduleKey === 'm1') { wrongMap = m1.wrongVerbs; total = m1.total; correctCount = m1.masteredBases.size; }
  else if (moduleKey === 'm2') { wrongMap = m2.wrongTopics; total = m2.totalQuestions; correctCount = m2.correctCount; }
  else { wrongMap = m3.wrongPrompts; total = m3.total; correctCount = m3.correctCount; }

  STATE.screen = 'report';
  showScreen('report');
  updateHeader({ islandName: '📋 Session Report', progressPct: 100 });

  const ratio = total > 0 ? correctCount / total : 1;
  let title = '💪 Nice try — keep practicing!';
  if (ratio >= 0.85) title = '🌟 Amazing time traveling!';
  else if (ratio >= 0.5) title = '👍 Great effort!';
  $('#report-title').textContent = title;
  $('#report-stars').textContent =
    `⭐ You earned ${starsThisRound} star${starsThisRound === 1 ? '' : 's'} this round! (Total: ${STATE.totalStars} ⭐)`;

  const needPractice = Object.entries(wrongMap).filter(([, c]) => c > 1).map(([k]) => k);
  const practiceBox = $('#report-practice');
  if (needPractice.length) {
    practiceBox.style.display = '';
    $('#report-practice-list').innerHTML = needPractice.map(k => `<span class="practice-chip">🔁 ${k}</span>`).join('');
  } else {
    practiceBox.style.display = 'none';
  }

  const moduleNum = moduleNumFromKey(moduleKey);
  const nextNum = (moduleNum % 3) + 1;
  const items = [
    { html: '🔁<br>Play Again', action: () => enterModule(moduleNum) },
    { html: '➡️<br>Next Island', action: () => enterModule(nextNum) },
    { html: '🏠<br>Menu', action: () => goToMenu() },
  ];
  const buttons = buildOptionButtons($('#report-options'), items, { className: 'report-btn' });
  setupChoice(buttons, items, (item) => item.action());
}

// ═══════════════════════════════════════════════════════════════
// KEYBOARD HINTS FOOTER
// ═══════════════════════════════════════════════════════════════
function updateKeyHints() {
  const el = $('#key-hints');
  let html;
  if (STATE.screen === 'menu') {
    html = `<kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> Choose Island &nbsp; <kbd>←</kbd><kbd>→</kbd> Move &nbsp; <kbd>Enter</kbd>/<kbd>Space</kbd> Start`;
  } else if (STATE.screen === 'm2' && m2 && m2.stage === 2) {
    html = `<kbd>Tab</kbd> Focus a word &nbsp; <kbd>Enter</kbd>/<kbd>Space</kbd> Place it &nbsp; <kbd>⌫</kbd> Undo &nbsp; <kbd>Esc</kbd> Menu`;
  } else if (STATE.screen === 'm2' && m2 && m2.stage === 3) {
    html = `Type your answer &nbsp; <kbd>Enter</kbd> Check &nbsp; <kbd>⌫</kbd> Delete &nbsp; <kbd>Esc</kbd> Menu`;
  } else if (STATE.screen === 'report') {
    html = `<kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> Choose &nbsp; <kbd>←</kbd><kbd>→</kbd> Move &nbsp; <kbd>Enter</kbd>/<kbd>Space</kbd> Confirm`;
  } else {
    html = `<kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> Choose Answer &nbsp; <kbd>←</kbd><kbd>→</kbd> Move &nbsp; <kbd>Enter</kbd>/<kbd>Space</kbd> Confirm &nbsp; <kbd>Esc</kbd> Menu`;
  }
  el.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// MODULE 2 KEY DISPATCH
// ═══════════════════════════════════════════════════════════════
function handleM2Key(e) {
  const st = m2.stage;
  if (st === 'intro' || st === 1) { handleChoiceKey(e); return; }
  if (st === 2) return; // Tab/Enter/Space handled natively by tile buttons; Backspace handled globally
  if (st === 3) {
    if (e.target.id === 'type-input') {
      if (e.key === 'Enter') { e.preventDefault(); submitTypeAnswer(); }
      return;
    }
    if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); if (window.advanceFn) window.advanceFn(); }
  }
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL KEYBOARD HANDLER
// ═══════════════════════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

  if (e.key === 'Backspace' && !inInput) {
    e.preventDefault(); // avoid accidental browser back-navigation
    if (STATE.screen === 'm2' && m2 && m2.stage === 2) removeLastPlacedTile();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    if (STATE.screen !== 'menu') goToMenu();
    return;
  }
  if (STATE.screen === 'm2') { handleM2Key(e); return; }
  handleChoiceKey(e);
});

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
function init() {
  loadProgress();
  syncHeaderStars();
  goToMenu();
}
document.addEventListener('DOMContentLoaded', init);
