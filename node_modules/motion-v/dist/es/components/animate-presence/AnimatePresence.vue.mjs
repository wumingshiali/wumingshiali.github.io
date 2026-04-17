import { defineComponent, onUnmounted, computed, openBlock, createBlock, resolveDynamicComponent, Transition, TransitionGroup, mergeProps, withCtx, renderSlot } from "vue";
import { mountedStates } from "../../state/motion-state.mjs";
import { usePopLayout } from "./use-pop-layout.mjs";
import { useAnimatePresence } from "./presence.mjs";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "AnimatePresence",
    inheritAttrs: true
  },
  __name: "AnimatePresence",
  props: {
    mode: { default: "sync" },
    initial: { type: Boolean, default: true },
    as: {},
    custom: {},
    onExitComplete: {},
    anchorX: { default: "left" }
  },
  setup(__props) {
    const props = __props;
    useAnimatePresence(props);
    const { addPopStyle, removePopStyle, styles } = usePopLayout(props);
    function findMotionElement(el) {
      let current = el;
      while (current) {
        if (mountedStates.get(current)) {
          return current;
        }
        current = current.firstElementChild;
      }
      return null;
    }
    const exitDom = /* @__PURE__ */ new Map();
    function enter(el) {
      const state = mountedStates.get(el);
      if (state) {
        state.getSnapshot(state.options, true);
        state.setActive("exit", false);
      }
    }
    onUnmounted(() => {
      exitDom.forEach((value, key) => {
        const state = mountedStates.get(key);
        if (state) {
          state.unmount(true);
        }
      });
      exitDom.clear();
    });
    function exit(el, done) {
      var _a;
      const motionEl = findMotionElement(el);
      const state = mountedStates.get(motionEl);
      if (!state) {
        done();
        if (exitDom.size === 0) {
          (_a = props.onExitComplete) == null ? void 0 : _a.call(props);
        }
        return;
      }
      const doneCallback = function(e) {
        var _a2, _b, _c, _d;
        if (!motionEl.isConnected)
          return;
        if ((_a2 = e == null ? void 0 : e.detail) == null ? void 0 : _a2.isExit) {
          const projection = state.visualElement.projection;
          if (((_b = state.options) == null ? void 0 : _b.layoutId) && ((_c = projection.currentAnimation) == null ? void 0 : _c.state) === "running" && !state.options.exit) {
            return;
          }
          if (state.isExiting)
            return;
          motionEl.removeEventListener("motioncomplete", doneCallback);
          exitDom.delete(motionEl);
          if (exitDom.size === 0) {
            (_d = props.onExitComplete) == null ? void 0 : _d.call(props);
          }
          if (styles.has(state)) {
            removePopStyle(state, el);
          }
          state.getSnapshot(state.options, false);
          done();
          if (!motionEl.isConnected) {
            state.unmount(true);
          } else {
            state.didUpdate();
          }
        }
      };
      exitDom.set(motionEl, true);
      addPopStyle(state, el);
      motionEl.addEventListener("motioncomplete", doneCallback);
      state.setActive("exit", true);
      state.getSnapshot(state.options, false);
      state.didUpdate();
    }
    const transitionProps = computed(() => {
      if (props.mode !== "wait") {
        return {
          tag: props.as
        };
      }
      return {
        mode: props.mode === "wait" ? "out-in" : void 0
      };
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(resolveDynamicComponent(_ctx.mode === "wait" ? Transition : TransitionGroup), mergeProps({ css: false }, transitionProps.value, {
        appear: "",
        onLeave: exit,
        onEnter: enter
      }), {
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      }, 16);
    };
  }
});
export {
  _sfc_main as default
};
