// apps/api/src/websocket/rules/shoulderPress.js

const { calculateAngle } = require('./utils');

class ShoulderPressProcessor {
  constructor() {
    this.stage = 'down'; // 'down' (start) or 'up' (extended)
    this.repCount = 0;
    this.feedback = 'Start with weights at shoulder level.';
  }

  /**
   * @function process
   * @description Processes a single frame of pose data to analyze a shoulder press.
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

    const rightShoulder = poseLandmarks[12];
    const rightElbow = poseLandmarks[14];
    const rightWrist = poseLandmarks[16];
    const rightHip = poseLandmarks[24];

    // --- 2. Calculate Angles ---
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const leftShoulderAngle = calculateAngle(leftHip, leftShoulder, leftElbow);
    const rightShoulderAngle = calculateAngle(rightHip, rightShoulder, rightElbow);
    
    // --- 3. Define States and Form Validation ---
    
    // Condition for 'Up' position: Arms are fully extended overhead.
    const isUpPosition = leftElbowAngle > 160 && rightElbowAngle > 160 && leftShoulderAngle > 160 && rightShoulderAngle > 160;

    // Condition for 'Down' position: Elbows are bent and below the shoulders.
    const isDownPosition = leftElbowAngle < 100 && rightElbowAngle < 100 && leftElbow.y > leftShoulder.y && rightElbow.y > rightShoulder.y;

    // --- 4. Repetition Counting Logic ---
    if (isUpPosition && this.stage === 'down') {
      this.stage = 'up';
      this.feedback = 'Lower the weight with control.';
    } else if (isDownPosition && this.stage === 'up') {
      this.stage = 'down';
      this.repCount += 1;
      this.feedback = 'Great press!';
    }

    // --- 5. Provide Intermediate Feedback ---
    if (this.stage === 'down' && leftShoulderAngle > 100) { // On the way up
        this.feedback = 'Press all the way up.';
    } else if (this.stage === 'up' && leftElbowAngle < 150) { // On the way down
        this.feedback = 'Lower until your elbows are below your shoulders.';
    }
    
    return {
      repCount: this.repCount,
      feedback: this.feedback,
      stage: this.stage,
    };
  }
}

module.exports = ShoulderPressProcessor;