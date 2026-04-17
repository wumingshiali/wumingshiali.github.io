import { useAnimationFrame } from "../utils/use-animation-frame.mjs";
import { motionValue } from "motion-dom";
function useTime() {
  const time = motionValue(0);
  useAnimationFrame((t) => time.set(t));
  return time;
}
export {
  useTime
};
