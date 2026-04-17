import { useCombineMotionValues } from "./use-combine-values.mjs";
import { watchEffect } from "vue";
import { collectMotionValues } from "motion-dom";
function useComputed(computed) {
  collectMotionValues.current = [];
  const { value, subscribe, unsubscribe, updateValue } = useCombineMotionValues(computed);
  subscribe(collectMotionValues.current);
  collectMotionValues.current = void 0;
  watchEffect(() => {
    unsubscribe();
    collectMotionValues.current = [];
    updateValue();
    subscribe(collectMotionValues.current);
    collectMotionValues.current = void 0;
  });
  return value;
}
export {
  useComputed
};
