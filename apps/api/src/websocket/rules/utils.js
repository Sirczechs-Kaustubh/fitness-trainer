// apps/api/src/websocket/rules/utils.js

/**
 * @function calculateAngle
 * @description Calculates the angle between three 2D points (e.g., joints).
 * @param {object} a - The first point (e.g., shoulder) with {x, y}.
 * @param {object} b - The second point (vertex, e.g., elbow) with {x, y}.
 * @param {object} c - The third point (e.g., wrist) with {x, y}.
 * @returns {number} The angle in degrees.
 */
function calculateAngle(a, b, c) {
  // The points are expected to be objects with x and y coordinates, like { x: 0.5, y: 0.5 }
  if (!a || !b || !c) {
    return null;
  }

  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }

  return angle;
}

module.exports = { calculateAngle };