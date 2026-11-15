import './style.css'

import { tracks } from './tracks.js'
import { createTrackEngine } from './trackEngine.js'

// Стандартні значення нової гри
const defaultGameState = {
  carLvl: 1,
  trackLvl: 1,

  speed: 100,
  maxSpeed: 180,
  constantSpeed: 100,

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
    <h1>Salon Falyali</h1>

    <p>Money: <span id="money">0</span></p>
    <p>Speed: <span id="speed">100</span></p>

    <button id="accelerate">Accelerate</button>

    <button id="upgradeCar">Upgrade Car</button>

    <button id="upgradeTrack">Upgrade Track</button>

    <button id="toggleMusic">Music: OFF</button>
  </aside>
  <main class="main-content">
    <svg id="track" viewBox="0 0 800 500">
      <path
        id="road"
        fill="none"
        stroke="#555"
        stroke-width="18"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <line
        id="start-line"
        stroke="#fff"
        stroke-width="4"
      />

      <circle
        id="car"
        r="6"
        fill="#ff3333"
      />
    </svg>
  </main>
</div>
`

const selectedTrack = structuredClone(tracks[0])

const road = document.querySelector('#road')
const car = document.querySelector('#car')
const svg = document.querySelector('#track')

const startLine = document.querySelector('#start-line')

startLine.setAttribute('x1', selectedTrack.startLine.x1)
startLine.setAttribute('y1', selectedTrack.startLine.y1)
startLine.setAttribute('x2', selectedTrack.startLine.x2)
startLine.setAttribute('y2', selectedTrack.startLine.y2)

svg.setAttribute('viewBox', selectedTrack.viewBox)

road.setAttribute('d', selectedTrack.path)

const trackEngine = createTrackEngine(road)
updateUI()

const accelerateButton = document.querySelector('#accelerate')
const upgradeCarButton = document.querySelector('#upgradeCar')
const upgradeTrackButton = document.querySelector('#upgradeTrack')
const toggleMusicButton = document.querySelector('#toggleMusic')

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

toggleMusicButton.addEventListener('click', (e) => {
  e.stopPropagation()

  if (isMusicPlaying) {
    bgMusic.pause()
    isMusicPlaying = false
    gameState.musicEnabled = false
    toggleMusicButton.textContent = 'Music: OFF'
  } else {
    gameState.musicEnabled = true
    bgMusic.play().then(() => {
      isMusicPlaying = true
      toggleMusicButton.textContent = 'Music: ON'
    }).catch((err) => {
      console.warn('Не вдалося запустити музику:', err)
    })
  }

  saveGame()
})

// Автозапуск музики при першому кліку будь-де в грі
function startMusicOnFirstInteraction() {
  if (gameState.musicEnabled && !isMusicPlaying) {
    bgMusic.play().then(() => {
      isMusicPlaying = true
      toggleMusicButton.textContent = 'Music: ON'
    }).catch(() => {})
  }
  document.removeEventListener('click', startMusicOnFirstInteraction)
}

document.addEventListener('click', startMusicOnFirstInteraction)

function updateUI() {
  document.querySelector('#speed').textContent =
    Math.round(gameState.speed)

  document.querySelector('#money').textContent =
    gameState.money

  const point = trackEngine.getPoint(gameState.position)

  car.setAttribute('cx', point.x)
  car.setAttribute('cy', point.y)
}

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
  if (gameState.money >= price) {
    gameState.carLvl += 1

    gameState.money -= price

    gameState.constantSpeed += 50
    gameState.maxSpeed += 80

    gameState.speed += 50
  }

  clickSound.currentTime = 0
  clickSound.play().catch(() => {})
  updateUI()
  saveGame()
})

upgradeTrackButton.addEventListener('click', () => {
  let price = 40 * (gameState.trackLvl)**2

  if (gameState.money >= price) {
    gameState.trackLvl += 1

    gameState.money -= price

    selectedTrack.rewardPerLap += 30
  }

  clickSound.currentTime = 0
  clickSound.play().catch(() => {})
  updateUI()
  saveGame()
})

let previousTime = 0

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

    console.log('Lap complete! Money:', gameState.money)

    saveGame()
  }

  updateUI()

  requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop)

// Автоматичне збереження раз на 3 секунди
setInterval(() => {
  saveGame()
}, 3000)

// Збереження перед закриттям або перезавантаженням сторінки
window.addEventListener('beforeunload', () => {
  saveGame()
})