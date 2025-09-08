// apps/api/src/websocket/rules/tricepDip.js

const { calculateAngle } = require('./utils');

class TricepDipProcessor {
  constructor() {
    this.stage = 'up'; // 'up' (extended) or 'down' (bent)
    this.repCount = 0;
    this.feedback = 'Start with your arms fully extended.';
    this.formScore = 0;
  }

  /**
   * @function process
   * @description Processes a single frame of pose data to analyze a tricep dip.
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

    // --- 3. Define States & Form Validation ---
    const isDownPosition = leftElbowAngle < 100 && rightElbowAngle < 100;
    const isUpPosition = leftElbowAngle > 160 && rightElbowAngle > 160;

    // --- 4. Repetition Counting Logic ---
    if (isDownPosition && this.stage === 'up') {
      this.stage = 'down';
      this.feedback = 'Now push up.';
    } else if (isUpPosition && this.stage === 'down') {
      this.stage = 'up';
      this.repCount += 1;
      this.feedback = 'Great rep!';
    }
    
    // --- 5. Provide Intermediate Feedback ---
    if (this.stage === 'up' && leftElbowAngle < 150) { // On the way down
        this.feedback = 'Lower your body until your elbows hit 90 degrees.';
    }

    // --- 6. Score: elbow angle control ---
    const target = this.stage === 'down' ? 90 : 170;
    const eErr = Math.min(1, ((Math.abs(leftElbowAngle - target) + Math.abs(rightElbowAngle - target)) / 2) / (this.stage === 'down' ? 45 : 30));
    const inst = 100 * (1 - eErr);
    this.formScore = Math.round(0.8 * this.formScore + 0.2 * Math.max(0, Math.min(100, inst)));

    return {
      repCount: this.repCount,
      feedback: this.feedback,
      stage: this.stage,
      score: this.formScore,
    };
  }
}

module.exports = TricepDipProcessor;
