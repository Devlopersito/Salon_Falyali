export function createTrackEngine(pathElement) {
  const pathLength = pathElement.getTotalLength()

  return {
    length: pathLength,

    getPoint(progress) {
      // Перетворюємо прогрес кола на відстань уздовж шляху.
      const distance = (progress % 1) * pathLength

      // Знаходимо координати цієї точки.
      const point = pathElement.getPointAtLength(distance)

      return {
        x: point.x,
        y: point.y
      }
    }
  }
}