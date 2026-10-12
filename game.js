const crowd = document.querySelector('.people');
const street = document.querySelector('.street');
const player = document.querySelector('.walker--player');
const futureSpace = document.querySelector('.future-space');
const playerZone = document.querySelector('.zone--player');
const scoreValue = document.querySelector('#score');
const attemptsBoard = document.querySelector('.attempts-board');
const attemptHearts = [...document.querySelectorAll('.attempt-heart')];
const feedback = document.querySelector('.score-feedback');
const game = document.querySelector('.game');
const playButton = document.querySelector('.play-button');
const restartButton = document.querySelector('.restart-button');
const menuButton = document.querySelector('.menu-button');
const themeButton = document.querySelector('.theme-button');
const gameThemeButton = document.querySelector('.game-theme-button');
const menuScreen = document.querySelector('.menu-screen');
const rulesButton = document.querySelector('.rules-button');
const rulesOverlay = document.querySelector('.rules-overlay');
const rulesClose = document.querySelector('.rules-close');
const jailCharacter = document.querySelector('.jail-character');
const finalScore = document.querySelector('.final-score strong');
const colors = ['#bf5748', '#465c87', '#d8a13f', '#47786c', '#a35d79', '#6b6254'];
const arrowDirections = [
  { code: 'ArrowUp', symbol: '↑' },
  { code: 'ArrowDown', symbol: '↓' },
  { code: 'ArrowLeft', symbol: '←' },
  { code: 'ArrowRight', symbol: '→' }
];
const startingZoneWidths = [78, 78, 86, 86, 94, 94, 102, 102, 112];
let gameStartedAt = 0;
let spawnTimer;
let gameStarted = false;
let score = 0;
let attempts = 3;
let feedbackTimer;
let currentTheme = 'city';

function spawnPedestrian() {
  if (!gameStarted) return;
  const walker = document.createElement('div');
  walker.className = 'walker pedestrian';
  const elapsedSeconds = (performance.now() - gameStartedAt) / 1000;
  const speedTier = Math.floor(score / 50);
  const speedMultiplier = 1 + speedTier * 0.1;
  walker.style.setProperty('--duration', `${10 / speedMultiplier}s`);
  walker.style.setProperty('--body-color', colors[Math.floor(Math.random() * colors.length)]);
  const zone = document.createElement('div');
  zone.className = 'zone zone--pedestrian';
  zone.setAttribute('aria-hidden', 'true');
  const direction = arrowDirections[Math.floor(Math.random() * arrowDirections.length)];
  zone.dataset.key = direction.code;
  zone.innerHTML = `<span class="zone-arrow">${direction.symbol}</span>`;
  const startingWidth = startingZoneWidths[Math.floor(Math.random() * startingZoneWidths.length)];
  const growth = elapsedSeconds / (elapsedSeconds + 180);
  const maximumWidth = playerZone.getBoundingClientRect().width - 3;
  zone.style.width = `${startingWidth + (maximumWidth - startingWidth) * growth}px`;
  futureSpace.append(zone);
  zone.walker = walker;
  walker.zone = zone;
  walker.innerHTML = `
    <span class="person-head"></span><span class="person-body"></span>
    <span class="person-arm person-arm--left"></span><span class="person-arm person-arm--right"></span>
    <span class="person-leg person-leg--left"></span><span class="person-leg person-leg--right"></span>`;
  crowd.append(walker);
  walker.wasResolved = false;
  walker.addEventListener('animationend', event => {
    if (event.target !== walker) return;
    if (gameStarted && !walker.wasResolved) loseHeart('PASS  −1 HEART');
    walker.zone?.remove();
    walker.remove();
  });
}

function followCharacters() {
  const streetBounds = street.getBoundingClientRect();
  const panelBounds = futureSpace.getBoundingClientRect();
  const syncZone = (walker, zone) => {
    const bounds = walker.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2 - streetBounds.left;
    zone.style.left = `${centerX * panelBounds.width / streetBounds.width}px`;
  };

  syncZone(player, playerZone);
  crowd.querySelectorAll('.pedestrian').forEach(walker => {
    if (walker.zone) {
      syncZone(walker, walker.zone);
      const box = walker.zone.getBoundingClientRect();
      const target = playerZone.getBoundingClientRect();
      const fullyInside = box.left >= target.left && box.right <= target.right &&
        box.top >= target.top && box.bottom <= target.bottom;
      walker.zone.classList.toggle('is-in-player-zone', fullyInside);
    }
  });
  window.requestAnimationFrame(followCharacters);
}

function scoreAttempt(keyCode) {
  const target = playerZone.getBoundingClientRect();
  const inside = [...futureSpace.querySelectorAll('.zone--pedestrian')].filter(zone => {
    const box = zone.getBoundingClientRect();
    return !zone.dataset.picked && zone.dataset.key === keyCode && box.left >= target.left && box.right <= target.right &&
      box.top >= target.top && box.bottom <= target.bottom;
  });

  if (inside.length) {
    const points = inside.reduce((total, zone) => total + Math.max(1, Math.round(zone.getBoundingClientRect().width / target.width * 12)), 0);
    score += points;
    inside.forEach(zone => {
      zone.dataset.picked = 'true';
      zone.classList.add('is-picked');
      zone.walker.wasResolved = true;
    });
    showFeedback(`+$${points} CASH`, 'is-hit');
  } else {
    dismissNearestRectangle(target);
    loseHeart('MISS  −1 HEART');
  }
  scoreValue.textContent = `$${score}`;
}

function dismissNearestRectangle(target) {
  const candidates = [...futureSpace.querySelectorAll('.zone--pedestrian')]
    .filter(zone => !zone.dataset.picked);
  let nearest = null;
  let nearestDistance = Infinity;

  for (const zone of candidates) {
    const box = zone.getBoundingClientRect();
    const minCenter = target.left + box.width / 2;
    const maxCenter = target.right - box.width / 2;
    const center = (box.left + box.right) / 2;
    const distance = center < minCenter ? minCenter - center : center > maxCenter ? center - maxCenter : 0;
    if (distance < nearestDistance) {
      nearest = zone;
      nearestDistance = distance;
    }
  }

  if (nearest) {
    nearest.walker.wasResolved = true;
    nearest.walker.zone = null;
    nearest.remove();
  }
}

function loseHeart(message) {
  if (!gameStarted) return;
  attempts = Math.max(0, attempts - 1);
  updateAttempts();
  showFeedback(message, 'is-miss');
  if (attempts === 0) endGame();
}

function updateAttempts() {
  attemptHearts.forEach((heart, index) => heart.classList.toggle('is-lost', index >= attempts));
  attemptsBoard.setAttribute('aria-label', `${attempts} ${attempts === 1 ? 'attempt' : 'attempts'} remaining`);
}

function clearRun() {
  window.clearInterval(spawnTimer);
  crowd.replaceChildren();
  futureSpace.querySelectorAll('.zone--pedestrian').forEach(zone => zone.remove());
  score = 0;
  attempts = 3;
  scoreValue.textContent = `$${score}`;
  updateAttempts();
  window.clearTimeout(feedbackTimer);
  feedback.textContent = '';
  feedback.className = 'score-feedback';
}

function startGame() {
  clearRun();
  gameStarted = true;
  gameStartedAt = performance.now();
  document.querySelector('.game-over-screen').setAttribute('aria-hidden', 'true');
  game.classList.remove('is-over');
  game.classList.add('is-playing');
  spawnPedestrian();
  spawnTimer = window.setInterval(spawnPedestrian, 2100);
}

function endGame() {
  gameStarted = false;
  window.clearInterval(spawnTimer);
  finalScore.textContent = `$${score}`;
  const jailedPlayer = player.cloneNode(true);
  jailedPlayer.removeAttribute('aria-label');
  jailedPlayer.classList.add('jail-walker');
  jailCharacter.replaceChildren(jailedPlayer);
  game.classList.add('is-over');
  document.querySelector('.game-over-screen').setAttribute('aria-hidden', 'false');
}

function returnToMenu() {
  gameStarted = false;
  clearRun();
  game.classList.remove('is-playing', 'is-over');
  document.querySelector('.game-over-screen').setAttribute('aria-hidden', 'true');
}

function toggleTheme() {
  const themes = ['city', 'alleyway', 'neon-city'];
  const labels = { city: 'City', alleyway: 'Alleyway', 'neon-city': 'Neon City' };
  currentTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
  for (const theme of themes) {
    game.classList.toggle(`is-${theme}`, currentTheme === theme && theme !== 'city');
    menuScreen.classList.toggle(`is-${theme}`, currentTheme === theme && theme !== 'city');
  }
  const label = labels[currentTheme];
  const nextTheme = labels[themes[(themes.indexOf(currentTheme) + 1) % themes.length]];
  themeButton.setAttribute('aria-label', `Current theme: ${label}. Activate to change to ${nextTheme}.`);
  gameThemeButton.setAttribute('aria-label', `Current theme: ${label}. Activate to change to ${nextTheme}.`);
  gameThemeButton.textContent = `THEME: ${label.toUpperCase()}`;
}

function closeRules() {
  menuScreen.classList.remove('show-rules');
  rulesOverlay.setAttribute('aria-hidden', 'true');
  rulesButton.setAttribute('aria-expanded', 'false');
  rulesButton.focus();
}

function showFeedback(message, kind) {
  feedback.textContent = message;
  feedback.className = `score-feedback ${kind}`;
  window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    feedback.textContent = '';
    feedback.className = 'score-feedback';
  }, 900);
}

// Keep arrivals staggered so pedestrians pass in a loose, natural stream.
window.requestAnimationFrame(followCharacters);

playButton.addEventListener('click', () => {
  if (!gameStarted) startGame();
});
restartButton.addEventListener('click', startGame);
menuButton.addEventListener('click', returnToMenu);
themeButton.addEventListener('click', toggleTheme);
gameThemeButton.addEventListener('click', toggleTheme);
rulesButton.addEventListener('click', () => {
  menuScreen.classList.add('show-rules');
  rulesOverlay.setAttribute('aria-hidden', 'false');
  rulesButton.setAttribute('aria-expanded', 'true');
  rulesClose.focus();
});
rulesClose.addEventListener('click', closeRules);
rulesOverlay.addEventListener('click', event => {
  if (event.target === rulesOverlay) closeRules();
});

window.addEventListener('keydown', event => {
  if (event.code === 'Escape' && menuScreen.classList.contains('show-rules')) {
    closeRules();
    return;
  }
  if (arrowDirections.some(direction => direction.code === event.code) && !event.repeat) {
    event.preventDefault();
    if (gameStarted) scoreAttempt(event.code);
  }
});
