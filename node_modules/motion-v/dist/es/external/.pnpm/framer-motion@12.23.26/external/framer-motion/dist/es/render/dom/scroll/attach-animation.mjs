import { observeTimeline } from "motion-dom";
import { getTimeline } from "./utils/get-timeline.mjs";
function attachToAnimation(animation, options) {
  const timeline = getTimeline(options);
  return animation.attachTimeline({
    timeline: options.target ? void 0 : timeline,
    observe: (valueAnimation) => {
      valueAnimation.pause();
      return observeTimeline((progress) => {
        valueAnimation.time = valueAnimation.iterationDuration * progress;
      }, timeline);
    }
  });
}
export {
  attachToAnimation
};
