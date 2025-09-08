// apps/api/src/websocket/rules/jumpingJack.js

class JumpingJackProcessor {
  constructor() {
    this.stage = 'in'; // 'in' (start/end) or 'out' (peak)
    this.repCount = 0;
    this.feedback = 'Start with your feet together and arms by your side.';
    this.formScore = 0;
  }

  /**
   * @function process
   * @description Processes a single frame of pose data to analyze a jumping jack.
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
    const leftWrist = poseLandmarks[15];
    const leftHip = poseLandmarks[23];
    const leftAnkle = poseLandmarks[27];

    const rightShoulder = poseLandmarks[12];
    const rightWrist = poseLandmarks[16];
    const rightHip = poseLandmarks[24];
    const rightAnkle = poseLandmarks[28];

    // --- 2. Define States based on Coordination ---

    // Calculate widths for relative measurements
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const ankleDistance = Math.abs(leftAnkle.x - rightAnkle.x);

    // Conditions for arm positions
    const armsAreUp = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
    const armsAreDown = leftWrist.y > leftHip.y && rightWrist.y > rightHip.y;

    // Conditions for leg positions
    const legsAreOut = ankleDistance > shoulderWidth * 1.5;
    const legsAreIn = ankleDistance < shoulderWidth * 0.8;

    // Coordinated states
    const isOutPosition = armsAreUp && legsAreOut;
    const isInPosition = armsAreDown && legsAreIn;

    // --- 3. Repetition Counting Logic ---
    if (isOutPosition && this.stage === 'in') {
      this.stage = 'out';
      this.feedback = 'Good! Now back in.';
    } else if (isInPosition && this.stage === 'out') {
      this.stage = 'in';
      this.repCount += 1;
      this.feedback = 'Nice rhythm!';
    }

    // --- 4. Provide Intermediate Feedback ---
    if (this.stage === 'in' && (ankleDistance > shoulderWidth || leftWrist.y < rightHip.y)) {
        // User is moving towards 'out' position
        if (!armsAreUp && legsAreOut) {
            this.feedback = 'Bring your arms up!';
        } else if (armsAreUp && !legsAreOut) {
            this.feedback = 'Jump your feet out!';
        }
    }

    // --- 5. Score: coordination of arms and legs ---
    // Normalize arm height vs shoulder->hip distance
    const torsoHeight = Math.max(0.001, Math.abs((leftHip.y + rightHip.y)/2 - (leftShoulder.y + rightShoulder.y)/2));
    const armRaiseL = Math.max(0, ((leftShoulder.y - leftWrist.y) / torsoHeight)); // 1+ when well above shoulder
    const armRaiseR = Math.max(0, ((rightShoulder.y - rightWrist.y) / torsoHeight));
    const armUpScore = Math.min(1, (armRaiseL + armRaiseR) / 2);
    // Normalize leg spread vs shoulder width
    const legSpreadScore = Math.min(1, ankleDistance / Math.max(0.001, shoulderWidth * 1.5));
    // When stage is 'out' target is armsUp + legsOut; when 'in' target is armsDown + legsIn
    const armDownScore = Math.min(1, Math.max(0, ((leftWrist.y - leftHip.y) + (rightWrist.y - rightHip.y)) / (2 * torsoHeight)));
    const legsInScore = Math.min(1, Math.max(0, (shoulderWidth * 0.8 - ankleDistance) / (shoulderWidth * 0.8)));
    const targetScore = this.stage === 'out' ? (0.6 * armUpScore + 0.4 * legSpreadScore)
                                             : (0.6 * armDownScore + 0.4 * legsInScore);
    this.formScore = Math.round(0.8 * this.formScore + 0.2 * (targetScore * 100));

    return {
      repCount: this.repCount,
      feedback: this.feedback,
      stage: this.stage,
      score: this.formScore,
    };
  }
}

module.exports = JumpingJackProcessor;
