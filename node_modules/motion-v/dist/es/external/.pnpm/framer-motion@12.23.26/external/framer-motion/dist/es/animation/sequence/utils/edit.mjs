import { mixNumber } from "motion-dom";
import { getEasingForSegment } from "../../../../../../../../motion-utils@12.23.6/external/motion-utils/dist/es/easing/utils/get-easing-for-segment.mjs";
import { removeItem } from "../../../../../../../../motion-utils@12.23.6/external/motion-utils/dist/es/array.mjs";
function eraseKeyframes(sequence, startTime, endTime) {
  for (let i = 0; i < sequence.length; i++) {
    const keyframe = sequence[i];
    if (keyframe.at > startTime && keyframe.at < endTime) {
      removeItem(sequence, keyframe);
      i--;
    }
  }
}
function addKeyframes(sequence, keyframes, easing, offset, startTime, endTime) {
  eraseKeyframes(sequence, startTime, endTime);
  for (let i = 0; i < keyframes.length; i++) {
    sequence.push({
      value: keyframes[i],
      at: mixNumber(startTime, endTime, offset[i]),
      easing: getEasingForSegment(easing, i)
    });
  }
}
export {
  addKeyframes,
  eraseKeyframes
};
