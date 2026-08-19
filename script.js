const holes = [...document.querySelectorAll('.hole')];
const mainMenu = document.querySelector('#mainMenu');
const menuStart = document.querySelector('#menuStart');
const settingsButton = document.querySelector('#settingsButton');
const settingsPanel = document.querySelector('#settingsPanel');
const soundToggle = document.querySelector('#soundToggle');
const modeButtons = [...document.querySelectorAll('.mode-option')];
const countdown = document.querySelector('#countdown');
const countdownNumber = document.querySelector('#countdownNumber');
const gameShell = document.querySelector('.game-shell');
const loseScreen = document.querySelector('#loseScreen');
const roastEl = document.querySelector('#roast');
const lossPlay = document.querySelector('#lossPlay');
const lossMenu = document.querySelector('#lossMenu');
const pauseButton = document.querySelector('#pauseButton');
const pauseScreen = document.querySelector('#pauseScreen');
const resumeButton = document.querySelector('#resumeButton');
const pauseMenuButton = document.querySelector('#pauseMenuButton');
const loseReason = document.querySelector('#loseReason');
const boomText = document.querySelector('#boomText');
const winScreen = document.querySelector('#winScreen');
const winsEl = document.querySelector('#wins');
const winPlay = document.querySelector('#winPlay');
const winMenu = document.querySelector('#winMenu');
const scoreEl = document.querySelector('#score');
const timeEl = document.querySelector('#time');
const comboEl = document.querySelector('#combo');
const bestEl = document.querySelector('#best');
const missesEl = document.querySelector('#misses');
const message = document.querySelector('#message');
const startButton = document.querySelector('#startButton');
const confetti = document.querySelector('#confetti');
const sounds = {
  hit: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  start: 'https://assets.mixkit.co/active_storage/sfx/2580/2580-preview.mp3',
  miss: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3'
};
let score = 0, combo = 0, misses = 0, bombHits = 0, wins = 0, elapsed = 0, best = 0;
let gameOn = false, paused = false, activeMoles = new Map(), timerId, spawnId, challengeTimer, challengeClock;
let soundEnabled = localStorage.getItem('whackSound') !== 'off';
let mode = 'medium', challengeUsed = false, challengeHits = 0;
const modeSettings = { easy: { visible: 2500, exit: .8 }, medium: { visible: 1750, exit: .6 }, hard: { visible: 1500, exit: .5 }, impossible: { visible: 650, exit: .1 } };
const roasts = [
  'the moles are celebrating in your grass patch.',
  'that was less whack-a-mole, more watch-a-mole.',
  'the overworld would like its dirt back.',
  'even the bomb mole thinks you need practice.',
  'your combo went on vacation and never came back.',
  'the moles have officially outplayed you.',
  'that round had the survival skills of a decorative flower.'
];

function synthPop() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain();
  oscillator.type = 'square'; oscillator.frequency.setValueAtTime(180, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(70, context.currentTime + .09);
  gain.gain.setValueAtTime(.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(.16, context.currentTime + .008); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .1);
  oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .11);
}
const playSound = (name) => { if (!soundEnabled) return; const audio = new Audio(sounds[name]); audio.volume = name === 'miss' ? .22 : .42; audio.onerror = name === 'hit' ? synthPop : null; audio.play().catch(() => { if (name === 'hit') synthPop(); }); };
const displayScore = () => score < 0 ? `-${String(Math.abs(score)).padStart(2, '0')}` : String(score).padStart(3, '0');
const update = () => { scoreEl.textContent = displayScore(); timeEl.textContent = elapsed; comboEl.textContent = combo; bestEl.textContent = best; missesEl.textContent = misses; winsEl.textContent = wins; };
const popMessage = (text, isCombo = false) => { message.textContent = text; message.classList.toggle('combo-pop', isCombo); if (isCombo) { void message.offsetWidth; message.classList.add('combo-pop'); } };

function finishIfNeeded() { if (misses >= 10) endGame('10 misses in a row, round over'); }
function registerMiss(label = 'missed, no penalty') { combo = 0; misses++; playSound('miss'); popMessage(label); update(); finishIfNeeded(); }
function expireMole(hole, mole) { if (!activeMoles.has(hole) || paused) return; activeMoles.delete(hole); hole.classList.remove('up', 'golden', 'bomb', 'blast'); registerMiss(mole.golden ? 'golden missed, no penalty' : 'missed, no penalty'); }

function clearChallenge() { clearTimeout(challengeTimer); clearInterval(challengeClock); challengeTimer = null; challengeClock = null; }
function startGoldenChallenge() {
  challengeUsed = true; clearTimeout(spawnId); activeMoles.forEach(mole => clearTimeout(mole.timeout)); activeMoles.clear(); holes.forEach(hole => hole.classList.remove('up', 'golden', 'angel', 'bomb', 'blast'));
  challengeHits = 0; const chosen = [...holes].sort(() => Math.random() - .5).slice(0, 3);
  chosen.forEach(hole => { const mole = { golden:true, challenge:true, until:Date.now() + 2000, timeout:null }; activeMoles.set(hole, mole); hole.classList.add('up', 'golden'); });
  const started = Date.now(); popMessage('GOLDEN TRIO · 2.0s', true);
  challengeClock = setInterval(() => { popMessage(`GOLDEN TRIO · ${Math.max(0, (2000 - (Date.now() - started)) / 1000).toFixed(1)}s`, true); }, 100);
  challengeTimer = setTimeout(() => { clearChallenge(); activeMoles.clear(); holes.forEach(hole => hole.classList.remove('up', 'golden')); popMessage('trio missed'); spawnMole(); }, 2000);
}
function summonChallengeAngel() {
  const hole = holes[Math.floor(Math.random() * holes.length)]; const mole = { golden:true, angel:true, challengeAngel:true, until:Date.now() + 650, timeout:null }; activeMoles.set(hole, mole); hole.classList.add('up', 'golden', 'angel'); popMessage('ANGEL MOLE · NOW!');
  mole.timeout = setTimeout(() => { if (!activeMoles.has(hole)) return; activeMoles.delete(hole); hole.classList.remove('up', 'golden', 'angel'); popMessage('angel escaped'); spawnMole(); }, 650);
}

function spawnMole() {
  if (!gameOn) return;
  const available = holes.filter(hole => !activeMoles.has(hole));
  if (available.length) {
    const hole = available[Math.floor(Math.random() * available.length)];
    const angel = Math.random() < .001;
    const golden = !angel && Math.random() < .01;
    const blast = !angel && !golden && Math.floor(Math.random() * 75) === 0;
    const bomb = !angel && !blast && Math.floor(Math.random() * 20) === 0;
    const settings = modeSettings[mode];
    const visibleFor = settings.visible;
    const mole = { golden: golden || angel, angel, bomb, blast, until: Date.now() + visibleFor, timeout: null };
    activeMoles.set(hole, mole); hole.style.setProperty('--exit-speed', `${settings.exit}s`); hole.classList.add('up'); hole.classList.toggle('golden', golden || angel); hole.classList.toggle('angel', angel); hole.classList.toggle('bomb', bomb); hole.classList.toggle('blast', blast);
    mole.timeout = setTimeout(() => {
      if (!activeMoles.has(hole)) return;
      expireMole(hole, mole);
    }, visibleFor);
  }
  const speedTier = Math.floor(elapsed / 10);
  const nextSpawn = Math.random() < .5 ? Math.max(250, 500 - speedTier * 45) : Math.max(350, 1000 - speedTier * 90);
  spawnId = setTimeout(spawnMole, nextSpawn);
}

function endGame(reason = 'round over', roastOverride = '') {
  gameOn = false; paused = false; clearInterval(timerId); clearTimeout(spawnId);
  activeMoles.forEach((mole, hole) => { clearTimeout(mole.timeout); hole.classList.remove('up', 'golden', 'angel', 'bomb', 'blast', 'scared', 'blast-charge', 'boom'); });
  holes.forEach(hole => hole.classList.remove('up', 'golden', 'angel', 'bomb', 'blast', 'scared', 'blast-charge', 'boom'));
  activeMoles.clear(); startButton.disabled = false; startButton.innerHTML = 'Play again <span>↻</span>';
  clearChallenge(); popMessage(reason); burst(); update(); loseReason.textContent = reason === 'BOOM!' ? 'you clicked the volatile bomb mole.' : reason; roastEl.textContent = roastOverride || roasts[Math.floor(Math.random() * roasts.length)]; loseScreen.hidden = false;
}

function startGame() {
  clearInterval(timerId); clearTimeout(spawnId); activeMoles.forEach((mole, hole) => { clearTimeout(mole.timeout); hole.classList.remove('up', 'golden', 'angel', 'bomb', 'blast', 'scared', 'blast-charge', 'boom'); }); activeMoles.clear();
  clearChallenge(); score = 0; combo = 0; misses = 0; bombHits = 0; elapsed = 0; best = 0; challengeUsed = false; challengeHits = 0; paused = false; gameOn = true; update(); playSound('start');
  popMessage('round started'); startButton.innerHTML = 'Playing <span>●</span>'; startButton.disabled = true;
  spawnMole();
  timerId = setInterval(() => { elapsed++; update(); }, 1000);
}

function burst() { for (let i = 0; i < 18; i++) { const s = document.createElement('i'); s.className = 'spark'; s.style.left = '50%'; s.style.top = '43%'; s.style.setProperty('--x', `${Math.random() * 320 - 160}px`); s.style.setProperty('--y', `${Math.random() * 260 - 130}px`); confetti.appendChild(s); setTimeout(() => s.remove(), 850); } }
function hitFeedback(hole, text) { hole.classList.add('splatted'); const label = document.createElement('span'); label.className = 'hit-feedback'; label.textContent = text; hole.appendChild(label); setTimeout(() => { hole.classList.remove('splatted'); label.remove(); }, 650); }
function triggerVolatileBomb(hole) {
  gameOn = false; clearInterval(timerId); clearTimeout(spawnId);
  activeMoles.forEach((mole, activeHole) => { clearTimeout(mole.timeout); if (activeHole !== hole) activeHole.classList.add('scared'); });
  activeMoles.clear(); hole.classList.add('up', 'blast-charge');
  setTimeout(() => { hole.classList.add('boom'); boomText.hidden = false; boomText.classList.add('show'); }, 850);
  setTimeout(() => { boomText.classList.remove('show'); boomText.hidden = true; hole.classList.remove('blast-charge', 'boom', 'scared'); endGame('BOOM!', 'you saw the bomb and still clicked it. incredible work.'); }, 1250);
}

holes.forEach(hole => hole.addEventListener('click', () => {
  if (!gameOn) return;
  const mole = activeMoles.get(hole);
  if (!mole || Date.now() > mole.until) { registerMiss(); return; }
  clearTimeout(mole.timeout); activeMoles.delete(hole); hole.classList.remove('up', 'golden', 'angel', 'bomb', 'blast'); hole.classList.add('hit'); setTimeout(() => hole.classList.remove('hit'), 300);
  if (mole.challenge) { score += 50; misses = 0; challengeHits++; hitFeedback(hole, '+50'); playSound('hit'); update(); if (challengeHits === 3) { clearChallenge(); activeMoles.clear(); holes.forEach(item => item.classList.remove('up', 'golden')); popMessage('TRIO CLEARED!', true); summonChallengeAngel(); } else popMessage(`GOLDEN ${challengeHits}/3`); return; }
  if (mole.challengeAngel || mole.angel) { wins++; update(); winGame(); return; }
  if (mole.blast) { triggerVolatileBomb(hole); return; }
  if (mole.bomb) { score -= 20; combo = 0; bombHits++; popMessage('BOMB MOLE -20'); playSound('miss'); if (bombHits > 5) endGame('too many bombs, round over'); }
  else { score += mole.golden ? 50 : 5; misses = 0; combo++; best = Math.max(best, score); hitFeedback(hole, mole.golden ? '+50' : '+5'); playSound('hit'); if (combo >= 3) { popMessage('COMBO!', true); burst(); } else popMessage(mole.golden ? '+50 GOLDEN MOLE' : '+5 points'); }
  update();
  if (!challengeUsed && score >= 500 && !mole.bomb && !mole.blast) startGoldenChallenge();
}));

startButton.addEventListener('click', startGame);
modeButtons.forEach(button => button.addEventListener('click', () => { if (gameOn) return; mode = button.dataset.mode; modeButtons.forEach(item => item.classList.toggle('active', item === button)); }));
lossPlay.addEventListener('click', () => { loseScreen.hidden = true; startGame(); });
lossMenu.addEventListener('click', () => { loseScreen.hidden = true; gameShell.classList.remove('is-visible'); mainMenu.hidden = false; startButton.disabled = false; startButton.innerHTML = 'Start round <span>→</span>'; });
pauseButton.addEventListener('click', () => {
  if (!gameOn || paused) return;
  paused = true; gameOn = false; clearInterval(timerId); clearTimeout(spawnId);
  activeMoles.forEach(mole => { clearTimeout(mole.timeout); mole.remaining = Math.max(0, mole.until - Date.now()); });
  pauseScreen.hidden = false;
});
resumeButton.addEventListener('click', () => {
  if (!paused) return;
  paused = false; gameOn = true; pauseScreen.hidden = true;
  activeMoles.forEach((mole, hole) => { mole.until = Date.now() + mole.remaining; mole.timeout = setTimeout(() => expireMole(hole, mole), mole.remaining); });
  spawnMole(); timerId = setInterval(() => { elapsed++; update(); }, 1000);
});
pauseMenuButton.addEventListener('click', () => { paused = false; gameOn = false; clearInterval(timerId); clearTimeout(spawnId); activeMoles.forEach(mole => clearTimeout(mole.timeout)); activeMoles.clear(); pauseScreen.hidden = true; gameShell.classList.remove('is-visible'); mainMenu.hidden = false; startButton.disabled = false; startButton.innerHTML = 'Start round <span>→</span>'; });
function winGame() { gameOn = false; paused = false; clearChallenge(); clearInterval(timerId); clearTimeout(spawnId); activeMoles.forEach(mole => clearTimeout(mole.timeout)); activeMoles.clear(); holes.forEach(hole => hole.classList.remove('up', 'golden', 'angel', 'bomb', 'blast', 'scared', 'blast-charge', 'boom')); winScreen.classList.add('celebrate'); winScreen.hidden = false; burst(); setTimeout(() => winScreen.classList.remove('celebrate'), 900); }
winPlay.addEventListener('click', () => { winScreen.hidden = true; startGame(); });
winMenu.addEventListener('click', () => { winScreen.hidden = true; gameShell.classList.remove('is-visible'); mainMenu.hidden = false; startButton.disabled = false; startButton.innerHTML = 'Start round <span>→</span>'; });
settingsButton.addEventListener('click', () => {
  const isHidden = settingsPanel.hidden;
  settingsPanel.hidden = !isHidden; settingsButton.setAttribute('aria-expanded', String(isHidden));
});
soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled; localStorage.setItem('whackSound', soundEnabled ? 'on' : 'off');
  soundToggle.textContent = soundEnabled ? 'On' : 'Off'; soundToggle.classList.toggle('on', soundEnabled); soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  if (soundEnabled) playSound('hit');
});
menuStart.addEventListener('click', () => {
  mainMenu.hidden = true; gameShell.classList.add('is-visible'); countdown.hidden = false; menuStart.disabled = true;
  let number = 3; countdownNumber.textContent = number;
  const countdownId = setInterval(() => {
    number--;
    if (number > 0) countdownNumber.textContent = number;
    else { clearInterval(countdownId); countdownNumber.textContent = 'GO'; setTimeout(() => { countdown.hidden = true; menuStart.disabled = false; startGame(); }, 450); }
  }, 1000);
});
soundToggle.textContent = soundEnabled ? 'On' : 'Off'; soundToggle.classList.toggle('on', soundEnabled); soundToggle.setAttribute('aria-pressed', String(soundEnabled));
update();
