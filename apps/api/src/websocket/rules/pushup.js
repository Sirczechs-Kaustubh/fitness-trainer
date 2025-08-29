// apps/api/src/websocket/rules/pushup.js

const { calculateAngle } = require('./utils');

class PushupProcessor {
  constructor() {
    this.stage = 'up'; // Can be 'up' or 'down'. 'Up' is the starting plank position.
    this.repCount = 0;
    this.feedback = 'Get into a plank position to start.';
  }

  /**
   * @function process
   * @description Processes a single frame of pose data to analyze a push-up.
   * @param {object} poseLandmarks - An array of 33 pose landmarks.
   * @returns {object} An object containing the current rep count and feedback.
   */
  process(poseLandmarks) {
    if (!poseLandmarks || poseLandmarks.length < 33) {
      this.feedback = 'Pose data not found.';
      return { repCount: this.repCount, feedback: this.feedback };
    }

    // --- 1. Get Keypoints ---
    const leftShoulder = poseLandmarks[11];
    const leftElbow = poseLandmarks[13];
    const leftWrist = poseLandmarks[15];
    const leftHip = poseLandmarks[23];
    const leftAnkle = poseLandmarks[27];

    const rightShoulder = poseLandmarks[12];
    const rightElbow = poseLandmarks[14];
    const rightWrist = poseLandmarks[16];
    const rightHip = poseLandmarks[24];
    const rightAnkle = poseLandmarks[28];
    
    // --- 2. Calculate Angles ---
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    
    // Body alignment check (from shoulder to ankle)
    const leftBodyAngle = calculateAngle(leftShoulder, leftHip, leftAnkle);
    const rightBodyAngle = calculateAngle(rightShoulder, rightHip, rightAnkle);

    // --- 3. Form Validation ---
    const isBodyStraight = leftBodyAngle > 160 && rightBodyAngle > 160;
    const isDownPosition = leftElbowAngle < 100 && rightElbowAngle < 100;
    const isUpPosition = leftElbowAngle > 160 && rightElbowAngle > 160;

    // --- 4. Repetition Counting Logic ---
    if (!isBodyStraight) {
      this.feedback = 'Straighten your back! Don\'t let your hips sag.';
    } else {
      if (isDownPosition && this.stage === 'up') {
        this.stage = 'down';
        this.feedback = 'Now push up.';
      } else if (isUpPosition && this.stage === 'down') {
        this.stage = 'up';
        this.repCount += 1;
        this.feedback = 'Great rep!';
      } else if (this.stage === 'up' && leftElbowAngle < 150) {
        // User is on the way down, provide feedback if they aren't going low enough
        this.feedback = 'Go lower.';
      }
    }
    
    return {
      repCount: this.repCount,
      feedback: this.feedback,
      stage: this.stage,
    };
  }
}

module.exports = PushupProcessor;