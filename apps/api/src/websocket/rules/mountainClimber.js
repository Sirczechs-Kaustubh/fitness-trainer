// apps/api/src/websocket/rules/mountainClimber.js

const { calculateAngle } = require('./utils');

class MountainClimberProcessor {
  constructor() {
    this.activeLeg = 'none'; // 'left', 'right', or 'none'
    this.repCount = 0;
    this.feedback = 'Get into a plank position to start.';
    this.formScore = 0;
  }

  /**
   * @function process
   * @description Processes a single frame of pose data to analyze mountain climbers.
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
    const leftHip = poseLandmarks[23];
    const leftKnee = poseLandmarks[25];
    const leftAnkle = poseLandmarks[27];

    const rightShoulder = poseLandmarks[12];
    const rightHip = poseLandmarks[24];
    const rightKnee = poseLandmarks[26];
    const rightAnkle = poseLandmarks[28];
    
    // --- 2. Form Validation: Maintain Plank ---
    const leftBodyAngle = calculateAngle(leftShoulder, leftHip, leftAnkle);
    const rightBodyAngle = calculateAngle(rightShoulder, rightHip, rightAnkle);
    
    // Check if hips are sagging, only when legs are extended
    if (this.activeLeg !== 'left' && leftBodyAngle < 150) {
        this.feedback = 'Keep your back straight!';
        return { repCount: this.repCount, feedback: this.feedback };
    }
     if (this.activeLeg !== 'right' && rightBodyAngle < 150) {
        this.feedback = 'Keep your back straight!';
        return { repCount: this.repCount, feedback: this.feedback };
    }

    // --- 3. Repetition Counting Logic ---
    // A rep is one knee coming forward.
    const isLeftKneeForward = leftKnee.y > leftHip.y; // Simple check if knee is "under" the body
    const isRightKneeForward = rightKnee.y > rightHip.y;

    if (isLeftKneeForward && this.activeLeg !== 'left') {
        this.activeLeg = 'left';
        this.repCount += 1;
        this.feedback = 'Good pace!';
    } else if (isRightKneeForward && this.activeLeg !== 'right') {
        this.activeLeg = 'right';
        this.repCount += 1;
        this.feedback = 'Keep it up!';
    } else if (!isLeftKneeForward && !isRightKneeForward) {
        // Both legs are back, reset state for next rep
        this.activeLeg = 'none';
    }
    // --- 4. Score: plank straightness + knee drive
    const plankErr = Math.min(1, ((Math.abs(180 - leftBodyAngle) + Math.abs(180 - rightBodyAngle)) / 2) / 40);
    // Knee drive: greater forward indicates better (use y distance relative to hip->ankle)
    const leftRange = Math.max(0.001, Math.abs(leftAnkle.y - leftHip.y));
    const rightRange = Math.max(0.001, Math.abs(rightAnkle.y - rightHip.y));
    const leftDrive = Math.min(1, Math.max(0, (leftKnee.y - leftHip.y) / leftRange));
    const rightDrive = Math.min(1, Math.max(0, (rightKnee.y - rightHip.y) / rightRange));
    // Note: with camera facing user, y increases downward; forward knee usually increases y.
    const driveScore = (leftDrive + rightDrive) / 2;
    const inst = 100 * (1 - 0.5 * plankErr) * (0.5 + 0.5 * driveScore); // keep some score even when not driving
    this.formScore = Math.round(0.8 * this.formScore + 0.2 * Math.max(0, Math.min(100, inst)));

    return {
      repCount: this.repCount,
      feedback: this.feedback,
      score: this.formScore,
    };
  }
}

module.exports = MountainClimberProcessor;
