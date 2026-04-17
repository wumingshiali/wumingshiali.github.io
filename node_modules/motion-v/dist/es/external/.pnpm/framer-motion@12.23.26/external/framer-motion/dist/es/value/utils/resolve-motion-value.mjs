import { isMotionValue } from "motion-dom";
function resolveMotionValue(value) {
  return isMotionValue(value) ? value.get() : value;
}
export {
  resolveMotionValue
};
