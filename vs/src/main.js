import './style.css'

import { tracks } from './tracks.js'
import { createTrackEngine } from './trackEngine.js'

// Індекс машин за рівнями (1–70)
const CAR_TIERS = [
  { minLvl: 1, name: 'BMW', rank: 'F', bg: '#c2e5ff', img: './car-1.png', carColor: '#d7ccc8' },
  { minLvl: 10, name: 'Porsche', rank: 'E', bg: '#b5c8ff', img: './car-10.png', carColor: '#cfd8dc' },
  { minLvl: 20, name: 'Volkswagen', rank: 'C', bg: '#bca8f8', img: './car-20.png', carColor: '#e53935' },
  { minLvl: 30, name: 'BMW', rank: 'D', bg: '#cc9ef8', img: './car-30.png', carColor: '#263238' },
  { minLvl: 40, name: 'Ferrari', rank: 'B', bg: '#b86bf8', img: './car-40.png', carColor: '#ff1744' },
  { minLvl: 50, name: 'Rezvani', rank: 'A', bg: '#c938f8', img: './car-50.png', carColor: '#78909c' },
  { minLvl: 60, name: 'Mercedes-Benz', rank: 'S', bg: '#520b70', img: './car-60.png', carColor: '#311b92' },
  { minLvl: 70, name: 'Ferrari', rank: 'S+', bg: '#210333', img: './car-70.png', carColor: '#ffab91' },
]

// Стандартні значення нової гри
const defaultGameState = {
  carLvl: 1,
  trackLvl: 1,

  speed: 0,
  maxSpeed: 150,
  clickBoost: 15,

  position: 0,
  money: 0,
  musicEnabled: true,

  botDifficulty: 'easy',
  botCooldownEnd: 0,
}

const BOT_DIFFICULTIES = {
  easy: { label: 'Easy', speed: 95, winReward: 100 },
  medium: { label: 'Medium', speed: 175, winReward: 350 },
  hard: { label: 'Hard', speed: 270, winReward: 500 },
}

const MATCH_DURATION = 120
const COOLDOWN_DURATION = 300
const LOSE_PENALTY = 250

function loadGame() {
  const savedGame = localStorage.getItem('carRacingSave')

  if (savedGame) {
    try {
      const parsed = JSON.parse(savedGame)
      return {
        ...defaultGameState,
        ...parsed,
        carLvl: Math.min(70, Math.max(1, Number(parsed.carLvl) || 1)),
        speed: 0,
        clickBoost: Number.isFinite(parsed.clickBoost) ? parsed.clickBoost : 15,
        position: Number.isFinite(parsed.position) ? parsed.position : 0,
        money: Number.isFinite(parsed.money) ? parsed.money : 0,
        botCooldownEnd: Number(parsed.botCooldownEnd) || 0,
      }
    } catch (error) {
      console.error('Помилка завантаження збереження:', error)
    }
  }

  return { ...defaultGameState }
}

const gameState = loadGame()

let isMatchActive = false
let matchTimeLeft = MATCH_DURATION
let playerLaps = 0
let botLaps = 0
let botPosition = 0

function saveGame() {
  localStorage.setItem(
    'carRacingSave',
    JSON.stringify(gameState)
  )
}

function getCurrentCarTier(level) {
  let current = CAR_TIERS[0]
  for (let i = 0; i < CAR_TIERS.length; i++) {
    if (level >= CAR_TIERS[i].minLvl) {
      current = CAR_TIERS[i]
    }
  }
  return current
}

function getCarImageUrl(relativePath) {
  try {
    return new URL(relativePath, import.meta.url).href
  } catch {
    return ''
  }
}

document.querySelector('#app').innerHTML = `
<div class="layout">
  <aside class="sidebar">
    <div class="top-bar">
      <div class="top-left-controls">
        <button id="helpBtn" title="Character Goal"><span class="help-icon">?</span></button>
        <button id="resetBtn" title="Reset Progress"><span class="reset-icon">↻</span></button>
      </div>
      <button id="toggleMusic">Music: OFF</button>
    </div>

    <div id="storyBox" class="story-popup hidden">
      Your goal is to earn <strong>1,000,000</strong> in a small, unpopular business: <strong>racing</strong>.
    </div>

    <div class="title-wrapper">
      <div class="racing-stripe"></div>
      <h1>🏁 Salon Falyali 🏁</h1>
      <div class="racing-stripe"></div>
    </div>

    <div class="stats-box">
      <p>💰 Money: <span id="money">0</span></p>
      <p>🏎️ Speed: <span id="speed">0</span> km/h</p>
    </div>

    <div id="matchPanel" class="match-panel hidden">
      <div class="match-timer">⏱️ Time: <span id="matchTimer">02:00</span></div>
      <div class="match-laps">
        <span>🔴 You: <strong id="playerLaps">0</strong> laps</span>
        <span>🔵 Bot: <strong id="botLaps">0</strong> laps</span>
      </div>
    </div>

    <button id="accelerate">⚡ Accelerate</button>

    <button id="upgradeCar">🔧 Upgrade Car (20)</button>

    <button id="upgradeTrack">🛣️ Upgrade Track (40)</button>

    <button id="openIndexBtn">📋 Car Index</button>

    <button id="toggleBotBtn">🤖 Start Bot Match (2m)</button>

    <div id="botDifficultyBox" class="bot-difficulty-box">
      <button class="diff-btn" data-diff="easy">Easy (+100)</button>
      <button class="diff-btn" data-diff="medium">Medium (+350)</button>
      <button class="diff-btn" data-diff="hard">Hard (+500)</button>
    </div>
  </aside>

  <main class="main-content">
    <!-- Приліплений аркуш паперу зі зменшеним лічильником рівня у верхньому лівому куті -->
    <div id="carLevelPaper" class="sticky-level-paper">
      <div class="sticky-tape"></div>
      <div class="sticky-lvl-row">Lvl <span id="carLvlDisplay">1</span>/70</div>
      <div class="sticky-rank-row">Rank: <span id="paperRankBadge" class="paper-rank-pill">F</span></div>
    </div>

    <div id="carShowcaseCard" class="car-showcase-card">
      <img id="carShowcaseImg" src="" alt="Car Preview" />
      <div class="car-showcase-info">
        <div class="showcase-lvl">Level <span id="showcaseLvl">1</span></div>
        <div class="showcase-name">Car: <span id="showcaseName">BMW</span></div>
        <div class="showcase-rank" id="showcaseRank">F</div>
      </div>
    </div>

    <svg id="track" viewBox="0 0 800 500">
      <g id="decorations">
        <circle cx="95" cy="95" r="22" fill="#4caf50" opacity="0.85"/>
        <circle cx="115" cy="110" r="16" fill="#388e3c" opacity="0.9"/>

        <circle cx="705" cy="110" r="24" fill="#4caf50" opacity="0.85"/>
        <circle cx="685" cy="95" r="15" fill="#66bb6a" opacity="0.9"/>

        <circle cx="110" cy="410" r="20" fill="#4caf50" opacity="0.85"/>
        <circle cx="690" cy="400" r="25" fill="#388e3c" opacity="0.85"/>
        <circle cx="715" cy="385" r="16" fill="#66bb6a" opacity="0.9"/>
      </g>

      <path
        id="road-curb"
        fill="none"
        stroke="#ff3333"
        stroke-width="28"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <path
        id="road"
        fill="none"
        stroke="#444455"
        stroke-width="23"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <path
        id="lane-divider"
        fill="none"
        stroke="#8585ff"
        stroke-width="1.2"
        stroke-dasharray="6 8"
        opacity="0.45"
        style="display: none;"
      />

      <path
        id="bot-road"
        fill="none"
        stroke="#00b0ff"
        stroke-width="1.5"
        stroke-dasharray="4 6"
        opacity="0.55"
        style="display: none;"
      />

      <g id="bot-car-group" style="display: none;">
        <rect x="-7" y="-8" width="4" height="3" rx="1" fill="#111"/>
        <rect x="3" y="-8" width="4" height="3" rx="1" fill="#111"/>
        <rect x="-7" y="5" width="4" height="3" rx="1" fill="#111"/>
        <rect x="3" y="5" width="4" height="3" rx="1" fill="#111"/>
        <rect x="-9" y="-5" width="18" height="10" rx="4" fill="#00b0ff" stroke="#1f1f3d" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="2.5" fill="#ffffff"/>
      </g>

      <g id="car-group">
        <rect x="-7" y="-8" width="4" height="3" rx="1" fill="#111"/>
        <rect x="3" y="-8" width="4" height="3" rx="1" fill="#111"/>
        <rect x="-7" y="5" width="4" height="3" rx="1" fill="#111"/>
        <rect x="3" y="5" width="4" height="3" rx="1" fill="#111"/>
        <rect id="player-car-body" x="-9" y="-5" width="18" height="10" rx="4" fill="#ff3333" stroke="#1f1f3d" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="2.5" fill="#1f1f3d"/>
      </g>
    </svg>
  </main>

  <div id="indexModal" class="index-overlay hidden">
    <div class="index-modal-card">
      <button id="closeIndexBtn" class="close-x-btn" title="Close">✕</button>
      <h2 class="index-modal-title">🏎️ Car Index (Levels 1–70)</h2>
      <div id="indexGrid" class="index-grid"></div>
    </div>
  </div>

  <div id="matchResultModal" class="result-overlay hidden">
    <div class="result-card">
      <h2 id="resultTitle">Victory!</h2>
      <p id="resultScore">You: 0 laps — Bot: 0 laps</p>
      <p id="resultMoney" class="result-money">+500 💰</p>
      <p class="cooldown-note">Bot cooldown: 5 minutes</p>
      <button id="closeResultBtn">Continue</button>
    </div>
  </div>
</div>
`

let selectedTrack = structuredClone(tracks[0])

const road = document.querySelector('#road')
const roadCurb = document.querySelector('#road-curb')
const laneDivider = document.querySelector('#lane-divider')
const botRoad = document.querySelector('#bot-road')
const carGroup = document.querySelector('#car-group')
const playerCarBody = document.querySelector('#player-car-body')
const botCarGroup = document.querySelector('#bot-car-group')
const svg = document.querySelector('#track')

svg.setAttribute('viewBox', selectedTrack.viewBox)

road.setAttribute('d', selectedTrack.path)
roadCurb.setAttribute('d', selectedTrack.path)
laneDivider.setAttribute('d', selectedTrack.path)

const trackEngine = createTrackEngine(road)

function buildParallelLanePath(sourceEngine, offsetDistance) {
  const steps = 180
  const points = []

  for (let i = 0; i < steps; i++) {
    const t = i / steps
    const tPrev = (t - 0.015 + 1) % 1
    const tNext = (t + 0.015) % 1

    const p = sourceEngine.getPoint(t)
    const pPrev = sourceEngine.getPoint(tPrev)
    const pNext = sourceEngine.getPoint(tNext)

    const dx = pNext.x - pPrev.x
    const dy = pNext.y - pPrev.y
    const len = Math.hypot(dx, dy) || 1

    const nx = -dy / len
    const ny = dx / len

    points.push({
      x: Number((p.x + nx * offsetDistance).toFixed(2)),
      y: Number((p.y + ny * offsetDistance).toFixed(2)),
    })
  }

  let d = 'M ' + points[0].x + ' ' + points[0].y

for (let i = 1; i < points.length; i++) {
d += ' L ' + points[i].x + ' ' + points[i].y
}
d += ' Z'
return d
}
botRoad.setAttribute('d', buildParallelLanePath(trackEngine, 5))
const botTrackEngine = createTrackEngine(botRoad)
const accelerateButton = document.querySelector('#accelerate')
const upgradeCarButton = document.querySelector('#upgradeCar')
const upgradeTrackButton = document.querySelector('#upgradeTrack')
const toggleMusicButton = document.querySelector('#toggleMusic')
const toggleBotBtn = document.querySelector('#toggleBotBtn')
const diffButtons = document.querySelectorAll('.diff-btn')
const openIndexBtn = document.querySelector('#openIndexBtn')
const indexModal = document.querySelector('#indexModal')
const closeIndexBtn = document.querySelector('#closeIndexBtn')
const indexGrid = document.querySelector('#indexGrid')
const carShowcaseCard = document.querySelector('#carShowcaseCard')
const carShowcaseImg = document.querySelector('#carShowcaseImg')
const showcaseLvl = document.querySelector('#showcaseLvl')
const showcaseName = document.querySelector('#showcaseName')
const showcaseRank = document.querySelector('#showcaseRank')
const paperRankBadge = document.querySelector('#paperRankBadge')
const matchPanel = document.querySelector('#matchPanel')
const matchTimerEl = document.querySelector('#matchTimer')
const playerLapsEl = document.querySelector('#playerLaps')
const botLapsEl = document.querySelector('#botLaps')
const matchResultModal = document.querySelector('#matchResultModal')
const closeResultBtn = document.querySelector('#closeResultBtn')
const helpBtn = document.querySelector('#helpBtn')
const resetBtn = document.querySelector('#resetBtn')
const storyBox = document.querySelector('#storyBox')
const clickSound = new Audio(
new URL('./wii-keyboard-click-3.mp3', import.meta.url).href
)
const bgMusic = new Audio(
new URL('./smeshariki-pogonia.mp3', import.meta.url).href
)
bgMusic.loop = true
bgMusic.volume = 0.3
let isMusicPlaying = false
let lastRenderedTierMinLvl = -1
// Заповнення галереї індексу з білим текстом і виділеними рангами F – S+
function renderCarIndexGrid() {
indexGrid.innerHTML = ''
CAR_TIERS.forEach((tier) => {
const isUnlocked = gameState.carLvl >= tier.minLvl
const card = document.createElement('div')
card.className = 'index-item-card' + (isUnlocked ? ' unlocked' : ' locked')
card.style.backgroundColor = tier.bg
const imgUrl = getCarImageUrl(tier.img)
card.innerHTML =
'' +
'' +
'' +
'' +
'Level ' + tier.minLvl + '' +
'Car: ' + tier.name + '' +
'' + tier.rank + '' +
'' + (isUnlocked ? '✅ Unlocked' : '🔒 Locked') + '' +
''
indexGrid.appendChild(card)
})
}
openIndexBtn.addEventListener('click', (e) => {
e.stopPropagation()
clickSound.currentTime = 0
clickSound.play().catch(() => {})
renderCarIndexGrid()
indexModal.classList.remove('hidden')
})
closeIndexBtn.addEventListener('click', (e) => {
e.stopPropagation()
clickSound.currentTime = 0
clickSound.play().catch(() => {})
indexModal.classList.add('hidden')
})
function updateCarShowcase() {
const tier = getCurrentCarTier(gameState.carLvl)
// Оновлюємо зменшений папірець-лічильник у лівому верхньому куті
document.querySelector('#carLvlDisplay').textContent = gameState.carLvl
paperRankBadge.textContent = tier.rank
paperRankBadge.className = 'paper-rank-pill rank-' + tier.rank.replace('+', 'plus').toLowerCase()
showcaseLvl.textContent = gameState.carLvl
showcaseName.textContent = tier.name
showcaseRank.textContent = tier.rank
carShowcaseCard.style.backgroundColor = tier.bg
playerCarBody.setAttribute('fill', tier.carColor)
if (lastRenderedTierMinLvl !== tier.minLvl) {
lastRenderedTierMinLvl = tier.minLvl
const imgUrl = getCarImageUrl(tier.img)
if (imgUrl) {
carShowcaseImg.style.display = 'block'
carShowcaseImg.src = imgUrl
} else {
carShowcaseImg.style.display = 'none'
}
}
if (gameState.carLvl >= 70) {
upgradeCarButton.textContent = '🔧 Car MAX (70)'
} else {
const carPrice = 20 * (gameState.carLvl) ** 2
upgradeCarButton.textContent = '🔧 Upgrade Car (' + carPrice + ')'
}
if (gameState.trackLvl >= 60) {
upgradeTrackButton.textContent = '🛣️ Track MAX (60)'
} else {
const trackPrice = 40 * (gameState.trackLvl) ** 2
upgradeTrackButton.textContent = '🛣️ Upgrade Track (' + trackPrice + ')'
}
}
carShowcaseImg.addEventListener('error', () => {
carShowcaseImg.style.display = 'none'
})
function updateMusicButtonUI(playing) {
if (playing) {
toggleMusicButton.textContent = 'Music: ON'
toggleMusicButton.classList.add('music-on')
} else {
toggleMusicButton.textContent = 'Music: OFF'
toggleMusicButton.classList.remove('music-on')
}
}
function formatSeconds(totalSec) {
const sec = Math.max(0, Math.ceil(totalSec))
const m = String(Math.floor(sec / 60)).padStart(2, '0')
const s = String(sec % 60).padStart(2, '0')
return m + ':' + s
}
function updateBotControlsUI() {
diffButtons.forEach((btn) => {
btn.disabled = isMatchActive
if (btn.dataset.diff === gameState.botDifficulty) {
btn.classList.add('selected-diff')
} else {
btn.classList.remove('selected-diff')
}
})
if (isMatchActive) {
matchPanel.classList.remove('hidden')
botCarGroup.style.display = 'block'
botRoad.style.display = 'block'
laneDivider.style.display = 'block'
toggleBotBtn.disabled = true
toggleBotBtn.classList.add('bot-active')
toggleBotBtn.textContent = '🏁 Match in progress...'
} else {
matchPanel.classList.add('hidden')
botCarGroup.style.display = 'none'
botRoad.style.display = 'none'
laneDivider.style.display = 'none'
toggleBotBtn.classList.remove('bot-active')
const now = Date.now()
const cooldownLeft = (gameState.botCooldownEnd - now) / 1000
if (cooldownLeft > 0) {
toggleBotBtn.disabled = true
toggleBotBtn.textContent = '⏳ Bot Cooldown: ' + formatSeconds(cooldownLeft)
} else {
toggleBotBtn.disabled = false
toggleBotBtn.textContent = '🤖 Start Bot Match (2m)'
}
}
}
function startBotMatch() {
if (isMatchActive) return
if (Date.now() < gameState.botCooldownEnd) return
isMatchActive = true
matchTimeLeft = MATCH_DURATION
playerLaps = 0
botLaps = 0
gameState.position = 0
botPosition = 0
updateBotControlsUI()
updateUI()
}
function finishBotMatch() {
isMatchActive = false
gameState.botCooldownEnd = Date.now() + COOLDOWN_DURATION * 1000
const diffInfo = BOT_DIFFICULTIES[gameState.botDifficulty]
const titleEl = document.querySelector('#resultTitle')
const scoreEl = document.querySelector('#resultScore')
const moneyEl = document.querySelector('#resultMoney')
scoreEl.textContent = 'You: ' + playerLaps + ' laps — Bot (' + diffInfo.label + '): ' + botLaps + ' laps'
if (playerLaps > botLaps) {
gameState.money += diffInfo.winReward
titleEl.textContent = '🏆 Victory!'
moneyEl.textContent = '+' + diffInfo.winReward + ' 💰'
moneyEl.className = 'result-money win-text'
} else {
gameState.money = Math.max(0, gameState.money - LOSE_PENALTY)
titleEl.textContent = playerLaps === botLaps ? '🤝 Draw (Loss)' : '❌ Defeat!'
moneyEl.textContent = '-' + LOSE_PENALTY + ' 💰'
moneyEl.className = 'result-money lose-text'
}
matchResultModal.classList.remove('hidden')
saveGame()
updateBotControlsUI()
updateUI()
}
toggleBotBtn.addEventListener('click', (e) => {
e.stopPropagation()
clickSound.currentTime = 0
clickSound.play().catch(() => {})
startBotMatch()
})
diffButtons.forEach((btn) => {
btn.addEventListener('click', (e) => {
e.stopPropagation()
if (isMatchActive) return
gameState.botDifficulty = btn.dataset.diff
clickSound.currentTime = 0
clickSound.play().catch(() => {})
updateBotControlsUI()
saveGame()
})
})
closeResultBtn.addEventListener('click', (e) => {
e.stopPropagation()
clickSound.currentTime = 0
clickSound.play().catch(() => {})
matchResultModal.classList.add('hidden')
})
toggleMusicButton.addEventListener('click', (e) => {
e.stopPropagation()
if (isMusicPlaying) {
bgMusic.pause()
isMusicPlaying = false
gameState.musicEnabled = false
updateMusicButtonUI(false)
} else {
gameState.musicEnabled = true
bgMusic.play().then(() => {
isMusicPlaying = true
updateMusicButtonUI(true)
}).catch((err) => {
console.warn('Не вдалося запустити музику:', err)
})
}
clickSound.currentTime = 0
clickSound.play().catch(() => {})
saveGame()
})
resetBtn.addEventListener('click', (e) => {
e.stopPropagation()
clickSound.currentTime = 0
clickSound.play().catch(() => {})
const keepMusic = gameState.musicEnabled
localStorage.removeItem('carRacingSave')
Object.assign(gameState, defaultGameState, { musicEnabled: keepMusic })
selectedTrack = structuredClone(tracks[0])
isMatchActive = false
matchTimeLeft = MATCH_DURATION
playerLaps = 0
botLaps = 0
botPosition = 0
lastRenderedTierMinLvl = -1
saveGame()
updateBotControlsUI()
updateCarShowcase()
updateUI()
})
helpBtn.addEventListener('click', (e) => {
e.stopPropagation()
clickSound.currentTime = 0
clickSound.play().catch(() => {})
storyBox.classList.toggle('hidden')
})
document.addEventListener('click', () => {
if (!storyBox.classList.contains('hidden')) {
storyBox.classList.add('hidden')
}
if (gameState.musicEnabled && !isMusicPlaying) {
bgMusic.play().then(() => {
isMusicPlaying = true
updateMusicButtonUI(true)
}).catch(() => {})
}
})
function updateCarTransform(element, engine, pos) {
const point = engine.getPoint(pos)
const nextPoint = engine.getPoint((pos + 0.008) % 1)
const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * (180 / Math.PI)
element.setAttribute(
'transform',
'translate(' + point.x + ', ' + point.y + ') rotate(' + angle + ')'
)
}
function updateUI() {
document.querySelector('#speed').textContent =
Math.round(gameState.speed)
document.querySelector('#money').textContent =
gameState.money
if (isMatchActive) {
matchTimerEl.textContent = formatSeconds(matchTimeLeft)
playerLapsEl.textContent = playerLaps
botLapsEl.textContent = botLaps
}
updateCarTransform(carGroup, trackEngine, gameState.position)
if (isMatchActive) {
updateCarTransform(botCarGroup, botTrackEngine, botPosition)
}
}
updateBotControlsUI()
updateCarShowcase()
updateUI()
accelerateButton.addEventListener('click', () => {
gameState.speed = Math.min(gameState.maxSpeed, gameState.speed + gameState.clickBoost)
clickSound.currentTime = 0
clickSound.play().catch(() => {})
updateUI()
saveGame()
})
upgradeCarButton.addEventListener('click', () => {
let price = 20 * (gameState.carLvl)**2
if (gameState.money >= price && gameState.carLvl < 70) {
gameState.carLvl += 1
gameState.money -= price
gameState.clickBoost += 8
gameState.maxSpeed += 50
updateCarShowcase()
}
clickSound.currentTime = 0
clickSound.play().catch(() => {})
updateUI()
saveGame()
})
upgradeTrackButton.addEventListener('click', () => {
let price = 40 * (gameState.trackLvl)**2
if (gameState.money >= price && gameState.trackLvl < 60) {
gameState.trackLvl += 1
gameState.money -= price
selectedTrack.rewardPerLap += 30
updateCarShowcase()
}
clickSound.currentTime = 0
clickSound.play().catch(() => {})
updateUI()
saveGame()
})
let previousTime = performance.now()
function gameLoop(currentTime) {
const deltaTime = (currentTime - previousTime) / 1000
previousTime = currentTime
if (gameState.speed > 0) {
gameState.speed -= 45 * deltaTime
if (gameState.speed < 0) {
gameState.speed = 0
}
}
if (gameState.speed > 0) {
gameState.position += gameState.speed * deltaTime / 1500
if (gameState.position >= 1) {
gameState.position -= 1
gameState.money += selectedTrack.rewardPerLap
if (isMatchActive) {
playerLaps += 1
}
saveGame()
}
}
if (isMatchActive) {
matchTimeLeft -= deltaTime
const botSpeed = BOT_DIFFICULTIES[gameState.botDifficulty].speed
botPosition += botSpeed * deltaTime / 1500
if (botPosition >= 1) {
botPosition -= 1
botLaps += 1
}
if (matchTimeLeft <= 0) {
matchTimeLeft = 0
finishBotMatch()
}
} else if (gameState.botCooldownEnd > 0) {
updateBotControlsUI()
}
updateUI()
requestAnimationFrame(gameLoop)
}
requestAnimationFrame(gameLoop)
setInterval(() => {
saveGame()
}, 3000)
window.addEventListener('beforeunload', () => {
saveGame()
})
