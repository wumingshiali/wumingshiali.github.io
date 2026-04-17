import { useMotionConfig } from "../motion-config/context.mjs";
import { frame } from "motion-dom";
function usePopLayout(props) {
  const styles = /* @__PURE__ */ new WeakMap();
  const config = useMotionConfig();
  function addPopStyle(state, element) {
    if (props.mode !== "popLayout")
      return;
    const parent = element.offsetParent;
    const parentWidth = parent instanceof HTMLElement ? parent.offsetWidth || 0 : 0;
    const size = {
      height: element.offsetHeight || 0,
      width: element.offsetWidth || 0,
      top: element.offsetTop,
      left: element.offsetLeft,
      right: 0
    };
    size.right = parentWidth - size.width - size.left;
    const x = props.anchorX === "left" ? `left: ${size.left}px` : `right: ${size.right}px`;
    if (!element.dataset.motionPopId) {
      element.dataset.motionPopId = `presence-${state.id}`;
    }
    const popId = element.dataset.motionPopId;
    const style = document.createElement("style");
    if (config.value.nonce) {
      style.nonce = config.value.nonce;
    }
    styles.set(state, style);
    document.head.appendChild(style);
    if (style.sheet) {
      style.sheet.insertRule(`
    [data-motion-pop-id="${popId}"] {
      position: absolute !important;
      width: ${size.width}px !important;
      height: ${size.height}px !important;
      top: ${size.top}px !important;
      ${x} !important;
      }
      `);
    }
  }
  function removePopStyle(state, element) {
    const style = styles.get(state);
    if (!style)
      return;
    styles.delete(state);
    frame.render(() => {
      document.head.removeChild(style);
      if (element)
        element.dataset.motionPopId = "";
    });
  }
  return {
    addPopStyle,
    removePopStyle,
    styles
  };
}
export {
  usePopLayout
};
