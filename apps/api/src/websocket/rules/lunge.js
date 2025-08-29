// apps/api/src/websocket/rules/lunge.js

const { calculateAngle } = require('./utils');

class LungeProcessor {
  constructor() {
    this.stage = 'up'; // Can be 'up' or 'down'
    this.repCount = 0;
    this.feedback = 'Start your lunge.';
    this.leadingLeg = null; // To track which leg is forward ('left' or 'right')
  }

  /**
   * @function process
   * @description Processes a single frame of pose data to analyze a lunge.
   * @param {object} poseLandmarks - An array of 33 pose landmarks.
   * @returns {object} An object containing the current rep count and feedback.
   */
  process(poseLandmarks) {
    if (!poseLandmarks || poseLandmarks.length < 33) {
      this.feedback = 'Pose data not found.';
      return { repCount: this.repCount, feedback: this.feedback };
    }

    // --- 1. Get Keypoints ---
    const leftHip = poseLandmarks[23];
    const leftKnee = poseLandmarks[25];
    const leftAnkle = poseLandmarks[27];
    const leftShoulder = poseLandmarks[11];
    
    const rightHip = poseLandmarks[24];
    const rightKnee = poseLandmarks[26];
    const rightAnkle = poseLandmarks[28];
    const rightShoulder = poseLandmarks[12];

    // --- 2. Determine Leading Leg (simple heuristic) ---
    // The ankle further forward on the x-axis is the leading leg.
    // This assumes a side-on view, which is typical for lunge analysis.
    if (this.stage === 'up') {
        if (Math.abs(leftAnkle.x - rightAnkle.x) > 0.1) { // Threshold to avoid noise
             this.leadingLeg = leftAnkle.x < rightAnkle.x ? 'left' : 'right'; // In most camera views, smaller x is forward
        } else {
            this.leadingLeg = null;
        }
    }
   
    if (!this.leadingLeg) {
        this.feedback = 'Please step into a lunge position.';
        return { repCount: this.repCount, feedback: this.feedback };
    }

    // --- 3. Define Front and Back Legs ---
    const [frontHip, frontKnee, frontAnkle, backHip, backKnee, backShoulder] = 
        this.leadingLeg === 'left' 
        ? [leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightShoulder]
        : [rightHip, rightKnee, rightAnkle, leftHip, leftKnee, leftShoulder];

    // --- 4. Calculate Angles ---
    const frontKneeAngle = calculateAngle(frontHip, frontKnee, frontAnkle);
    const backKneeAngle = calculateAngle(backHip, backKnee, frontHip); // Note the points used for back leg
    const torsoAngle = calculateAngle(backShoulder, backHip, backKnee);

    // --- 5. Form Validation ---
    const isFrontKneeCorrect = frontKneeAngle > 80 && frontKneeAngle < 110;
    const isBackKneeCorrect = backKneeAngle > 80 && backKneeAngle < 110;
    const isTorsoUpright = torsoAngle > 150;
    
    const isInDownPosition = isFrontKneeCorrect && isBackKneeCorrect;
    const isInUpPosition = frontKneeAngle > 160 && backKneeAngle > 160;

    // --- 6. Repetition Counting Logic ---
    if (isInUpPosition && this.stage === 'down') {
        this.stage = 'up';
        this.repCount += 1;
        this.feedback = 'Good rep!';
    } else if (isInDownPosition && this.stage === 'up') {
        if (!isTorsoUpright) {
            this.feedback = 'Keep your chest up!';
        } else {
            this.stage = 'down';
            this.feedback = 'Now push back up.';
        }
    }

    // --- 7. Real-time Feedback ---
    if (this.stage === 'up' && frontKneeAngle < 150) { // User is on the way down
      if (frontKnee.x < frontAnkle.x - 0.05) { // Check if knee is past ankle
          this.feedback = 'Don\'t let your front knee pass your toes.';
      } else if (!isTorsoUpright) {
          this.feedback = 'Keep your torso upright.';
      } else {
          this.feedback = 'Lower your back knee.';
      }
    }

    return {
      repCount: this.repCount,
      feedback: this.feedback,
      stage: this.stage,
    };
  }
}

module.exports = LungeProcessor;