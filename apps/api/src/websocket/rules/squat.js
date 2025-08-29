// apps/api/src/websocket/rules/squat.js

const { calculateAngle } = require('./utils');

class SquatProcessor {
  constructor() {
    this.stage = 'up'; // Can be 'up' or 'down'
    this.repCount = 0;
    this.feedback = 'Start your squat.';
  }

  /**
   * @function process
   * @description Processes a single frame of pose data to analyze a squat.
   * @param {object} poseLandmarks - An array of 33 pose landmarks.
   * @returns {object} An object containing the current rep count and feedback.
   */
  process(poseLandmarks) {
    if (!poseLandmarks || poseLandmarks.length < 33) {
      this.feedback = 'Pose data not found.';
      return { repCount: this.repCount, feedback: this.feedback };
    }

    // Indices for relevant joints from MediaPipe Pose model
    const leftHip = poseLandmarks[23];
    const leftKnee = poseLandmarks[25];
    const leftAnkle = poseLandmarks[27];
    const leftShoulder = poseLandmarks[11];
    
    const rightHip = poseLandmarks[24];
    const rightKnee = poseLandmarks[26];
    const rightAnkle = poseLandmarks[28];
    const rightShoulder = poseLandmarks[12];

    // --- 1. Calculate Angles ---
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
    const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);

    // --- 2. Depth Measurement & Form Check ---
    // Check if the user is going low enough (hip below knee).
    // A simple proxy for this is a knee angle below a certain threshold.
    const isDeepEnough = leftKneeAngle < 100 && rightKneeAngle < 100;

    // Check back posture by ensuring the hip angle doesn't become too acute (leaning too far forward).
    const isBackStraight = leftHipAngle > 80 && rightHipAngle > 80;

    // --- 3. Repetition Counting Logic ---
    if ((leftKneeAngle > 160 && rightKneeAngle > 160) && this.stage === 'down') {
      // User has returned to the 'up' position after being 'down'
      this.stage = 'up';
      this.repCount += 1;
      this.feedback = 'Great rep!';
    } else if (isDeepEnough && isBackStraight && this.stage === 'up') {
      // User has reached the 'down' position with good form
      this.stage = 'down';
      this.feedback = 'Now go up.';
    }

    // --- 4. Provide Feedback on Form ---
    if (this.stage === 'down' && !isBackStraight) {
        this.feedback = 'Keep your chest up and back straight!';
    } else if (this.stage === 'up' && !isDeepEnough && (leftKneeAngle < 150 || rightKneeAngle < 150)) {
        // User is part-way down but not deep enough
        this.feedback = 'Go lower!';
    }

    return {
      repCount: this.repCount,
      feedback: this.feedback,
      stage: this.stage,
    };
  }
}

module.exports = SquatProcessor;