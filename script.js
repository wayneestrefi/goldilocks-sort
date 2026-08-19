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
let score = 0, combo = 0, misses = 0, bombHits = 0, elapsed = 0, best = 0;
let gameOn = false, activeMoles = new Map(), timerId, spawnId;
let soundEnabled = localStorage.getItem('whackSound') !== 'off';
let mode = 'medium';
const modeSettings = { easy: { visible: 2500, exit: .8 }, medium: { visible: 1750, exit: .6 }, hard: { visible: 1500, exit: .5 }, impossible: { visible: 650, exit: .1 } };

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
const update = () => { scoreEl.textContent = displayScore(); timeEl.textContent = elapsed; comboEl.textContent = combo; bestEl.textContent = best; missesEl.textContent = misses; };
const popMessage = (text, isCombo = false) => { message.textContent = text; message.classList.toggle('combo-pop', isCombo); if (isCombo) { void message.offsetWidth; message.classList.add('combo-pop'); } };

function finishIfNeeded() { if (misses >= 10) endGame('10 misses in a row, round over'); }
function registerMiss(label = 'missed, no penalty') { combo = 0; misses++; playSound('miss'); popMessage(label); update(); finishIfNeeded(); }

function spawnMole() {
  if (!gameOn) return;
  const available = holes.filter(hole => !activeMoles.has(hole));
  if (available.length) {
    const hole = available[Math.floor(Math.random() * available.length)];
    const golden = Math.random() < .01;
    const bomb = !golden && Math.random() < .05;
    const settings = modeSettings[mode];
    const visibleFor = settings.visible;
    const mole = { golden, bomb, until: Date.now() + visibleFor, timeout: null };
    activeMoles.set(hole, mole); hole.style.setProperty('--exit-speed', `${settings.exit}s`); hole.classList.add('up'); hole.classList.toggle('golden', golden); hole.classList.toggle('bomb', bomb);
    mole.timeout = setTimeout(() => {
      if (!activeMoles.has(hole)) return;
      activeMoles.delete(hole); hole.classList.remove('up', 'golden', 'bomb');
      registerMiss(golden ? 'golden missed, no penalty' : 'missed, no penalty');
    }, visibleFor);
  }
  const speedTier = Math.floor(elapsed / 10);
  const nextSpawn = Math.random() < .5 ? Math.max(250, 500 - speedTier * 45) : Math.max(350, 1000 - speedTier * 90);
  spawnId = setTimeout(spawnMole, nextSpawn);
}

function endGame(reason = 'round over') {
  gameOn = false; clearInterval(timerId); clearTimeout(spawnId);
  activeMoles.forEach((mole, hole) => { clearTimeout(mole.timeout); hole.classList.remove('up', 'golden', 'bomb'); });
  activeMoles.clear(); startButton.disabled = false; startButton.innerHTML = 'Play again <span>↻</span>';
  popMessage(reason); burst(); update();
}

function startGame() {
  clearInterval(timerId); clearTimeout(spawnId); activeMoles.forEach((mole, hole) => { clearTimeout(mole.timeout); hole.classList.remove('up', 'golden', 'bomb'); }); activeMoles.clear();
  score = 0; combo = 0; misses = 0; bombHits = 0; elapsed = 0; best = 0; gameOn = true; update(); playSound('start');
  popMessage('round started'); startButton.innerHTML = 'Playing <span>●</span>'; startButton.disabled = true;
  spawnMole();
  timerId = setInterval(() => { elapsed++; update(); }, 1000);
}

function burst() { for (let i = 0; i < 18; i++) { const s = document.createElement('i'); s.className = 'spark'; s.style.left = '50%'; s.style.top = '43%'; s.style.setProperty('--x', `${Math.random() * 320 - 160}px`); s.style.setProperty('--y', `${Math.random() * 260 - 130}px`); confetti.appendChild(s); setTimeout(() => s.remove(), 850); } }
function hitFeedback(hole, text) { hole.classList.add('splatted'); const label = document.createElement('span'); label.className = 'hit-feedback'; label.textContent = text; hole.appendChild(label); setTimeout(() => { hole.classList.remove('splatted'); label.remove(); }, 650); }

holes.forEach(hole => hole.addEventListener('click', () => {
  if (!gameOn) return;
  const mole = activeMoles.get(hole);
  if (!mole || Date.now() > mole.until) { registerMiss(); return; }
  clearTimeout(mole.timeout); activeMoles.delete(hole); hole.classList.remove('up', 'golden', 'bomb'); hole.classList.add('hit'); setTimeout(() => hole.classList.remove('hit'), 300);
  if (mole.bomb) { score -= 20; combo = 0; bombHits++; popMessage('BOMB MOLE -20'); playSound('miss'); if (bombHits > 5) endGame('too many bombs, round over'); }
  else { score += mole.golden ? 50 : 5; misses = 0; combo++; best = Math.max(best, score); hitFeedback(hole, mole.golden ? '+50' : '+5'); playSound('hit'); if (combo >= 3) { popMessage('COMBO!', true); burst(); } else popMessage(mole.golden ? '+50 GOLDEN MOLE' : '+5 points'); }
  update();
}));

startButton.addEventListener('click', startGame);
modeButtons.forEach(button => button.addEventListener('click', () => { if (gameOn) return; mode = button.dataset.mode; modeButtons.forEach(item => item.classList.toggle('active', item === button)); }));
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
