import './style.css'

import { tracks } from './tracks.js'
import { createTrackEngine } from './trackEngine.js'


const gameState = {
  speed: 100,
  maxSpeed: 180,
  constantSpeed: 100,
  position: 0,
  money: 0
}

document.querySelector('#app').innerHTML = `
  <h1>Car Racing Game</h1>

  <p>Money: <span id="money">0</span></p>
  <p>Speed: <span id="speed">100</span></p>

  <button id="accelerate">Accelerate</button>
  
  
  <svg id="track" viewBox="0 0 800 500">
    <!-- Одна смуга траси -->
    <path
      id="road"
      fill="none"
      stroke="#555"
      stroke-width="18"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Стартова лінія -->
    <line
      id="start-line"
      stroke="#fff"
      stroke-width="4"
    />

    <!-- Крапка, що рухається по трасі -->
    <circle
      id="car"
      r="6"
      fill="#ff3333"
    />
  </svg>
`


const selectedTrack = tracks[0]

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

  updateUI()
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
  }

  updateUI()

  requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop)