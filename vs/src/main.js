import './style.css'

import { tracks } from './tracks.js'
import { createTrackEngine } from './trackEngine.js'

// Стандартні значення нової гри
const defaultGameState = {
  carLvl: 1,
  trackLvl: 1,

  speed: 70,
  maxSpeed: 150,
  constantSpeed: 70,

  position: 0,
  money: 0,
  musicEnabled: true,
}

// Завантаження збереження
function loadGame() {
  const savedGame = localStorage.getItem('carRacingSave')

  if (savedGame) {
    try {
      return {
        ...defaultGameState,
        ...JSON.parse(savedGame)
      }
    } catch (error) {
      console.error('Помилка завантаження збереження:', error)
    }
  }

  return { ...defaultGameState }
}

// Поточний стан гри
const gameState = loadGame()

// Збереження гри
function saveGame() {
  localStorage.setItem(
    'carRacingSave',
    JSON.stringify(gameState)
  )
}

document.querySelector('#app').innerHTML = `
<div class="layout">
  <aside class="sidebar">
    <!-- Верхня панель: знак питання зліва та музика справа -->
    <div class="top-bar">
      <button id="helpBtn" title="Character Goal">?</button>
      <button id="toggleMusic">Music: OFF</button>
    </div>

    <!-- Спливаюче текстове поле з метою персонажа -->
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
      <p>🏎️ Speed: <span id="speed">70</span> km/h</p>
    </div>

    <button id="accelerate">⚡ Accelerate</button>

    <button id="upgradeCar">🔧 Upgrade Car</button>

    <button id="upgradeTrack">🛣️ Upgrade Track</button>
  </aside>

  <main class="main-content">
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
        stroke-width="23"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <path
        id="road"
        fill="none"
        stroke="#444455"
        stroke-width="18"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <g id="car-group">
        <rect x="-7" y="-8" width="4" height="3" rx="1" fill="#111"/>
        <rect x="3" y="-8" width="4" height="3" rx="1" fill="#111"/>
        <rect x="-7" y="5" width="4" height="3" rx="1" fill="#111"/>
        <rect x="3" y="5" width="4" height="3" rx="1" fill="#111"/>
        <rect x="-9" y="-5" width="18" height="10" rx="4" fill="#ff3333" stroke="#1f1f3d" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="2.5" fill="#1f1f3d"/>
      </g>
    </svg>
  </main>
</div>
`

const selectedTrack = structuredClone(tracks[0])

const road = document.querySelector('#road')
const roadCurb = document.querySelector('#road-curb')
const carGroup = document.querySelector('#car-group')
const svg = document.querySelector('#track')

svg.setAttribute('viewBox', selectedTrack.viewBox)

road.setAttribute('d', selectedTrack.path)
roadCurb.setAttribute('d', selectedTrack.path)

const trackEngine = createTrackEngine(road)

const accelerateButton = document.querySelector('#accelerate')
const upgradeCarButton = document.querySelector('#upgradeCar')
const upgradeTrackButton = document.querySelector('#upgradeTrack')
const toggleMusicButton = document.querySelector('#toggleMusic')

const helpBtn = document.querySelector('#helpBtn')
const storyBox = document.querySelector('#storyBox')

// Звук кліку
const clickSound = new Audio(
  new URL('./wii-keyboard-click-3.mp3', import.meta.url).href
)

// Фонова музика (Смешарики - Погоня)
const bgMusic = new Audio(
  new URL('./smeshariki-pogonia.mp3', import.meta.url).href
)
bgMusic.loop = true
bgMusic.volume = 0.3

let isMusicPlaying = false

function updateMusicButtonUI(playing) {
  if (playing) {
    toggleMusicButton.textContent = 'Music: ON'
    toggleMusicButton.classList.add('music-on')
  } else {
    toggleMusicButton.textContent = 'Music: OFF'
    toggleMusicButton.classList.remove('music-on')
  }
}

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

// Відкриття вікна з метою при натисканні на "?"
helpBtn.addEventListener('click', (e) => {
  e.stopPropagation()
  clickSound.currentTime = 0
  clickSound.play().catch(() => {})
  storyBox.classList.toggle('hidden')
})

// Закриття текстового поля при кліку куди завгодно на сторінці
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

function updateUI() {
  document.querySelector('#speed').textContent =
    Math.round(gameState.speed)

  document.querySelector('#money').textContent =
    gameState.money

  const point = trackEngine.getPoint(gameState.position)
  const nextPoint = trackEngine.getPoint((gameState.position + 0.005) % 1)
  const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * (180 / Math.PI)

  carGroup.setAttribute('transform', 'translate(' + point.x + ', ' + point.y + ') rotate(' + angle + ')')
}

updateUI()

accelerateButton.addEventListener('click', () => {
  if (gameState.speed < gameState.maxSpeed) {
    gameState.speed += 10
  }

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
    gameState.constantSpeed += 20
    gameState.maxSpeed += 50
    gameState.speed += 20
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

  if (gameState.speed > gameState.constantSpeed) {
    gameState.speed -= 20 * deltaTime

    if (gameState.speed < gameState.constantSpeed) {
      gameState.speed = gameState.constantSpeed
    }
  }

  gameState.position += gameState.speed * deltaTime / 1500

  if (gameState.position >= 1) {
    gameState.position -= 1
    gameState.money += selectedTrack.rewardPerLap
    saveGame()
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
