import { onBeforeUpdate, onUnmounted } from "vue";
import { frame, cancelFrame } from "motion-dom";
function useAnimationFrame(callback) {
  let initialTimestamp = 0;
  const provideTimeSinceStart = ({ timestamp, delta }) => {
    if (!initialTimestamp)
      initialTimestamp = timestamp;
    callback(timestamp - initialTimestamp, delta);
  };
  const cancel = () => cancelFrame(provideTimeSinceStart);
  onBeforeUpdate(() => {
    cancel();
    frame.update(provideTimeSinceStart, true);
  });
  onUnmounted(() => cancel());
  frame.update(provideTimeSinceStart, true);
}
export {
  useAnimationFrame
};
