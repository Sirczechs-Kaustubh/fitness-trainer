// apps/api/src/websocket/rules/bicepCurl.js

const { calculateAngle } = require('./utils');

class BicepCurlProcessor {
  constructor() {
    this.stage = 'down'; // 'down' (extended) or 'up' (contracted)
    this.repCount = 0;
    this.feedback = 'Start with your arms extended.';
    this.initialShoulderY = null; // To detect body swinging
  }

  /**
   * @function process
   * @description Processes a single frame of pose data to analyze a bicep curl.
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

    const rightShoulder = poseLandmarks[12];
    const rightElbow = poseLandmarks[14];
    const rightWrist = poseLandmarks[16];

    // --- 2. Calculate Angles ---
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    
    // --- 3. Form Validation and Logic ---
    const isUpPosition = leftElbowAngle < 50 && rightElbowAngle < 50;
    const isDownPosition = leftElbowAngle > 160 && rightElbowAngle > 160;

    // Capture initial shoulder position to check for body swing
    if (this.stage === 'down' && isDownPosition) {
        this.initialShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    }

    // Check for excessive body movement (swinging)
    if (this.initialShoulderY && this.stage === 'up') {
        const currentShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        if (Math.abs(currentShoulderY - this.initialShoulderY) > 0.05) { // Threshold for vertical movement
            this.feedback = 'Avoid swinging your body. Keep your torso stable.';
            // Don't count the rep if form is bad
            return { repCount: this.repCount, feedback: this.feedback, stage: this.stage };
        }
    }
    
    // --- 4. Repetition Counting Logic ---
    if (isUpPosition && this.stage === 'down') {
      this.stage = 'up';
      this.feedback = 'Now lower with control.';
    } else if (isDownPosition && this.stage === 'up') {
      this.stage = 'down';
      this.repCount += 1;
      this.feedback = 'Excellent curl!';
      this.initialShoulderY = null; // Reset for the next rep
    }
    
    // --- 5. Provide intermediate feedback ---
    if (this.stage === 'down' && leftElbowAngle < 150) { // On the way up
        if (leftElbowAngle < 70) {
            this.feedback = 'Squeeze at the top.';
        } else {
            this.feedback = 'Curl higher.';
        }
    }

    return {
      repCount: this.repCount,
      feedback: this.feedback,
      stage: this.stage,
    };
  }
}

module.exports = BicepCurlProcessor;