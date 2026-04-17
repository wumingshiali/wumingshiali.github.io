"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const motionDom = require("motion-dom");
const vue = require("vue");
const heyListen = require("hey-listen");
const core = require("@vueuse/core");
function addUniqueItem(arr, item) {
  if (arr.indexOf(item) === -1)
    arr.push(item);
}
function removeItem(arr, item) {
  const index = arr.indexOf(item);
  if (index > -1)
    arr.splice(index, 1);
}
function moveItem$1([...arr], fromIndex, toIndex) {
  const startIndex = fromIndex < 0 ? arr.length + fromIndex : fromIndex;
  if (startIndex >= 0 && startIndex < arr.length) {
    const endIndex = toIndex < 0 ? arr.length + toIndex : toIndex;
    const [item] = arr.splice(fromIndex, 1);
    arr.splice(endIndex, 0, item);
  }
  return arr;
}
const clamp = (min, max, v) => {
  if (v > max)
    return max;
  if (v < min)
    return min;
  return v;
};
function formatErrorMessage(message, errorCode) {
  return errorCode ? `${message}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${errorCode}` : message;
}
exports.warning = () => {
};
exports.invariant = () => {
};
if (process.env.NODE_ENV !== "production") {
  exports.warning = (check, message, errorCode) => {
    if (!check && typeof console !== "undefined") {
      console.warn(formatErrorMessage(message, errorCode));
    }
  };
  exports.invariant = (check, message, errorCode) => {
    if (!check) {
      throw new Error(formatErrorMessage(message, errorCode));
    }
  };
}
const MotionGlobalConfig = {};
const isNumericalString = (v) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(v);
function isObject(value) {
  return typeof value === "object" && value !== null;
}
const isZeroValueString = (v) => /^0[^.\s]+$/u.test(v);
// @__NO_SIDE_EFFECTS__
function memo(callback) {
  let result;
  return () => {
    if (result === void 0)
      result = callback();
    return result;
  };
}
const noop = /* @__NO_SIDE_EFFECTS__ */ (any) => any;
const combineFunctions = (a, b) => (v) => b(a(v));
const pipe = (...transformers) => transformers.reduce(combineFunctions);
const progress = /* @__NO_SIDE_EFFECTS__ */ (from, to, value) => {
  const toFromDifference = to - from;
  return toFromDifference === 0 ? 1 : (value - from) / toFromDifference;
};
class SubscriptionManager {
  constructor() {
    this.subscriptions = [];
  }
  add(handler) {
    addUniqueItem(this.subscriptions, handler);
    return () => removeItem(this.subscriptions, handler);
  }
  notify(a, b, c) {
    const numSubscriptions = this.subscriptions.length;
    if (!numSubscriptions)
      return;
    if (numSubscriptions === 1) {
      this.subscriptions[0](a, b, c);
    } else {
      for (let i = 0; i < numSubscriptions; i++) {
        const handler = this.subscriptions[i];
        handler && handler(a, b, c);
      }
    }
  }
  getSize() {
    return this.subscriptions.length;
  }
  clear() {
    this.subscriptions.length = 0;
  }
}
const secondsToMilliseconds = /* @__NO_SIDE_EFFECTS__ */ (seconds) => seconds * 1e3;
const millisecondsToSeconds = /* @__NO_SIDE_EFFECTS__ */ (milliseconds) => milliseconds / 1e3;
function velocityPerSecond(velocity, frameDuration) {
  return frameDuration ? velocity * (1e3 / frameDuration) : 0;
}
const warned = /* @__PURE__ */ new Set();
function hasWarned(message) {
  return warned.has(message);
}
function warnOnce(condition, message, errorCode) {
  if (condition || warned.has(message))
    return;
  console.warn(formatErrorMessage(message, errorCode));
  warned.add(message);
}
const wrap = (min, max, v) => {
  const rangeSize = max - min;
  return ((v - min) % rangeSize + rangeSize) % rangeSize + min;
};
const calcBezier = (t, a1, a2) => (((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t + 3 * a1) * t;
const subdivisionPrecision = 1e-7;
const subdivisionMaxIterations = 12;
function binarySubdivide(x, lowerBound, upperBound, mX1, mX2) {
  let currentX;
  let currentT;
  let i = 0;
  do {
    currentT = lowerBound + (upperBound - lowerBound) / 2;
    currentX = calcBezier(currentT, mX1, mX2) - x;
    if (currentX > 0) {
      upperBound = currentT;
    } else {
      lowerBound = currentT;
    }
  } while (Math.abs(currentX) > subdivisionPrecision && ++i < subdivisionMaxIterations);
  return currentT;
}
function cubicBezier(mX1, mY1, mX2, mY2) {
  if (mX1 === mY1 && mX2 === mY2)
    return noop;
  const getTForX = (aX) => binarySubdivide(aX, 0, 1, mX1, mX2);
  return (t) => t === 0 || t === 1 ? t : calcBezier(getTForX(t), mY1, mY2);
}
const mirrorEasing = (easing) => (p) => p <= 0.5 ? easing(2 * p) / 2 : (2 - easing(2 * (1 - p))) / 2;
const reverseEasing = (easing) => (p) => 1 - easing(1 - p);
const backOut = /* @__PURE__ */ cubicBezier(0.33, 1.53, 0.69, 0.99);
const backIn = /* @__PURE__ */ reverseEasing(backOut);
const backInOut = /* @__PURE__ */ mirrorEasing(backIn);
const anticipate = (p) => (p *= 2) < 1 ? 0.5 * backIn(p) : 0.5 * (2 - Math.pow(2, -10 * (p - 1)));
const circIn = (p) => 1 - Math.sin(Math.acos(p));
const circOut = reverseEasing(circIn);
const circInOut = mirrorEasing(circIn);
const easeIn = /* @__PURE__ */ cubicBezier(0.42, 0, 1, 1);
const easeOut = /* @__PURE__ */ cubicBezier(0, 0, 0.58, 1);
const easeInOut = /* @__PURE__ */ cubicBezier(0.42, 0, 0.58, 1);
function steps(numSteps, direction = "end") {
  return (progress2) => {
    progress2 = direction === "end" ? Math.min(progress2, 0.999) : Math.max(progress2, 1e-3);
    const expanded = progress2 * numSteps;
    const rounded = direction === "end" ? Math.floor(expanded) : Math.ceil(expanded);
    return clamp(0, 1, rounded / numSteps);
  };
}
const isEasingArray = (ease2) => {
  return Array.isArray(ease2) && typeof ease2[0] !== "number";
};
function getEasingForSegment(easing, i) {
  return isEasingArray(easing) ? easing[wrap(0, easing.length, i)] : easing;
}
const isBezierDefinition = (easing) => Array.isArray(easing) && typeof easing[0] === "number";
const easingLookup = {
  linear: noop,
  easeIn,
  easeInOut,
  easeOut,
  circIn,
  circInOut,
  circOut,
  backIn,
  backInOut,
  backOut,
  anticipate
};
const isValidEasing = (easing) => {
  return typeof easing === "string";
};
const easingDefinitionToFunction = (definition) => {
  if (isBezierDefinition(definition)) {
    exports.invariant(definition.length === 4, `Cubic bezier arrays must contain four numerical values.`, "cubic-bezier-length");
    const [x1, y1, x2, y2] = definition;
    return cubicBezier(x1, y1, x2, y2);
  } else if (isValidEasing(definition)) {
    exports.invariant(easingLookup[definition] !== void 0, `Invalid easing type '${definition}'`, "invalid-easing-type");
    return easingLookup[definition];
  }
  return definition;
};
function isDOMKeyframes(keyframes) {
  return typeof keyframes === "object" && !Array.isArray(keyframes);
}
function resolveSubjects(subject, keyframes, scope, selectorCache) {
  if (typeof subject === "string" && isDOMKeyframes(keyframes)) {
    return motionDom.resolveElements(subject, scope, selectorCache);
  } else if (subject instanceof NodeList) {
    return Array.from(subject);
  } else if (Array.isArray(subject)) {
    return subject;
  } else {
    return [subject];
  }
}
function calculateRepeatDuration(duration, repeat, _repeatDelay) {
  return duration * (repeat + 1);
}
function calcNextTime(current, next, prev, labels) {
  if (typeof next === "number") {
    return next;
  } else if (next.startsWith("-") || next.startsWith("+")) {
    return Math.max(0, current + parseFloat(next));
  } else if (next === "<") {
    return prev;
  } else if (next.startsWith("<")) {
    return Math.max(0, prev + parseFloat(next.slice(1)));
  } else {
    return labels.get(next) ?? current;
  }
}
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
      at: motionDom.mixNumber(startTime, endTime, offset[i]),
      easing: getEasingForSegment(easing, i)
    });
  }
}
function normalizeTimes(times, repeat) {
  for (let i = 0; i < times.length; i++) {
    times[i] = times[i] / (repeat + 1);
  }
}
function compareByTime(a, b) {
  if (a.at === b.at) {
    if (a.value === null)
      return 1;
    if (b.value === null)
      return -1;
    return 0;
  } else {
    return a.at - b.at;
  }
}
const defaultSegmentEasing = "easeInOut";
const MAX_REPEAT = 20;
function createAnimationsFromSequence(sequence, { defaultTransition = {}, ...sequenceTransition } = {}, scope, generators) {
  const defaultDuration = defaultTransition.duration || 0.3;
  const animationDefinitions = /* @__PURE__ */ new Map();
  const sequences = /* @__PURE__ */ new Map();
  const elementCache = {};
  const timeLabels = /* @__PURE__ */ new Map();
  let prevTime = 0;
  let currentTime = 0;
  let totalDuration = 0;
  for (let i = 0; i < sequence.length; i++) {
    const segment = sequence[i];
    if (typeof segment === "string") {
      timeLabels.set(segment, currentTime);
      continue;
    } else if (!Array.isArray(segment)) {
      timeLabels.set(segment.name, calcNextTime(currentTime, segment.at, prevTime, timeLabels));
      continue;
    }
    let [subject, keyframes, transition = {}] = segment;
    if (transition.at !== void 0) {
      currentTime = calcNextTime(currentTime, transition.at, prevTime, timeLabels);
    }
    let maxDuration = 0;
    const resolveValueSequence = (valueKeyframes, valueTransition, valueSequence, elementIndex = 0, numSubjects = 0) => {
      const valueKeyframesAsList = keyframesAsList(valueKeyframes);
      const { delay: delay2 = 0, times = motionDom.defaultOffset(valueKeyframesAsList), type = "keyframes", repeat, repeatType, repeatDelay = 0, ...remainingTransition } = valueTransition;
      let { ease: ease2 = defaultTransition.ease || "easeOut", duration } = valueTransition;
      const calculatedDelay = typeof delay2 === "function" ? delay2(elementIndex, numSubjects) : delay2;
      const numKeyframes = valueKeyframesAsList.length;
      const createGenerator = motionDom.isGenerator(type) ? type : generators == null ? void 0 : generators[type || "keyframes"];
      if (numKeyframes <= 2 && createGenerator) {
        let absoluteDelta = 100;
        if (numKeyframes === 2 && isNumberKeyframesArray(valueKeyframesAsList)) {
          const delta = valueKeyframesAsList[1] - valueKeyframesAsList[0];
          absoluteDelta = Math.abs(delta);
        }
        const springTransition = { ...remainingTransition };
        if (duration !== void 0) {
          springTransition.duration = /* @__PURE__ */ secondsToMilliseconds(duration);
        }
        const springEasing = motionDom.createGeneratorEasing(springTransition, absoluteDelta, createGenerator);
        ease2 = springEasing.ease;
        duration = springEasing.duration;
      }
      duration ?? (duration = defaultDuration);
      const startTime = currentTime + calculatedDelay;
      if (times.length === 1 && times[0] === 0) {
        times[1] = 1;
      }
      const remainder = times.length - valueKeyframesAsList.length;
      remainder > 0 && motionDom.fillOffset(times, remainder);
      valueKeyframesAsList.length === 1 && valueKeyframesAsList.unshift(null);
      if (repeat) {
        exports.invariant(repeat < MAX_REPEAT, "Repeat count too high, must be less than 20", "repeat-count-high");
        duration = calculateRepeatDuration(duration, repeat);
        const originalKeyframes = [...valueKeyframesAsList];
        const originalTimes = [...times];
        ease2 = Array.isArray(ease2) ? [...ease2] : [ease2];
        const originalEase = [...ease2];
        for (let repeatIndex = 0; repeatIndex < repeat; repeatIndex++) {
          valueKeyframesAsList.push(...originalKeyframes);
          for (let keyframeIndex = 0; keyframeIndex < originalKeyframes.length; keyframeIndex++) {
            times.push(originalTimes[keyframeIndex] + (repeatIndex + 1));
            ease2.push(keyframeIndex === 0 ? "linear" : getEasingForSegment(originalEase, keyframeIndex - 1));
          }
        }
        normalizeTimes(times, repeat);
      }
      const targetTime = startTime + duration;
      addKeyframes(valueSequence, valueKeyframesAsList, ease2, times, startTime, targetTime);
      maxDuration = Math.max(calculatedDelay + duration, maxDuration);
      totalDuration = Math.max(targetTime, totalDuration);
    };
    if (motionDom.isMotionValue(subject)) {
      const subjectSequence = getSubjectSequence(subject, sequences);
      resolveValueSequence(keyframes, transition, getValueSequence("default", subjectSequence));
    } else {
      const subjects = resolveSubjects(subject, keyframes, scope, elementCache);
      const numSubjects = subjects.length;
      for (let subjectIndex = 0; subjectIndex < numSubjects; subjectIndex++) {
        keyframes = keyframes;
        transition = transition;
        const thisSubject = subjects[subjectIndex];
        const subjectSequence = getSubjectSequence(thisSubject, sequences);
        for (const key in keyframes) {
          resolveValueSequence(keyframes[key], getValueTransition(transition, key), getValueSequence(key, subjectSequence), subjectIndex, numSubjects);
        }
      }
    }
    prevTime = currentTime;
    currentTime += maxDuration;
  }
  sequences.forEach((valueSequences, element) => {
    for (const key in valueSequences) {
      const valueSequence = valueSequences[key];
      valueSequence.sort(compareByTime);
      const keyframes = [];
      const valueOffset = [];
      const valueEasing = [];
      for (let i = 0; i < valueSequence.length; i++) {
        const { at, value, easing } = valueSequence[i];
        keyframes.push(value);
        valueOffset.push(/* @__PURE__ */ progress(0, totalDuration, at));
        valueEasing.push(easing || "easeOut");
      }
      if (valueOffset[0] !== 0) {
        valueOffset.unshift(0);
        keyframes.unshift(keyframes[0]);
        valueEasing.unshift(defaultSegmentEasing);
      }
      if (valueOffset[valueOffset.length - 1] !== 1) {
        valueOffset.push(1);
        keyframes.push(null);
      }
      if (!animationDefinitions.has(element)) {
        animationDefinitions.set(element, {
          keyframes: {},
          transition: {}
        });
      }
      const definition = animationDefinitions.get(element);
      definition.keyframes[key] = keyframes;
      definition.transition[key] = {
        ...defaultTransition,
        duration: totalDuration,
        ease: valueEasing,
        times: valueOffset,
        ...sequenceTransition
      };
    }
  });
  return animationDefinitions;
}
function getSubjectSequence(subject, sequences) {
  !sequences.has(subject) && sequences.set(subject, {});
  return sequences.get(subject);
}
function getValueSequence(name, sequences) {
  if (!sequences[name])
    sequences[name] = [];
  return sequences[name];
}
function keyframesAsList(keyframes) {
  return Array.isArray(keyframes) ? keyframes : [keyframes];
}
function getValueTransition(transition, key) {
  return transition && transition[key] ? {
    ...transition,
    ...transition[key]
  } : { ...transition };
}
const isNumber$1 = (keyframe) => typeof keyframe === "number";
const isNumberKeyframesArray = (keyframes) => keyframes.every(isNumber$1);
const visualElementStore = /* @__PURE__ */ new WeakMap();
const isKeyframesTarget = (v) => {
  return Array.isArray(v);
};
function getValueState(visualElement) {
  const state = [{}, {}];
  visualElement == null ? void 0 : visualElement.values.forEach((value, key) => {
    state[0][key] = value.get();
    state[1][key] = value.getVelocity();
  });
  return state;
}
function resolveVariantFromProps(props, definition, custom, visualElement) {
  if (typeof definition === "function") {
    const [current, velocity] = getValueState(visualElement);
    definition = definition(custom !== void 0 ? custom : props.custom, current, velocity);
  }
  if (typeof definition === "string") {
    definition = props.variants && props.variants[definition];
  }
  if (typeof definition === "function") {
    const [current, velocity] = getValueState(visualElement);
    definition = definition(custom !== void 0 ? custom : props.custom, current, velocity);
  }
  return definition;
}
function resolveVariant$1(visualElement, definition, custom) {
  const props = visualElement.getProps();
  return resolveVariantFromProps(props, definition, props.custom, visualElement);
}
function setMotionValue(visualElement, key, value) {
  if (visualElement.hasValue(key)) {
    visualElement.getValue(key).set(value);
  } else {
    visualElement.addValue(key, motionDom.motionValue(value));
  }
}
function resolveFinalValueInKeyframes(v) {
  return isKeyframesTarget(v) ? v[v.length - 1] || 0 : v;
}
function setTarget(visualElement, definition) {
  const resolved = resolveVariant$1(visualElement, definition);
  let { transitionEnd = {}, transition = {}, ...target } = resolved || {};
  target = { ...target, ...transitionEnd };
  for (const key in target) {
    const value = resolveFinalValueInKeyframes(target[key]);
    setMotionValue(visualElement, key, value);
  }
}
function isWillChangeMotionValue$1(value) {
  return Boolean(motionDom.isMotionValue(value) && value.add);
}
function addValueToWillChange$1(visualElement, key) {
  const willChange = visualElement.getValue("willChange");
  if (isWillChangeMotionValue$1(willChange)) {
    return willChange.add(key);
  } else if (!willChange && MotionGlobalConfig.WillChange) {
    const newWillChange = new MotionGlobalConfig.WillChange("auto");
    visualElement.addValue("willChange", newWillChange);
    newWillChange.add(key);
  }
}
const camelToDash = (str) => str.replace(/([a-z])([A-Z])/gu, "$1-$2").toLowerCase();
const optimizedAppearDataId = "framerAppearId";
const optimizedAppearDataAttribute = "data-" + camelToDash(optimizedAppearDataId);
function getOptimisedAppearId(visualElement) {
  return visualElement.props[optimizedAppearDataAttribute];
}
const isNotNull = (value) => value !== null;
function getFinalKeyframe(keyframes, { repeat, repeatType = "loop" }, finalKeyframe) {
  const resolvedKeyframes = keyframes.filter(isNotNull);
  const index = repeat && repeatType !== "loop" && repeat % 2 === 1 ? 0 : resolvedKeyframes.length - 1;
  return !index || finalKeyframe === void 0 ? resolvedKeyframes[index] : finalKeyframe;
}
const underDampedSpring = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
};
const criticallyDampedSpring = (target) => ({
  type: "spring",
  stiffness: 550,
  damping: target === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
});
const keyframesTransition = {
  type: "keyframes",
  duration: 0.8
};
const ease = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
};
const getDefaultTransition = (valueKey, { keyframes }) => {
  if (keyframes.length > 2) {
    return keyframesTransition;
  } else if (motionDom.transformProps.has(valueKey)) {
    return valueKey.startsWith("scale") ? criticallyDampedSpring(keyframes[1]) : underDampedSpring;
  }
  return ease;
};
function isTransitionDefined({ when, delay: _delay, delayChildren, staggerChildren, staggerDirection, repeat, repeatType, repeatDelay, from, elapsed, ...transition }) {
  return !!Object.keys(transition).length;
}
const animateMotionValue = (name, value, target, transition = {}, element, isHandoff) => (onComplete) => {
  const valueTransition = motionDom.getValueTransition(transition, name) || {};
  const delay2 = valueTransition.delay || transition.delay || 0;
  let { elapsed = 0 } = transition;
  elapsed = elapsed - /* @__PURE__ */ secondsToMilliseconds(delay2);
  const options = {
    keyframes: Array.isArray(target) ? target : [null, target],
    ease: "easeOut",
    velocity: value.getVelocity(),
    ...valueTransition,
    delay: -elapsed,
    onUpdate: (v) => {
      value.set(v);
      valueTransition.onUpdate && valueTransition.onUpdate(v);
    },
    onComplete: () => {
      onComplete();
      valueTransition.onComplete && valueTransition.onComplete();
    },
    name,
    motionValue: value,
    element: isHandoff ? void 0 : element
  };
  if (!isTransitionDefined(valueTransition)) {
    Object.assign(options, getDefaultTransition(name, options));
  }
  options.duration && (options.duration = /* @__PURE__ */ secondsToMilliseconds(options.duration));
  options.repeatDelay && (options.repeatDelay = /* @__PURE__ */ secondsToMilliseconds(options.repeatDelay));
  if (options.from !== void 0) {
    options.keyframes[0] = options.from;
  }
  let shouldSkip = false;
  if (options.type === false || options.duration === 0 && !options.repeatDelay) {
    motionDom.makeAnimationInstant(options);
    if (options.delay === 0) {
      shouldSkip = true;
    }
  }
  if (MotionGlobalConfig.instantAnimations || MotionGlobalConfig.skipAnimations) {
    shouldSkip = true;
    motionDom.makeAnimationInstant(options);
    options.delay = 0;
  }
  options.allowFlatten = !valueTransition.type && !valueTransition.ease;
  if (shouldSkip && !isHandoff && value.get() !== void 0) {
    const finalKeyframe = getFinalKeyframe(options.keyframes, valueTransition);
    if (finalKeyframe !== void 0) {
      motionDom.frame.update(() => {
        options.onUpdate(finalKeyframe);
        options.onComplete();
      });
      return;
    }
  }
  return valueTransition.isSync ? new motionDom.JSAnimation(options) : new motionDom.AsyncMotionValueAnimation(options);
};
function shouldBlockAnimation({ protectedKeys, needsAnimating }, key) {
  const shouldBlock = protectedKeys.hasOwnProperty(key) && needsAnimating[key] !== true;
  needsAnimating[key] = false;
  return shouldBlock;
}
function animateTarget(visualElement, targetAndTransition, { delay: delay2 = 0, transitionOverride, type } = {}) {
  let { transition = visualElement.getDefaultTransition(), transitionEnd, ...target } = targetAndTransition;
  if (transitionOverride)
    transition = transitionOverride;
  const animations = [];
  const animationTypeState = type && visualElement.animationState && visualElement.animationState.getState()[type];
  for (const key in target) {
    const value = visualElement.getValue(key, visualElement.latestValues[key] ?? null);
    const valueTarget = target[key];
    if (valueTarget === void 0 || animationTypeState && shouldBlockAnimation(animationTypeState, key)) {
      continue;
    }
    const valueTransition = {
      delay: delay2,
      ...motionDom.getValueTransition(transition || {}, key)
    };
    const currentValue = value.get();
    if (currentValue !== void 0 && !value.isAnimating && !Array.isArray(valueTarget) && valueTarget === currentValue && !valueTransition.velocity) {
      continue;
    }
    let isHandoff = false;
    if (window.MotionHandoffAnimation) {
      const appearId = getOptimisedAppearId(visualElement);
      if (appearId) {
        const startTime = window.MotionHandoffAnimation(appearId, key, motionDom.frame);
        if (startTime !== null) {
          valueTransition.startTime = startTime;
          isHandoff = true;
        }
      }
    }
    addValueToWillChange$1(visualElement, key);
    value.start(animateMotionValue(key, value, valueTarget, visualElement.shouldReduceMotion && motionDom.positionalKeys.has(key) ? { type: false } : valueTransition, visualElement, isHandoff));
    const animation = value.animation;
    if (animation) {
      animations.push(animation);
    }
  }
  if (transitionEnd) {
    Promise.all(animations).then(() => {
      motionDom.frame.update(() => {
        transitionEnd && setTarget(visualElement, transitionEnd);
      });
    });
  }
  return animations;
}
function convertBoundingBoxToBox$1({ top, left, right, bottom }) {
  return {
    x: { min: left, max: right },
    y: { min: top, max: bottom }
  };
}
function transformBoxPoints$1(point2, transformPoint2) {
  if (!transformPoint2)
    return point2;
  const topLeft = transformPoint2({ x: point2.left, y: point2.top });
  const bottomRight = transformPoint2({ x: point2.right, y: point2.bottom });
  return {
    top: topLeft.y,
    left: topLeft.x,
    bottom: bottomRight.y,
    right: bottomRight.x
  };
}
function isIdentityScale(scale) {
  return scale === void 0 || scale === 1;
}
function hasScale({ scale, scaleX, scaleY }) {
  return !isIdentityScale(scale) || !isIdentityScale(scaleX) || !isIdentityScale(scaleY);
}
function hasTransform(values) {
  return hasScale(values) || has2DTranslate(values) || values.z || values.rotate || values.rotateX || values.rotateY || values.skewX || values.skewY;
}
function has2DTranslate(values) {
  return is2DTranslate(values.x) || is2DTranslate(values.y);
}
function is2DTranslate(value) {
  return value && value !== "0%";
}
function scalePoint(point2, scale, originPoint) {
  const distanceFromOrigin = point2 - originPoint;
  const scaled = scale * distanceFromOrigin;
  return originPoint + scaled;
}
function applyPointDelta(point2, translate, scale, originPoint, boxScale) {
  if (boxScale !== void 0) {
    point2 = scalePoint(point2, boxScale, originPoint);
  }
  return scalePoint(point2, scale, originPoint) + translate;
}
function applyAxisDelta(axis, translate = 0, scale = 1, originPoint, boxScale) {
  axis.min = applyPointDelta(axis.min, translate, scale, originPoint, boxScale);
  axis.max = applyPointDelta(axis.max, translate, scale, originPoint, boxScale);
}
function applyBoxDelta(box, { x, y }) {
  applyAxisDelta(box.x, x.translate, x.scale, x.originPoint);
  applyAxisDelta(box.y, y.translate, y.scale, y.originPoint);
}
const TREE_SCALE_SNAP_MIN = 0.999999999999;
const TREE_SCALE_SNAP_MAX = 1.0000000000001;
function applyTreeDeltas(box, treeScale, treePath, isSharedTransition = false) {
  const treeLength = treePath.length;
  if (!treeLength)
    return;
  treeScale.x = treeScale.y = 1;
  let node;
  let delta;
  for (let i = 0; i < treeLength; i++) {
    node = treePath[i];
    delta = node.projectionDelta;
    const { visualElement } = node.options;
    if (visualElement && visualElement.props.style && visualElement.props.style.display === "contents") {
      continue;
    }
    if (isSharedTransition && node.options.layoutScroll && node.scroll && node !== node.root) {
      transformBox(box, {
        x: -node.scroll.offset.x,
        y: -node.scroll.offset.y
      });
    }
    if (delta) {
      treeScale.x *= delta.x.scale;
      treeScale.y *= delta.y.scale;
      applyBoxDelta(box, delta);
    }
    if (isSharedTransition && hasTransform(node.latestValues)) {
      transformBox(box, node.latestValues);
    }
  }
  if (treeScale.x < TREE_SCALE_SNAP_MAX && treeScale.x > TREE_SCALE_SNAP_MIN) {
    treeScale.x = 1;
  }
  if (treeScale.y < TREE_SCALE_SNAP_MAX && treeScale.y > TREE_SCALE_SNAP_MIN) {
    treeScale.y = 1;
  }
}
function translateAxis$1(axis, distance2) {
  axis.min = axis.min + distance2;
  axis.max = axis.max + distance2;
}
function transformAxis(axis, axisTranslate, axisScale, boxScale, axisOrigin = 0.5) {
  const originPoint = motionDom.mixNumber(axis.min, axis.max, axisOrigin);
  applyAxisDelta(axis, axisTranslate, axisScale, originPoint, boxScale);
}
function transformBox(box, transform) {
  transformAxis(box.x, transform.x, transform.scaleX, transform.scale, transform.originX);
  transformAxis(box.y, transform.y, transform.scaleY, transform.scale, transform.originY);
}
function measureViewportBox$1(instance, transformPoint2) {
  return convertBoundingBoxToBox$1(transformBoxPoints$1(instance.getBoundingClientRect(), transformPoint2));
}
const featureProps = {
  animation: [
    "animate",
    "variants",
    "whileHover",
    "whileTap",
    "exit",
    "whileInView",
    "whileFocus",
    "whileDrag"
  ],
  exit: ["exit"],
  drag: ["drag", "dragControls"],
  focus: ["whileFocus"],
  hover: ["whileHover", "onHoverStart", "onHoverEnd"],
  tap: ["whileTap", "onTap", "onTapStart", "onTapCancel"],
  pan: ["onPan", "onPanStart", "onPanSessionStart", "onPanEnd"],
  inView: ["whileInView", "onViewportEnter", "onViewportLeave"],
  layout: ["layout", "layoutId"]
};
const featureDefinitions = {};
for (const key in featureProps) {
  featureDefinitions[key] = {
    isEnabled: (props) => featureProps[key].some((name) => !!props[name])
  };
}
const createAxisDelta = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
});
const createDelta = () => ({
  x: createAxisDelta(),
  y: createAxisDelta()
});
const createAxis$1 = () => ({ min: 0, max: 0 });
const createBox$1 = () => ({
  x: createAxis$1(),
  y: createAxis$1()
});
const isBrowser = typeof window !== "undefined";
const prefersReducedMotion = { current: null };
const hasReducedMotionListener = { current: false };
function initPrefersReducedMotion() {
  hasReducedMotionListener.current = true;
  if (!isBrowser)
    return;
  if (window.matchMedia) {
    const motionMediaQuery = window.matchMedia("(prefers-reduced-motion)");
    const setReducedMotionPreferences = () => prefersReducedMotion.current = motionMediaQuery.matches;
    motionMediaQuery.addEventListener("change", setReducedMotionPreferences);
    setReducedMotionPreferences();
  } else {
    prefersReducedMotion.current = false;
  }
}
function isAnimationControls$1(v) {
  return v !== null && typeof v === "object" && typeof v.start === "function";
}
function isVariantLabel(v) {
  return typeof v === "string" || Array.isArray(v);
}
const variantPriorityOrder = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
];
const variantProps = ["initial", ...variantPriorityOrder];
function isControllingVariants(props) {
  return isAnimationControls$1(props.animate) || variantProps.some((name) => isVariantLabel(props[name]));
}
function isVariantNode(props) {
  return Boolean(isControllingVariants(props) || props.variants);
}
function updateMotionValuesFromProps(element, next, prev) {
  for (const key in next) {
    const nextValue = next[key];
    const prevValue = prev[key];
    if (motionDom.isMotionValue(nextValue)) {
      element.addValue(key, nextValue);
    } else if (motionDom.isMotionValue(prevValue)) {
      element.addValue(key, motionDom.motionValue(nextValue, { owner: element }));
    } else if (prevValue !== nextValue) {
      if (element.hasValue(key)) {
        const existingValue = element.getValue(key);
        if (existingValue.liveStyle === true) {
          existingValue.jump(nextValue);
        } else if (!existingValue.hasAnimated) {
          existingValue.set(nextValue);
        }
      } else {
        const latestValue = element.getStaticValue(key);
        element.addValue(key, motionDom.motionValue(latestValue !== void 0 ? latestValue : nextValue, { owner: element }));
      }
    }
  }
  for (const key in prev) {
    if (next[key] === void 0)
      element.removeValue(key);
  }
  return next;
}
const propEventHandlers = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
class VisualElement {
  /**
   * This method takes React props and returns found MotionValues. For example, HTML
   * MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
   *
   * This isn't an abstract method as it needs calling in the constructor, but it is
   * intended to be one.
   */
  scrapeMotionValuesFromProps(_props, _prevProps, _visualElement) {
    return {};
  }
  constructor({ parent, props, presenceContext, reducedMotionConfig, blockInitialAnimation, visualState }, options = {}) {
    this.current = null;
    this.children = /* @__PURE__ */ new Set();
    this.isVariantNode = false;
    this.isControllingVariants = false;
    this.shouldReduceMotion = null;
    this.values = /* @__PURE__ */ new Map();
    this.KeyframeResolver = motionDom.KeyframeResolver;
    this.features = {};
    this.valueSubscriptions = /* @__PURE__ */ new Map();
    this.prevMotionValues = {};
    this.events = {};
    this.propEventSubscriptions = {};
    this.notifyUpdate = () => this.notify("Update", this.latestValues);
    this.render = () => {
      if (!this.current)
        return;
      this.triggerBuild();
      this.renderInstance(this.current, this.renderState, this.props.style, this.projection);
    };
    this.renderScheduledAt = 0;
    this.scheduleRender = () => {
      const now = motionDom.time.now();
      if (this.renderScheduledAt < now) {
        this.renderScheduledAt = now;
        motionDom.frame.render(this.render, false, true);
      }
    };
    const { latestValues, renderState } = visualState;
    this.latestValues = latestValues;
    this.baseTarget = { ...latestValues };
    this.initialValues = props.initial ? { ...latestValues } : {};
    this.renderState = renderState;
    this.parent = parent;
    this.props = props;
    this.presenceContext = presenceContext;
    this.depth = parent ? parent.depth + 1 : 0;
    this.reducedMotionConfig = reducedMotionConfig;
    this.options = options;
    this.blockInitialAnimation = Boolean(blockInitialAnimation);
    this.isControllingVariants = isControllingVariants(props);
    this.isVariantNode = isVariantNode(props);
    if (this.isVariantNode) {
      this.variantChildren = /* @__PURE__ */ new Set();
    }
    this.manuallyAnimateOnMount = Boolean(parent && parent.current);
    const { willChange, ...initialMotionValues } = this.scrapeMotionValuesFromProps(props, {}, this);
    for (const key in initialMotionValues) {
      const value = initialMotionValues[key];
      if (latestValues[key] !== void 0 && motionDom.isMotionValue(value)) {
        value.set(latestValues[key]);
      }
    }
  }
  mount(instance) {
    var _a;
    this.current = instance;
    visualElementStore.set(instance, this);
    if (this.projection && !this.projection.instance) {
      this.projection.mount(instance);
    }
    if (this.parent && this.isVariantNode && !this.isControllingVariants) {
      this.removeFromVariantTree = this.parent.addVariantChild(this);
    }
    this.values.forEach((value, key) => this.bindToMotionValue(key, value));
    if (!hasReducedMotionListener.current) {
      initPrefersReducedMotion();
    }
    this.shouldReduceMotion = this.reducedMotionConfig === "never" ? false : this.reducedMotionConfig === "always" ? true : prefersReducedMotion.current;
    if (process.env.NODE_ENV !== "production") {
      warnOnce(this.shouldReduceMotion !== true, "You have Reduced Motion enabled on your device. Animations may not appear as expected.", "reduced-motion-disabled");
    }
    (_a = this.parent) == null ? void 0 : _a.addChild(this);
    this.update(this.props, this.presenceContext);
  }
  unmount() {
    var _a;
    this.projection && this.projection.unmount();
    motionDom.cancelFrame(this.notifyUpdate);
    motionDom.cancelFrame(this.render);
    this.valueSubscriptions.forEach((remove) => remove());
    this.valueSubscriptions.clear();
    this.removeFromVariantTree && this.removeFromVariantTree();
    (_a = this.parent) == null ? void 0 : _a.removeChild(this);
    for (const key in this.events) {
      this.events[key].clear();
    }
    for (const key in this.features) {
      const feature = this.features[key];
      if (feature) {
        feature.unmount();
        feature.isMounted = false;
      }
    }
    this.current = null;
  }
  addChild(child) {
    this.children.add(child);
    this.enteringChildren ?? (this.enteringChildren = /* @__PURE__ */ new Set());
    this.enteringChildren.add(child);
  }
  removeChild(child) {
    this.children.delete(child);
    this.enteringChildren && this.enteringChildren.delete(child);
  }
  bindToMotionValue(key, value) {
    if (this.valueSubscriptions.has(key)) {
      this.valueSubscriptions.get(key)();
    }
    const valueIsTransform = motionDom.transformProps.has(key);
    if (valueIsTransform && this.onBindTransform) {
      this.onBindTransform();
    }
    const removeOnChange = value.on("change", (latestValue) => {
      this.latestValues[key] = latestValue;
      this.props.onUpdate && motionDom.frame.preRender(this.notifyUpdate);
      if (valueIsTransform && this.projection) {
        this.projection.isTransformDirty = true;
      }
      this.scheduleRender();
    });
    let removeSyncCheck;
    if (window.MotionCheckAppearSync) {
      removeSyncCheck = window.MotionCheckAppearSync(this, key, value);
    }
    this.valueSubscriptions.set(key, () => {
      removeOnChange();
      if (removeSyncCheck)
        removeSyncCheck();
      if (value.owner)
        value.stop();
    });
  }
  sortNodePosition(other) {
    if (!this.current || !this.sortInstanceNodePosition || this.type !== other.type) {
      return 0;
    }
    return this.sortInstanceNodePosition(this.current, other.current);
  }
  updateFeatures() {
    let key = "animation";
    for (key in featureDefinitions) {
      const featureDefinition = featureDefinitions[key];
      if (!featureDefinition)
        continue;
      const { isEnabled, Feature: FeatureConstructor } = featureDefinition;
      if (!this.features[key] && FeatureConstructor && isEnabled(this.props)) {
        this.features[key] = new FeatureConstructor(this);
      }
      if (this.features[key]) {
        const feature = this.features[key];
        if (feature.isMounted) {
          feature.update();
        } else {
          feature.mount();
          feature.isMounted = true;
        }
      }
    }
  }
  triggerBuild() {
    this.build(this.renderState, this.latestValues, this.props);
  }
  /**
   * Measure the current viewport box with or without transforms.
   * Only measures axis-aligned boxes, rotate and skew must be manually
   * removed with a re-render to work.
   */
  measureViewportBox() {
    return this.current ? this.measureInstanceViewportBox(this.current, this.props) : createBox$1();
  }
  getStaticValue(key) {
    return this.latestValues[key];
  }
  setStaticValue(key, value) {
    this.latestValues[key] = value;
  }
  /**
   * Update the provided props. Ensure any newly-added motion values are
   * added to our map, old ones removed, and listeners updated.
   */
  update(props, presenceContext) {
    if (props.transformTemplate || this.props.transformTemplate) {
      this.scheduleRender();
    }
    this.prevProps = this.props;
    this.props = props;
    this.prevPresenceContext = this.presenceContext;
    this.presenceContext = presenceContext;
    for (let i = 0; i < propEventHandlers.length; i++) {
      const key = propEventHandlers[i];
      if (this.propEventSubscriptions[key]) {
        this.propEventSubscriptions[key]();
        delete this.propEventSubscriptions[key];
      }
      const listenerName = "on" + key;
      const listener = props[listenerName];
      if (listener) {
        this.propEventSubscriptions[key] = this.on(key, listener);
      }
    }
    this.prevMotionValues = updateMotionValuesFromProps(this, this.scrapeMotionValuesFromProps(props, this.prevProps, this), this.prevMotionValues);
    if (this.handleChildMotionValue) {
      this.handleChildMotionValue();
    }
  }
  getProps() {
    return this.props;
  }
  /**
   * Returns the variant definition with a given name.
   */
  getVariant(name) {
    return this.props.variants ? this.props.variants[name] : void 0;
  }
  /**
   * Returns the defined default transition on this component.
   */
  getDefaultTransition() {
    return this.props.transition;
  }
  getTransformPagePoint() {
    return this.props.transformPagePoint;
  }
  getClosestVariantNode() {
    return this.isVariantNode ? this : this.parent ? this.parent.getClosestVariantNode() : void 0;
  }
  /**
   * Add a child visual element to our set of children.
   */
  addVariantChild(child) {
    const closestVariantNode = this.getClosestVariantNode();
    if (closestVariantNode) {
      closestVariantNode.variantChildren && closestVariantNode.variantChildren.add(child);
      return () => closestVariantNode.variantChildren.delete(child);
    }
  }
  /**
   * Add a motion value and bind it to this visual element.
   */
  addValue(key, value) {
    const existingValue = this.values.get(key);
    if (value !== existingValue) {
      if (existingValue)
        this.removeValue(key);
      this.bindToMotionValue(key, value);
      this.values.set(key, value);
      this.latestValues[key] = value.get();
    }
  }
  /**
   * Remove a motion value and unbind any active subscriptions.
   */
  removeValue(key) {
    this.values.delete(key);
    const unsubscribe = this.valueSubscriptions.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.valueSubscriptions.delete(key);
    }
    delete this.latestValues[key];
    this.removeValueFromRenderState(key, this.renderState);
  }
  /**
   * Check whether we have a motion value for this key
   */
  hasValue(key) {
    return this.values.has(key);
  }
  getValue(key, defaultValue) {
    if (this.props.values && this.props.values[key]) {
      return this.props.values[key];
    }
    let value = this.values.get(key);
    if (value === void 0 && defaultValue !== void 0) {
      value = motionDom.motionValue(defaultValue === null ? void 0 : defaultValue, { owner: this });
      this.addValue(key, value);
    }
    return value;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(key, target) {
    let value = this.latestValues[key] !== void 0 || !this.current ? this.latestValues[key] : this.getBaseTargetFromProps(this.props, key) ?? this.readValueFromInstance(this.current, key, this.options);
    if (value !== void 0 && value !== null) {
      if (typeof value === "string" && (isNumericalString(value) || isZeroValueString(value))) {
        value = parseFloat(value);
      } else if (!motionDom.findValueType(value) && motionDom.complex.test(target)) {
        value = motionDom.getAnimatableNone(key, target);
      }
      this.setBaseTarget(key, motionDom.isMotionValue(value) ? value.get() : value);
    }
    return motionDom.isMotionValue(value) ? value.get() : value;
  }
  /**
   * Set the base target to later animate back to. This is currently
   * only hydrated on creation and when we first read a value.
   */
  setBaseTarget(key, value) {
    this.baseTarget[key] = value;
  }
  /**
   * Find the base target for a value thats been removed from all animation
   * props.
   */
  getBaseTarget(key) {
    var _a;
    const { initial } = this.props;
    let valueFromInitial;
    if (typeof initial === "string" || typeof initial === "object") {
      const variant = resolveVariantFromProps(this.props, initial, (_a = this.presenceContext) == null ? void 0 : _a.custom);
      if (variant) {
        valueFromInitial = variant[key];
      }
    }
    if (initial && valueFromInitial !== void 0) {
      return valueFromInitial;
    }
    const target = this.getBaseTargetFromProps(this.props, key);
    if (target !== void 0 && !motionDom.isMotionValue(target))
      return target;
    return this.initialValues[key] !== void 0 && valueFromInitial === void 0 ? void 0 : this.baseTarget[key];
  }
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = new SubscriptionManager();
    }
    return this.events[eventName].add(callback);
  }
  notify(eventName, ...args) {
    if (this.events[eventName]) {
      this.events[eventName].notify(...args);
    }
  }
  scheduleRenderMicrotask() {
    motionDom.microtask.render(this.render);
  }
}
class DOMVisualElement extends VisualElement {
  constructor() {
    super(...arguments);
    this.KeyframeResolver = motionDom.DOMKeyframesResolver;
  }
  sortInstanceNodePosition(a, b) {
    return a.compareDocumentPosition(b) & 2 ? 1 : -1;
  }
  getBaseTargetFromProps(props, key) {
    return props.style ? props.style[key] : void 0;
  }
  removeValueFromRenderState(key, { vars, style: style2 }) {
    delete vars[key];
    delete style2[key];
  }
  handleChildMotionValue() {
    if (this.childSubscription) {
      this.childSubscription();
      delete this.childSubscription;
    }
    const { children } = this.props;
    if (motionDom.isMotionValue(children)) {
      this.childSubscription = children.on("change", (latest) => {
        if (this.current) {
          this.current.textContent = `${latest}`;
        }
      });
    }
  }
}
const translateAlias = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
};
const numTransforms = motionDom.transformPropOrder.length;
function buildTransform(latestValues, transform, transformTemplate) {
  let transformString = "";
  let transformIsDefault = true;
  for (let i = 0; i < numTransforms; i++) {
    const key = motionDom.transformPropOrder[i];
    const value = latestValues[key];
    if (value === void 0)
      continue;
    let valueIsDefault = true;
    if (typeof value === "number") {
      valueIsDefault = value === (key.startsWith("scale") ? 1 : 0);
    } else {
      valueIsDefault = parseFloat(value) === 0;
    }
    if (!valueIsDefault || transformTemplate) {
      const valueAsType = motionDom.getValueAsType(value, motionDom.numberValueTypes[key]);
      if (!valueIsDefault) {
        transformIsDefault = false;
        const transformName = translateAlias[key] || key;
        transformString += `${transformName}(${valueAsType}) `;
      }
      if (transformTemplate) {
        transform[key] = valueAsType;
      }
    }
  }
  transformString = transformString.trim();
  if (transformTemplate) {
    transformString = transformTemplate(transform, transformIsDefault ? "" : transformString);
  } else if (transformIsDefault) {
    transformString = "none";
  }
  return transformString;
}
function buildHTMLStyles(state, latestValues, transformTemplate) {
  const { style: style2, vars, transformOrigin } = state;
  let hasTransform2 = false;
  let hasTransformOrigin = false;
  for (const key in latestValues) {
    const value = latestValues[key];
    if (motionDom.transformProps.has(key)) {
      hasTransform2 = true;
      continue;
    } else if (motionDom.isCSSVariableName(key)) {
      vars[key] = value;
      continue;
    } else {
      const valueAsType = motionDom.getValueAsType(value, motionDom.numberValueTypes[key]);
      if (key.startsWith("origin")) {
        hasTransformOrigin = true;
        transformOrigin[key] = valueAsType;
      } else {
        style2[key] = valueAsType;
      }
    }
  }
  if (!latestValues.transform) {
    if (hasTransform2 || transformTemplate) {
      style2.transform = buildTransform(latestValues, state.transform, transformTemplate);
    } else if (style2.transform) {
      style2.transform = "none";
    }
  }
  if (hasTransformOrigin) {
    const { originX = "50%", originY = "50%", originZ = 0 } = transformOrigin;
    style2.transformOrigin = `${originX} ${originY} ${originZ}`;
  }
}
function renderHTML(element, { style: style2, vars }, styleProp, projection) {
  const elementStyle = element.style;
  let key;
  for (key in style2) {
    elementStyle[key] = style2[key];
  }
  projection == null ? void 0 : projection.applyProjectionStyles(elementStyle, styleProp);
  for (key in vars) {
    elementStyle.setProperty(key, vars[key]);
  }
}
function pixelsToPercent(pixels, axis) {
  if (axis.max === axis.min)
    return 0;
  return pixels / (axis.max - axis.min) * 100;
}
const correctBorderRadius = {
  correct: (latest, node) => {
    if (!node.target)
      return latest;
    if (typeof latest === "string") {
      if (motionDom.px.test(latest)) {
        latest = parseFloat(latest);
      } else {
        return latest;
      }
    }
    const x = pixelsToPercent(latest, node.target.x);
    const y = pixelsToPercent(latest, node.target.y);
    return `${x}% ${y}%`;
  }
};
const correctBoxShadow = {
  correct: (latest, { treeScale, projectionDelta }) => {
    const original = latest;
    const shadow = motionDom.complex.parse(latest);
    if (shadow.length > 5)
      return original;
    const template = motionDom.complex.createTransformer(latest);
    const offset = typeof shadow[0] !== "number" ? 1 : 0;
    const xScale = projectionDelta.x.scale * treeScale.x;
    const yScale = projectionDelta.y.scale * treeScale.y;
    shadow[0 + offset] /= xScale;
    shadow[1 + offset] /= yScale;
    const averageScale = motionDom.mixNumber(xScale, yScale, 0.5);
    if (typeof shadow[2 + offset] === "number")
      shadow[2 + offset] /= averageScale;
    if (typeof shadow[3 + offset] === "number")
      shadow[3 + offset] /= averageScale;
    return template(shadow);
  }
};
const scaleCorrectors = {
  borderRadius: {
    ...correctBorderRadius,
    applyTo: [
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius"
    ]
  },
  borderTopLeftRadius: correctBorderRadius,
  borderTopRightRadius: correctBorderRadius,
  borderBottomLeftRadius: correctBorderRadius,
  borderBottomRightRadius: correctBorderRadius,
  boxShadow: correctBoxShadow
};
function addScaleCorrector(correctors) {
  for (const key in correctors) {
    scaleCorrectors[key] = correctors[key];
    if (motionDom.isCSSVariableName(key)) {
      scaleCorrectors[key].isCSSVariable = true;
    }
  }
}
function isForcedMotionValue(key, { layout, layoutId }) {
  return motionDom.transformProps.has(key) || key.startsWith("origin") || (layout || layoutId !== void 0) && (!!scaleCorrectors[key] || key === "opacity");
}
function scrapeMotionValuesFromProps$1(props, prevProps, visualElement) {
  var _a;
  const { style: style2 } = props;
  const newValues = {};
  for (const key in style2) {
    if (motionDom.isMotionValue(style2[key]) || prevProps.style && motionDom.isMotionValue(prevProps.style[key]) || isForcedMotionValue(key, props) || ((_a = visualElement == null ? void 0 : visualElement.getValue(key)) == null ? void 0 : _a.liveStyle) !== void 0) {
      newValues[key] = style2[key];
    }
  }
  return newValues;
}
function getComputedStyle$1(element) {
  return window.getComputedStyle(element);
}
class HTMLVisualElement extends DOMVisualElement {
  constructor() {
    super(...arguments);
    this.type = "html";
    this.renderInstance = renderHTML;
  }
  readValueFromInstance(instance, key) {
    var _a;
    if (motionDom.transformProps.has(key)) {
      return ((_a = this.projection) == null ? void 0 : _a.isProjecting) ? motionDom.defaultTransformValue(key) : motionDom.readTransformValue(instance, key);
    } else {
      const computedStyle = getComputedStyle$1(instance);
      const value = (motionDom.isCSSVariableName(key) ? computedStyle.getPropertyValue(key) : computedStyle[key]) || 0;
      return typeof value === "string" ? value.trim() : value;
    }
  }
  measureInstanceViewportBox(instance, { transformPagePoint }) {
    return measureViewportBox$1(instance, transformPagePoint);
  }
  build(renderState, latestValues, props) {
    buildHTMLStyles(renderState, latestValues, props.transformTemplate);
  }
  scrapeMotionValuesFromProps(props, prevProps, visualElement) {
    return scrapeMotionValuesFromProps$1(props, prevProps, visualElement);
  }
}
function isObjectKey(key, object) {
  return key in object;
}
class ObjectVisualElement extends VisualElement {
  constructor() {
    super(...arguments);
    this.type = "object";
  }
  readValueFromInstance(instance, key) {
    if (isObjectKey(key, instance)) {
      const value = instance[key];
      if (typeof value === "string" || typeof value === "number") {
        return value;
      }
    }
    return void 0;
  }
  getBaseTargetFromProps() {
    return void 0;
  }
  removeValueFromRenderState(key, renderState) {
    delete renderState.output[key];
  }
  measureInstanceViewportBox() {
    return createBox$1();
  }
  build(renderState, latestValues) {
    Object.assign(renderState.output, latestValues);
  }
  renderInstance(instance, { output }) {
    Object.assign(instance, output);
  }
  sortInstanceNodePosition() {
    return 0;
  }
}
const dashKeys = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
};
const camelKeys = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function buildSVGPath$1(attrs, length, spacing = 1, offset = 0, useDashCase = true) {
  attrs.pathLength = 1;
  const keys2 = useDashCase ? dashKeys : camelKeys;
  attrs[keys2.offset] = motionDom.px.transform(-offset);
  const pathLength = motionDom.px.transform(length);
  const pathSpacing = motionDom.px.transform(spacing);
  attrs[keys2.array] = `${pathLength} ${pathSpacing}`;
}
function buildSVGAttrs(state, {
  attrX,
  attrY,
  attrScale,
  pathLength,
  pathSpacing = 1,
  pathOffset = 0,
  // This is object creation, which we try to avoid per-frame.
  ...latest
}, isSVGTag2, transformTemplate, styleProp) {
  buildHTMLStyles(state, latest, transformTemplate);
  if (isSVGTag2) {
    if (state.style.viewBox) {
      state.attrs.viewBox = state.style.viewBox;
    }
    return;
  }
  state.attrs = state.style;
  state.style = {};
  const { attrs, style: style2 } = state;
  if (attrs.transform) {
    style2.transform = attrs.transform;
    delete attrs.transform;
  }
  if (style2.transform || attrs.transformOrigin) {
    style2.transformOrigin = attrs.transformOrigin ?? "50% 50%";
    delete attrs.transformOrigin;
  }
  if (style2.transform) {
    style2.transformBox = (styleProp == null ? void 0 : styleProp.transformBox) ?? "fill-box";
    delete attrs.transformBox;
  }
  if (attrX !== void 0)
    attrs.x = attrX;
  if (attrY !== void 0)
    attrs.y = attrY;
  if (attrScale !== void 0)
    attrs.scale = attrScale;
  if (pathLength !== void 0) {
    buildSVGPath$1(attrs, pathLength, pathSpacing, pathOffset, false);
  }
}
const camelCaseAttributes = /* @__PURE__ */ new Set([
  "baseFrequency",
  "diffuseConstant",
  "kernelMatrix",
  "kernelUnitLength",
  "keySplines",
  "keyTimes",
  "limitingConeAngle",
  "markerHeight",
  "markerWidth",
  "numOctaves",
  "targetX",
  "targetY",
  "surfaceScale",
  "specularConstant",
  "specularExponent",
  "stdDeviation",
  "tableValues",
  "viewBox",
  "gradientTransform",
  "pathLength",
  "startOffset",
  "textLength",
  "lengthAdjust"
]);
const isSVGTag = (tag) => typeof tag === "string" && tag.toLowerCase() === "svg";
function renderSVG(element, renderState, _styleProp, projection) {
  renderHTML(element, renderState, void 0, projection);
  for (const key in renderState.attrs) {
    element.setAttribute(!camelCaseAttributes.has(key) ? camelToDash(key) : key, renderState.attrs[key]);
  }
}
function scrapeMotionValuesFromProps(props, prevProps, visualElement) {
  const newValues = scrapeMotionValuesFromProps$1(props, prevProps, visualElement);
  for (const key in props) {
    if (motionDom.isMotionValue(props[key]) || motionDom.isMotionValue(prevProps[key])) {
      const targetKey = motionDom.transformPropOrder.indexOf(key) !== -1 ? "attr" + key.charAt(0).toUpperCase() + key.substring(1) : key;
      newValues[targetKey] = props[key];
    }
  }
  return newValues;
}
class SVGVisualElement extends DOMVisualElement {
  constructor() {
    super(...arguments);
    this.type = "svg";
    this.isSVGTag = false;
    this.measureInstanceViewportBox = createBox$1;
  }
  getBaseTargetFromProps(props, key) {
    return props[key];
  }
  readValueFromInstance(instance, key) {
    if (motionDom.transformProps.has(key)) {
      const defaultType = motionDom.getDefaultValueType(key);
      return defaultType ? defaultType.default || 0 : 0;
    }
    key = !camelCaseAttributes.has(key) ? camelToDash(key) : key;
    return instance.getAttribute(key);
  }
  scrapeMotionValuesFromProps(props, prevProps, visualElement) {
    return scrapeMotionValuesFromProps(props, prevProps, visualElement);
  }
  build(renderState, latestValues, props) {
    buildSVGAttrs(renderState, latestValues, this.isSVGTag, props.transformTemplate, props.style);
  }
  renderInstance(instance, renderState, styleProp, projection) {
    renderSVG(instance, renderState, styleProp, projection);
  }
  mount(instance) {
    this.isSVGTag = isSVGTag(instance.tagName);
    super.mount(instance);
  }
}
function createDOMVisualElement(element) {
  const options = {
    presenceContext: null,
    props: {},
    visualState: {
      renderState: {
        transform: {},
        transformOrigin: {},
        style: {},
        vars: {},
        attrs: {}
      },
      latestValues: {}
    }
  };
  const node = motionDom.isSVGElement(element) && !motionDom.isSVGSVGElement(element) ? new SVGVisualElement(options) : new HTMLVisualElement(options);
  node.mount(element);
  visualElementStore.set(element, node);
}
function createObjectVisualElement(subject) {
  const options = {
    presenceContext: null,
    props: {},
    visualState: {
      renderState: {
        output: {}
      },
      latestValues: {}
    }
  };
  const node = new ObjectVisualElement(options);
  node.mount(subject);
  visualElementStore.set(subject, node);
}
function animateSingleValue(value, keyframes, options) {
  const motionValue$1 = motionDom.isMotionValue(value) ? value : motionDom.motionValue(value);
  motionValue$1.start(animateMotionValue("", motionValue$1, keyframes, options));
  return motionValue$1.animation;
}
function isSingleValue(subject, keyframes) {
  return motionDom.isMotionValue(subject) || typeof subject === "number" || typeof subject === "string" && !isDOMKeyframes(keyframes);
}
function animateSubject(subject, keyframes, options, scope) {
  const animations = [];
  if (isSingleValue(subject, keyframes)) {
    animations.push(animateSingleValue(subject, isDOMKeyframes(keyframes) ? keyframes.default || keyframes : keyframes, options ? options.default || options : options));
  } else {
    const subjects = resolveSubjects(subject, keyframes, scope);
    const numSubjects = subjects.length;
    exports.invariant(Boolean(numSubjects), "No valid elements provided.", "no-valid-elements");
    for (let i = 0; i < numSubjects; i++) {
      const thisSubject = subjects[i];
      exports.invariant(thisSubject !== null, "You're trying to perform an animation on null. Ensure that selectors are correctly finding elements and refs are correctly hydrated.", "animate-null");
      const createVisualElement2 = thisSubject instanceof Element ? createDOMVisualElement : createObjectVisualElement;
      if (!visualElementStore.has(thisSubject)) {
        createVisualElement2(thisSubject);
      }
      const visualElement = visualElementStore.get(thisSubject);
      const transition = { ...options };
      if ("delay" in transition && typeof transition.delay === "function") {
        transition.delay = transition.delay(i, numSubjects);
      }
      animations.push(...animateTarget(visualElement, { ...keyframes, transition }, {}));
    }
  }
  return animations;
}
function animateSequence(sequence, options, scope) {
  const animations = [];
  const animationDefinitions = createAnimationsFromSequence(sequence, options, scope, { spring: motionDom.spring });
  animationDefinitions.forEach(({ keyframes, transition }, subject) => {
    animations.push(...animateSubject(subject, keyframes, transition));
  });
  return animations;
}
function isSequence(value) {
  return Array.isArray(value) && value.some(Array.isArray);
}
function createScopedAnimate(scope) {
  function scopedAnimate(subjectOrSequence, optionsOrKeyframes, options) {
    let animations = [];
    let animationOnComplete;
    if (isSequence(subjectOrSequence)) {
      animations = animateSequence(subjectOrSequence, optionsOrKeyframes, scope);
    } else {
      const { onComplete, ...rest } = options || {};
      if (typeof onComplete === "function") {
        animationOnComplete = onComplete;
      }
      animations = animateSubject(subjectOrSequence, optionsOrKeyframes, rest, scope);
    }
    const animation = new motionDom.GroupAnimationWithThen(animations);
    if (animationOnComplete) {
      animation.finished.then(animationOnComplete);
    }
    if (scope) {
      scope.animations.push(animation);
      animation.finished.then(() => {
        removeItem(scope.animations, animation);
      });
    }
    return animation;
  }
  return scopedAnimate;
}
const animate = createScopedAnimate();
function animateElements(elementOrSelector, keyframes, options, scope) {
  const elements = motionDom.resolveElements(elementOrSelector, scope);
  const numElements = elements.length;
  exports.invariant(Boolean(numElements), "No valid elements provided.", "no-valid-elements");
  const animationDefinitions = [];
  for (let i = 0; i < numElements; i++) {
    const element = elements[i];
    const elementTransition = { ...options };
    if (typeof elementTransition.delay === "function") {
      elementTransition.delay = elementTransition.delay(i, numElements);
    }
    for (const valueName in keyframes) {
      let valueKeyframes = keyframes[valueName];
      if (!Array.isArray(valueKeyframes)) {
        valueKeyframes = [valueKeyframes];
      }
      const valueOptions = {
        ...motionDom.getValueTransition(elementTransition, valueName)
      };
      valueOptions.duration && (valueOptions.duration = /* @__PURE__ */ secondsToMilliseconds(valueOptions.duration));
      valueOptions.delay && (valueOptions.delay = /* @__PURE__ */ secondsToMilliseconds(valueOptions.delay));
      const map = motionDom.getAnimationMap(element);
      const key = motionDom.animationMapKey(valueName, valueOptions.pseudoElement || "");
      const currentAnimation = map.get(key);
      currentAnimation && currentAnimation.stop();
      animationDefinitions.push({
        map,
        key,
        unresolvedKeyframes: valueKeyframes,
        options: {
          ...valueOptions,
          element,
          name: valueName,
          allowFlatten: !elementTransition.type && !elementTransition.ease
        }
      });
    }
  }
  for (let i = 0; i < animationDefinitions.length; i++) {
    const { unresolvedKeyframes, options: animationOptions } = animationDefinitions[i];
    const { element, name, pseudoElement } = animationOptions;
    if (!pseudoElement && unresolvedKeyframes[0] === null) {
      unresolvedKeyframes[0] = motionDom.getComputedStyle(element, name);
    }
    motionDom.fillWildcards(unresolvedKeyframes);
    motionDom.applyPxDefaults(unresolvedKeyframes, name);
    if (!pseudoElement && unresolvedKeyframes.length < 2) {
      unresolvedKeyframes.unshift(motionDom.getComputedStyle(element, name));
    }
    animationOptions.keyframes = unresolvedKeyframes;
  }
  const animations = [];
  for (let i = 0; i < animationDefinitions.length; i++) {
    const { map, key, options: animationOptions } = animationDefinitions[i];
    const animation = new motionDom.NativeAnimation(animationOptions);
    map.set(key, animation);
    animation.finished.finally(() => map.delete(key));
    animations.push(animation);
  }
  return animations;
}
const createScopedWaapiAnimate = (scope) => {
  function scopedAnimate(elementOrSelector, keyframes, options) {
    return new motionDom.GroupAnimationWithThen(animateElements(elementOrSelector, keyframes, options, scope));
  }
  return scopedAnimate;
};
const animateMini = /* @__PURE__ */ createScopedWaapiAnimate();
const maxElapsed = 50;
const createAxisInfo = () => ({
  current: 0,
  offset: [],
  progress: 0,
  scrollLength: 0,
  targetOffset: 0,
  targetLength: 0,
  containerLength: 0,
  velocity: 0
});
const createScrollInfo = () => ({
  time: 0,
  x: createAxisInfo(),
  y: createAxisInfo()
});
const keys = {
  x: {
    length: "Width",
    position: "Left"
  },
  y: {
    length: "Height",
    position: "Top"
  }
};
function updateAxisInfo(element, axisName, info, time) {
  const axis = info[axisName];
  const { length, position } = keys[axisName];
  const prev = axis.current;
  const prevTime = info.time;
  axis.current = element[`scroll${position}`];
  axis.scrollLength = element[`scroll${length}`] - element[`client${length}`];
  axis.offset.length = 0;
  axis.offset[0] = 0;
  axis.offset[1] = axis.scrollLength;
  axis.progress = /* @__PURE__ */ progress(0, axis.scrollLength, axis.current);
  const elapsed = time - prevTime;
  axis.velocity = elapsed > maxElapsed ? 0 : velocityPerSecond(axis.current - prev, elapsed);
}
function updateScrollInfo(element, info, time) {
  updateAxisInfo(element, "x", info, time);
  updateAxisInfo(element, "y", info, time);
  info.time = time;
}
function calcInset(element, container) {
  const inset = { x: 0, y: 0 };
  let current = element;
  while (current && current !== container) {
    if (motionDom.isHTMLElement(current)) {
      inset.x += current.offsetLeft;
      inset.y += current.offsetTop;
      current = current.offsetParent;
    } else if (current.tagName === "svg") {
      const svgBoundingBox = current.getBoundingClientRect();
      current = current.parentElement;
      const parentBoundingBox = current.getBoundingClientRect();
      inset.x += svgBoundingBox.left - parentBoundingBox.left;
      inset.y += svgBoundingBox.top - parentBoundingBox.top;
    } else if (current instanceof SVGGraphicsElement) {
      const { x, y } = current.getBBox();
      inset.x += x;
      inset.y += y;
      let svg = null;
      let parent = current.parentNode;
      while (!svg) {
        if (parent.tagName === "svg") {
          svg = parent;
        }
        parent = current.parentNode;
      }
      current = svg;
    } else {
      break;
    }
  }
  return inset;
}
const namedEdges = {
  start: 0,
  center: 0.5,
  end: 1
};
function resolveEdge(edge, length, inset = 0) {
  let delta = 0;
  if (edge in namedEdges) {
    edge = namedEdges[edge];
  }
  if (typeof edge === "string") {
    const asNumber2 = parseFloat(edge);
    if (edge.endsWith("px")) {
      delta = asNumber2;
    } else if (edge.endsWith("%")) {
      edge = asNumber2 / 100;
    } else if (edge.endsWith("vw")) {
      delta = asNumber2 / 100 * document.documentElement.clientWidth;
    } else if (edge.endsWith("vh")) {
      delta = asNumber2 / 100 * document.documentElement.clientHeight;
    } else {
      edge = asNumber2;
    }
  }
  if (typeof edge === "number") {
    delta = length * edge;
  }
  return inset + delta;
}
const defaultOffset = [0, 0];
function resolveOffset(offset, containerLength, targetLength, targetInset) {
  let offsetDefinition = Array.isArray(offset) ? offset : defaultOffset;
  let targetPoint = 0;
  let containerPoint = 0;
  if (typeof offset === "number") {
    offsetDefinition = [offset, offset];
  } else if (typeof offset === "string") {
    offset = offset.trim();
    if (offset.includes(" ")) {
      offsetDefinition = offset.split(" ");
    } else {
      offsetDefinition = [offset, namedEdges[offset] ? offset : `0`];
    }
  }
  targetPoint = resolveEdge(offsetDefinition[0], targetLength, targetInset);
  containerPoint = resolveEdge(offsetDefinition[1], containerLength);
  return targetPoint - containerPoint;
}
const ScrollOffset = {
  Enter: [
    [0, 1],
    [1, 1]
  ],
  Exit: [
    [0, 0],
    [1, 0]
  ],
  Any: [
    [1, 0],
    [0, 1]
  ],
  All: [
    [0, 0],
    [1, 1]
  ]
};
const point = { x: 0, y: 0 };
function getTargetSize(target) {
  return "getBBox" in target && target.tagName !== "svg" ? target.getBBox() : { width: target.clientWidth, height: target.clientHeight };
}
function resolveOffsets(container, info, options) {
  const { offset: offsetDefinition = ScrollOffset.All } = options;
  const { target = container, axis = "y" } = options;
  const lengthLabel = axis === "y" ? "height" : "width";
  const inset = target !== container ? calcInset(target, container) : point;
  const targetSize = target === container ? { width: container.scrollWidth, height: container.scrollHeight } : getTargetSize(target);
  const containerSize = {
    width: container.clientWidth,
    height: container.clientHeight
  };
  info[axis].offset.length = 0;
  let hasChanged2 = !info[axis].interpolate;
  const numOffsets = offsetDefinition.length;
  for (let i = 0; i < numOffsets; i++) {
    const offset = resolveOffset(offsetDefinition[i], containerSize[lengthLabel], targetSize[lengthLabel], inset[axis]);
    if (!hasChanged2 && offset !== info[axis].interpolatorOffsets[i]) {
      hasChanged2 = true;
    }
    info[axis].offset[i] = offset;
  }
  if (hasChanged2) {
    info[axis].interpolate = motionDom.interpolate(info[axis].offset, motionDom.defaultOffset(offsetDefinition), { clamp: false });
    info[axis].interpolatorOffsets = [...info[axis].offset];
  }
  info[axis].progress = clamp(0, 1, info[axis].interpolate(info[axis].current));
}
function measure(container, target = container, info) {
  info.x.targetOffset = 0;
  info.y.targetOffset = 0;
  if (target !== container) {
    let node = target;
    while (node && node !== container) {
      info.x.targetOffset += node.offsetLeft;
      info.y.targetOffset += node.offsetTop;
      node = node.offsetParent;
    }
  }
  info.x.targetLength = target === container ? target.scrollWidth : target.clientWidth;
  info.y.targetLength = target === container ? target.scrollHeight : target.clientHeight;
  info.x.containerLength = container.clientWidth;
  info.y.containerLength = container.clientHeight;
  if (process.env.NODE_ENV !== "production") {
    if (container && target && target !== container) {
      warnOnce(getComputedStyle(container).position !== "static", "Please ensure that the container has a non-static position, like 'relative', 'fixed', or 'absolute' to ensure scroll offset is calculated correctly.");
    }
  }
}
function createOnScrollHandler(element, onScroll, info, options = {}) {
  return {
    measure: (time) => {
      measure(element, options.target, info);
      updateScrollInfo(element, info, time);
      if (options.offset || options.target) {
        resolveOffsets(element, info, options);
      }
    },
    notify: () => onScroll(info)
  };
}
const scrollListeners = /* @__PURE__ */ new WeakMap();
const resizeListeners = /* @__PURE__ */ new WeakMap();
const onScrollHandlers = /* @__PURE__ */ new WeakMap();
const getEventTarget = (element) => element === document.scrollingElement ? window : element;
function scrollInfo(onScroll, { container = document.scrollingElement, ...options } = {}) {
  if (!container)
    return noop;
  let containerHandlers = onScrollHandlers.get(container);
  if (!containerHandlers) {
    containerHandlers = /* @__PURE__ */ new Set();
    onScrollHandlers.set(container, containerHandlers);
  }
  const info = createScrollInfo();
  const containerHandler = createOnScrollHandler(container, onScroll, info, options);
  containerHandlers.add(containerHandler);
  if (!scrollListeners.has(container)) {
    const measureAll = () => {
      for (const handler of containerHandlers) {
        handler.measure(motionDom.frameData.timestamp);
      }
      motionDom.frame.preUpdate(notifyAll);
    };
    const notifyAll = () => {
      for (const handler of containerHandlers) {
        handler.notify();
      }
    };
    const listener2 = () => motionDom.frame.read(measureAll);
    scrollListeners.set(container, listener2);
    const target = getEventTarget(container);
    window.addEventListener("resize", listener2, { passive: true });
    if (container !== document.documentElement) {
      resizeListeners.set(container, motionDom.resize(container, listener2));
    }
    target.addEventListener("scroll", listener2, { passive: true });
    listener2();
  }
  const listener = scrollListeners.get(container);
  motionDom.frame.read(listener, false, true);
  return () => {
    var _a;
    motionDom.cancelFrame(listener);
    const currentHandlers = onScrollHandlers.get(container);
    if (!currentHandlers)
      return;
    currentHandlers.delete(containerHandler);
    if (currentHandlers.size)
      return;
    const scrollListener = scrollListeners.get(container);
    scrollListeners.delete(container);
    if (scrollListener) {
      getEventTarget(container).removeEventListener("scroll", scrollListener);
      (_a = resizeListeners.get(container)) == null ? void 0 : _a();
      window.removeEventListener("resize", scrollListener);
    }
  };
}
const timelineCache = /* @__PURE__ */ new Map();
function scrollTimelineFallback(options) {
  const currentTime = { value: 0 };
  const cancel = scrollInfo((info) => {
    currentTime.value = info[options.axis].progress * 100;
  }, options);
  return { currentTime, cancel };
}
function getTimeline({ source, container, ...options }) {
  const { axis } = options;
  if (source)
    container = source;
  const containerCache = timelineCache.get(container) ?? /* @__PURE__ */ new Map();
  timelineCache.set(container, containerCache);
  const targetKey = options.target ?? "self";
  const targetCache = containerCache.get(targetKey) ?? {};
  const axisKey = axis + (options.offset ?? []).join(",");
  if (!targetCache[axisKey]) {
    targetCache[axisKey] = !options.target && motionDom.supportsScrollTimeline() ? new ScrollTimeline({ source: container, axis }) : scrollTimelineFallback({ container, ...options });
  }
  return targetCache[axisKey];
}
function attachToAnimation(animation, options) {
  const timeline = getTimeline(options);
  return animation.attachTimeline({
    timeline: options.target ? void 0 : timeline,
    observe: (valueAnimation) => {
      valueAnimation.pause();
      return motionDom.observeTimeline((progress2) => {
        valueAnimation.time = valueAnimation.iterationDuration * progress2;
      }, timeline);
    }
  });
}
function isOnScrollWithInfo(onScroll) {
  return onScroll.length === 2;
}
function attachToFunction(onScroll, options) {
  if (isOnScrollWithInfo(onScroll)) {
    return scrollInfo((info) => {
      onScroll(info[options.axis].progress, info);
    }, options);
  } else {
    return motionDom.observeTimeline(onScroll, getTimeline(options));
  }
}
function scroll(onScroll, { axis = "y", container = document.scrollingElement, ...options } = {}) {
  if (!container)
    return noop;
  const optionsWithDefaults = { axis, container, ...options };
  return typeof onScroll === "function" ? attachToFunction(onScroll, optionsWithDefaults) : attachToAnimation(onScroll, optionsWithDefaults);
}
const thresholds = {
  some: 0,
  all: 1
};
function inView(elementOrSelector, onStart, { root, margin: rootMargin, amount = "some" } = {}) {
  const elements = motionDom.resolveElements(elementOrSelector);
  const activeIntersections = /* @__PURE__ */ new WeakMap();
  const onIntersectionChange = (entries) => {
    entries.forEach((entry) => {
      const onEnd = activeIntersections.get(entry.target);
      if (entry.isIntersecting === Boolean(onEnd))
        return;
      if (entry.isIntersecting) {
        const newOnEnd = onStart(entry.target, entry);
        if (typeof newOnEnd === "function") {
          activeIntersections.set(entry.target, newOnEnd);
        } else {
          observer.unobserve(entry.target);
        }
      } else if (typeof onEnd === "function") {
        onEnd(entry);
        activeIntersections.delete(entry.target);
      }
    });
  };
  const observer = new IntersectionObserver(onIntersectionChange, {
    root,
    rootMargin,
    threshold: typeof amount === "number" ? amount : thresholds[amount]
  });
  elements.forEach((element) => observer.observe(element));
  return () => observer.disconnect();
}
function delay(callback, timeout) {
  const start = motionDom.time.now();
  const checkElapsed = ({ timestamp }) => {
    const elapsed = timestamp - start;
    if (elapsed >= timeout) {
      motionDom.cancelFrame(checkElapsed);
      callback(elapsed - timeout);
    }
  };
  motionDom.frame.setup(checkElapsed, true);
  return () => motionDom.cancelFrame(checkElapsed);
}
function delayInSeconds(callback, timeout) {
  return delay(callback, /* @__PURE__ */ secondsToMilliseconds(timeout));
}
const distance = (a, b) => Math.abs(a - b);
function distance2D(a, b) {
  const xDelta = distance(a.x, b.x);
  const yDelta = distance(a.y, b.y);
  return Math.sqrt(xDelta ** 2 + yDelta ** 2);
}
function getMotionElement(el) {
  if (!el)
    return void 0;
  if (el.nodeType === 3 || el.nodeType === 8) {
    return getMotionElement(el.nextSibling);
  }
  return el;
}
function getElement(target) {
  return getMotionElement(core.unrefElement(target));
}
function createContext(providerComponentName, contextName) {
  const symbolDescription = typeof providerComponentName === "string" && !contextName ? `${providerComponentName}Context` : contextName;
  const injectionKey = Symbol(symbolDescription);
  const injectContext = (fallback) => {
    const context = vue.inject(injectionKey, fallback);
    if (context === void 0) {
      throw new Error(
        `Injection \`${injectionKey.toString()}\` not found. Component must be used within ${Array.isArray(providerComponentName) ? `one of the following components: ${providerComponentName.join(
          ", "
        )}` : `\`${providerComponentName}\``}`
      );
    }
    return context;
  };
  const provideContext = (contextValue) => {
    vue.provide(injectionKey, contextValue);
    return contextValue;
  };
  return [injectContext, provideContext];
}
function useInView(domRef, options) {
  const isInView = vue.ref(false);
  vue.watchEffect((onCleanup) => {
    const realOptions = vue.unref(options) || {};
    const { once } = realOptions;
    const el = core.unrefElement(domRef);
    if (!el || once && isInView.value) {
      return;
    }
    const onEnter = () => {
      isInView.value = true;
      return once ? void 0 : () => {
        isInView.value = false;
      };
    };
    const cleanup = inView(el, onEnter, {
      ...realOptions,
      root: vue.unref(realOptions.root)
    });
    onCleanup(() => {
      cleanup();
    });
  }, {
    flush: "post"
  });
  return isInView;
}
function useAnimationFrame(callback) {
  let initialTimestamp = 0;
  const provideTimeSinceStart = ({ timestamp, delta }) => {
    if (!initialTimestamp)
      initialTimestamp = timestamp;
    callback(timestamp - initialTimestamp, delta);
  };
  const cancel = () => motionDom.cancelFrame(provideTimeSinceStart);
  vue.onBeforeUpdate(() => {
    cancel();
    motionDom.frame.update(provideTimeSinceStart, true);
  });
  vue.onUnmounted(() => cancel());
  motionDom.frame.update(provideTimeSinceStart, true);
}
function getContextWindow({ current }) {
  return current ? current.ownerDocument.defaultView : null;
}
function useDomRef() {
  const dom = vue.ref(null);
  const domProxy = new Proxy(dom, {
    get(target, key) {
      if (typeof key === "string" || typeof key === "symbol") {
        return Reflect.get(target, key);
      }
      return void 0;
    },
    set(target, key, value) {
      if (key === "value")
        return Reflect.set(target, key, getMotionElement((value == null ? void 0 : value.$el) || value));
      return true;
    }
  });
  return domProxy;
}
function usePageInView() {
  const isInView = vue.ref(true);
  const handleVisibilityChange = () => {
    isInView.value = !document.hidden;
  };
  vue.onMounted(() => {
    if (document.hidden) {
      handleVisibilityChange();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });
  vue.onUnmounted(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  });
  return isInView;
}
const [injectMotion, provideMotion] = createContext("Motion");
const [injectLayoutGroup, provideLayoutGroup] = createContext("LayoutGroup");
const [useLazyMotionContext, lazyMotionContextProvider] = createContext("LazyMotionContext");
const defaultConfig = {
  reducedMotion: "never",
  transition: void 0,
  nonce: void 0
};
const [injectMotionConfig, provideMotionConfig] = createContext("MotionConfig");
function useMotionConfig() {
  return injectMotionConfig(vue.computed(() => defaultConfig));
}
const _sfc_main$5 = /* @__PURE__ */ vue.defineComponent({
  ...{
    name: "MotionConfig",
    inheritAttrs: false
  },
  __name: "MotionConfig",
  props: {
    transition: {},
    reduceMotion: {},
    reducedMotion: { default: ({ reduceMotion }) => {
      if (core.isDef(reduceMotion)) {
        heyListen.warning(false, "`reduceMotion` is deprecated. Use `reducedMotion` instead.");
        return reduceMotion;
      }
      return defaultConfig.reducedMotion;
    } },
    nonce: {},
    inViewOptions: {}
  },
  setup(__props) {
    const props = __props;
    const parentConfig = useMotionConfig();
    const config = vue.computed(() => ({
      transition: props.transition ?? parentConfig.value.transition,
      reducedMotion: props.reducedMotion ?? parentConfig.value.reducedMotion,
      nonce: props.nonce ?? parentConfig.value.nonce,
      inViewOptions: props.inViewOptions ?? parentConfig.value.inViewOptions
    }));
    provideMotionConfig(config);
    return (_ctx, _cache) => {
      return vue.renderSlot(_ctx.$slots, "default");
    };
  }
});
const [injectAnimatePresence, provideAnimatePresence] = createContext("AnimatePresenceContext");
function useAnimatePresence(props) {
  const presenceContext = {
    initial: props.initial,
    custom: props.custom
  };
  vue.watch(() => props.custom, (v) => {
    presenceContext.custom = v;
  }, {
    flush: "pre"
  });
  provideAnimatePresence(presenceContext);
  vue.onMounted(() => {
    presenceContext.initial = void 0;
  });
}
function resolveVariant(definition, variants, custom) {
  if (Array.isArray(definition)) {
    return definition.reduce((acc, item) => {
      const resolvedVariant = resolveVariant(item, variants, custom);
      return resolvedVariant ? { ...acc, ...resolvedVariant } : acc;
    }, {});
  } else if (typeof definition === "object") {
    return definition;
  } else if (definition && variants) {
    const variant = variants[definition];
    return typeof variant === "function" ? variant(custom) : variant;
  }
}
function hasChanged(a, b) {
  if (typeof a !== typeof b)
    return true;
  if (Array.isArray(a) && Array.isArray(b))
    return !shallowCompare(a, b);
  return a !== b;
}
function shallowCompare(next, prev) {
  const prevLength = prev.length;
  if (prevLength !== next.length)
    return false;
  for (let i = 0; i < prevLength; i++) {
    if (prev[i] !== next[i])
      return false;
  }
  return true;
}
function isCssVar(name) {
  return name == null ? void 0 : name.startsWith("--");
}
const noopReturn = (v) => v;
function isNumber(value) {
  return typeof value === "number";
}
const svgElements = [
  "animate",
  "circle",
  "defs",
  "desc",
  "ellipse",
  "g",
  "image",
  "line",
  "filter",
  "marker",
  "mask",
  "metadata",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "rect",
  "stop",
  "svg",
  "switch",
  "symbol",
  "text",
  "tspan",
  "use",
  "view",
  "clipPath",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "foreignObject",
  "linearGradient",
  "radialGradient",
  "textPath"
];
const svgElementSet = new Set(svgElements);
function isSVGElement(as) {
  return svgElementSet.has(as);
}
class Feature {
  constructor(state) {
    this.state = state;
  }
  beforeMount() {
  }
  mount() {
  }
  unmount(unMountChildren = false) {
  }
  update() {
  }
  beforeUpdate(options) {
  }
  beforeUnmount() {
  }
}
function handleHoverEvent$1(state, event, lifecycle) {
  const props = state.options;
  if (props.whileHover) {
    state.setActive("whileHover", lifecycle === "Start");
  }
  const eventName = `onHover${lifecycle}`;
  const callback = props[eventName];
  if (callback) {
    motionDom.frame.postRender(() => callback(event, extractEventInfo$1(event)));
  }
}
class HoverGesture extends Feature {
  isActive() {
    const { whileHover, onHoverStart, onHoverEnd } = this.state.options;
    return Boolean(whileHover || onHoverStart || onHoverEnd);
  }
  constructor(state) {
    super(state);
  }
  mount() {
    this.register();
  }
  update() {
    const { whileHover, onHoverStart, onHoverEnd } = this.state.visualElement.prevProps;
    if (!(whileHover || onHoverStart || onHoverEnd)) {
      this.register();
    }
  }
  register() {
    const element = this.state.element;
    if (!element || !this.isActive())
      return;
    this.unmount();
    this.unmount = motionDom.hover(
      element,
      (el, startEvent) => {
        handleHoverEvent$1(this.state, startEvent, "Start");
        return (endEvent) => {
          handleHoverEvent$1(this.state, endEvent, "End");
        };
      }
    );
  }
}
function extractEventInfo$1(event) {
  return {
    point: {
      x: event.pageX,
      y: event.pageY
    }
  };
}
function handlePressEvent(state, event, lifecycle) {
  const props = state.options;
  if (props.whilePress) {
    state.setActive("whilePress", lifecycle === "Start");
  }
  const eventName = `onPress${lifecycle === "End" ? "" : lifecycle}`;
  const callback = props[eventName];
  if (callback) {
    motionDom.frame.postRender(() => callback(event, extractEventInfo$1(event)));
  }
}
class PressGesture extends Feature {
  isActive() {
    const { whilePress, onPress, onPressCancel, onPressStart } = this.state.options;
    return Boolean(whilePress || onPress || onPressCancel || onPressStart);
  }
  constructor(state) {
    super(state);
  }
  mount() {
    this.register();
  }
  update() {
    const { whilePress, onPress, onPressCancel, onPressStart } = this.state.options;
    if (!(whilePress || onPress || onPressCancel || onPressStart)) {
      this.register();
    }
  }
  register() {
    const element = this.state.element;
    if (!element || !this.isActive())
      return;
    this.unmount();
    this.unmount = motionDom.press(
      element,
      (el, startEvent) => {
        handlePressEvent(this.state, startEvent, "Start");
        return (endEvent, { success }) => handlePressEvent(
          this.state,
          endEvent,
          success ? "End" : "Cancel"
        );
      },
      { useGlobalTarget: this.state.options.globalPressTarget }
    );
  }
}
function handleHoverEvent(state, entry, lifecycle) {
  const props = state.options;
  if (props.whileInView) {
    state.setActive("whileInView", lifecycle === "Enter");
  }
  const eventName = `onViewport${lifecycle}`;
  const callback = props[eventName];
  if (callback) {
    motionDom.frame.postRender(() => callback(entry));
  }
}
class InViewGesture extends Feature {
  isActive() {
    const { whileInView, onViewportEnter, onViewportLeave } = this.state.options;
    return Boolean(whileInView || onViewportEnter || onViewportLeave);
  }
  constructor(state) {
    super(state);
  }
  startObserver() {
    const element = this.state.element;
    if (!element || !this.isActive())
      return;
    this.unmount();
    const { once, ...viewOptions } = this.state.options.inViewOptions || {};
    this.unmount = inView(
      element,
      (_, entry) => {
        handleHoverEvent(this.state, entry, "Enter");
        if (!once) {
          return (endEvent) => {
            handleHoverEvent(this.state, entry, "Leave");
          };
        }
      },
      viewOptions
    );
  }
  mount() {
    this.startObserver();
  }
  update() {
    const { props, prevProps } = this.state.visualElement;
    const hasOptionsChanged = ["amount", "margin", "root"].some(
      hasViewportOptionChanged(props, prevProps)
    );
    if (hasOptionsChanged) {
      this.startObserver();
    }
  }
}
function hasViewportOptionChanged({ inViewOptions = {} }, { inViewOptions: prevViewport = {} } = {}) {
  return (name) => inViewOptions[name] !== prevViewport[name];
}
function isPrimaryPointer(event) {
  if (event.pointerType === "mouse") {
    return typeof event.button !== "number" || event.button <= 0;
  } else {
    return event.isPrimary !== false;
  }
}
function addPointerEvent(target, eventName, handler, options) {
  return addDomEvent$1(target, eventName, addPointerInfo(handler), options);
}
function extractEventInfo(event, pointType = "page") {
  return {
    point: {
      x: event[`${pointType}X`],
      y: event[`${pointType}Y`]
    }
  };
}
function addPointerInfo(handler) {
  return (event) => isPrimaryPointer(event) && handler(event, extractEventInfo(event));
}
function addDomEvent$1(target, eventName, handler, options = { passive: true }) {
  target.addEventListener(eventName, handler, options);
  return () => target.removeEventListener(eventName, handler);
}
function createLock(name) {
  let lock = null;
  return () => {
    const openLock = () => {
      lock = null;
    };
    if (lock === null) {
      lock = name;
      return openLock;
    }
    return false;
  };
}
const globalHorizontalLock = createLock("dragHorizontal");
const globalVerticalLock = createLock("dragVertical");
function getGlobalLock(drag) {
  let lock = false;
  if (drag === "y") {
    lock = globalVerticalLock();
  } else if (drag === "x") {
    lock = globalHorizontalLock();
  } else {
    const openHorizontal = globalHorizontalLock();
    const openVertical = globalVerticalLock();
    if (openHorizontal && openVertical) {
      lock = () => {
        openHorizontal();
        openVertical();
      };
    } else {
      if (openHorizontal)
        openHorizontal();
      if (openVertical)
        openVertical();
    }
  }
  return lock;
}
function calcLength$1(axis) {
  return axis.max - axis.min;
}
function applyConstraints(point2, { min, max }, elastic) {
  if (min !== void 0 && point2 < min) {
    point2 = elastic ? motionDom.mixNumber(min, point2, elastic.min) : Math.max(point2, min);
  } else if (max !== void 0 && point2 > max) {
    point2 = elastic ? motionDom.mixNumber(max, point2, elastic.max) : Math.min(point2, max);
  }
  return point2;
}
const defaultElastic = 0.35;
function calcRelativeConstraints(layoutBox, { top, left, bottom, right }) {
  return {
    x: calcRelativeAxisConstraints(layoutBox.x, left, right),
    y: calcRelativeAxisConstraints(layoutBox.y, top, bottom)
  };
}
function calcRelativeAxisConstraints(axis, min, max) {
  return {
    min: min !== void 0 ? axis.min + min : void 0,
    max: max !== void 0 ? axis.max + max - (axis.max - axis.min) : void 0
  };
}
function resolveDragElastic(dragElastic = defaultElastic) {
  if (dragElastic === false) {
    dragElastic = 0;
  } else if (dragElastic === true) {
    dragElastic = defaultElastic;
  }
  return {
    x: resolveAxisElastic(dragElastic, "left", "right"),
    y: resolveAxisElastic(dragElastic, "top", "bottom")
  };
}
function resolveAxisElastic(dragElastic, minLabel, maxLabel) {
  return {
    min: resolvePointElastic(dragElastic, minLabel),
    max: resolvePointElastic(dragElastic, maxLabel)
  };
}
function resolvePointElastic(dragElastic, label) {
  return typeof dragElastic === "number" ? dragElastic : dragElastic[label] || 0;
}
function rebaseAxisConstraints(layout, constraints) {
  const relativeConstraints = {};
  if (constraints.min !== void 0) {
    relativeConstraints.min = constraints.min - layout.min;
  }
  if (constraints.max !== void 0) {
    relativeConstraints.max = constraints.max - layout.min;
  }
  return relativeConstraints;
}
function calcViewportConstraints(layoutBox, constraintsBox) {
  return {
    x: calcViewportAxisConstraints(layoutBox.x, constraintsBox.x),
    y: calcViewportAxisConstraints(layoutBox.y, constraintsBox.y)
  };
}
function calcViewportAxisConstraints(layoutAxis, constraintsAxis) {
  let min = constraintsAxis.min - layoutAxis.min;
  let max = constraintsAxis.max - layoutAxis.max;
  if (constraintsAxis.max - constraintsAxis.min < layoutAxis.max - layoutAxis.min) {
    [min, max] = [max, min];
  }
  return { min, max };
}
function calcOrigin(source, target) {
  let origin = 0.5;
  const sourceLength = calcLength$1(source);
  const targetLength = calcLength$1(target);
  if (targetLength > sourceLength) {
    origin = /* @__PURE__ */ progress(target.min, target.max - sourceLength, source.min);
  } else if (sourceLength > targetLength) {
    origin = /* @__PURE__ */ progress(source.min, source.max - targetLength, target.min);
  }
  return clamp(0, 1, origin);
}
function isHTMLElement(value) {
  return typeof value === "object" && value !== null && "nodeType" in value;
}
class PanSession {
  constructor(event, handlers, { transformPagePoint, contextWindow, dragSnapToOrigin = false } = {}) {
    this.startEvent = null;
    this.lastMoveEvent = null;
    this.lastMoveEventInfo = null;
    this.handlers = {};
    this.contextWindow = window;
    this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const info2 = getPanInfo(this.lastMoveEventInfo, this.history);
      const isPanStarted = this.startEvent !== null;
      const isDistancePastThreshold = distance2D(info2.offset, { x: 0, y: 0 }) >= 3;
      if (!isPanStarted && !isDistancePastThreshold)
        return;
      const { point: point3 } = info2;
      const { timestamp: timestamp2 } = motionDom.frameData;
      this.history.push({ ...point3, timestamp: timestamp2 });
      const { onStart, onMove } = this.handlers;
      if (!isPanStarted) {
        onStart && onStart(this.lastMoveEvent, info2);
        this.startEvent = this.lastMoveEvent;
      }
      onMove && onMove(this.lastMoveEvent, info2);
    };
    this.handlePointerMove = (event2, info2) => {
      this.lastMoveEvent = event2;
      this.lastMoveEventInfo = transformPoint(info2, this.transformPagePoint);
      motionDom.frame.update(this.updatePoint, true);
    };
    this.handlePointerUp = (event2, info2) => {
      this.end();
      const { onEnd, onSessionEnd, resumeAnimation } = this.handlers;
      if (this.dragSnapToOrigin)
        resumeAnimation && resumeAnimation();
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const panInfo = getPanInfo(
        event2.type === "pointercancel" ? this.lastMoveEventInfo : transformPoint(info2, this.transformPagePoint),
        this.history
      );
      if (this.startEvent && onEnd) {
        onEnd(event2, panInfo);
      }
      onSessionEnd && onSessionEnd(event2, panInfo);
    };
    if (!isPrimaryPointer(event))
      return;
    this.dragSnapToOrigin = dragSnapToOrigin;
    this.handlers = handlers;
    this.transformPagePoint = transformPagePoint;
    this.contextWindow = contextWindow || window;
    const info = extractEventInfo(event);
    const initialInfo = transformPoint(info, this.transformPagePoint);
    const { point: point2 } = initialInfo;
    const { timestamp } = motionDom.frameData;
    this.history = [{ ...point2, timestamp }];
    const { onSessionStart } = handlers;
    onSessionStart && onSessionStart(event, getPanInfo(initialInfo, this.history));
    this.removeListeners = pipe(
      addPointerEvent(
        this.contextWindow,
        "pointermove",
        this.handlePointerMove
      ),
      addPointerEvent(
        this.contextWindow,
        "pointerup",
        this.handlePointerUp
      ),
      addPointerEvent(
        this.contextWindow,
        "pointercancel",
        this.handlePointerUp
      )
    );
  }
  updateHandlers(handlers) {
    this.handlers = handlers;
  }
  end() {
    this.removeListeners && this.removeListeners();
    motionDom.cancelFrame(this.updatePoint);
  }
}
function transformPoint(info, transformPagePoint) {
  return transformPagePoint ? { point: transformPagePoint(info.point) } : info;
}
function subtractPoint(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}
function getPanInfo({ point: point2 }, history) {
  return {
    point: point2,
    delta: subtractPoint(point2, lastDevicePoint(history)),
    offset: subtractPoint(point2, startDevicePoint(history)),
    velocity: getVelocity(history, 0.1)
  };
}
function startDevicePoint(history) {
  return history[0];
}
function lastDevicePoint(history) {
  return history[history.length - 1];
}
function getVelocity(history, timeDelta) {
  if (history.length < 2) {
    return { x: 0, y: 0 };
  }
  let i = history.length - 1;
  let timestampedPoint = null;
  const lastPoint = lastDevicePoint(history);
  while (i >= 0) {
    timestampedPoint = history[i];
    if (lastPoint.timestamp - timestampedPoint.timestamp > /* @__PURE__ */ secondsToMilliseconds(timeDelta)) {
      break;
    }
    i--;
  }
  if (!timestampedPoint) {
    return { x: 0, y: 0 };
  }
  const time = /* @__PURE__ */ millisecondsToSeconds(
    lastPoint.timestamp - timestampedPoint.timestamp
  );
  if (time === 0) {
    return { x: 0, y: 0 };
  }
  const currentVelocity = {
    x: (lastPoint.x - timestampedPoint.x) / time,
    y: (lastPoint.y - timestampedPoint.y) / time
  };
  if (currentVelocity.x === Infinity) {
    currentVelocity.x = 0;
  }
  if (currentVelocity.y === Infinity) {
    currentVelocity.y = 0;
  }
  return currentVelocity;
}
const createAxis = () => ({ min: 0, max: 0 });
function createBox() {
  return {
    x: createAxis(),
    y: createAxis()
  };
}
function eachAxis$1(callback) {
  return [callback("x"), callback("y")];
}
function isWillChangeMotionValue(value) {
  return Boolean(motionDom.isMotionValue(value) && value.add);
}
function addValueToWillChange(visualElement, key) {
  const willChange = visualElement.getValue("willChange");
  if (isWillChangeMotionValue(willChange)) {
    return willChange.add(key);
  }
}
function convertBoundingBoxToBox({
  top,
  left,
  right,
  bottom
}) {
  return {
    x: { min: left, max: right },
    y: { min: top, max: bottom }
  };
}
function transformBoxPoints(point2, transformPoint2) {
  if (!transformPoint2)
    return point2;
  const topLeft = transformPoint2({ x: point2.left, y: point2.top });
  const bottomRight = transformPoint2({ x: point2.right, y: point2.bottom });
  return {
    top: topLeft.y,
    left: topLeft.x,
    bottom: bottomRight.y,
    right: bottomRight.x
  };
}
function convertBoxToBoundingBox({ x, y }) {
  return { top: y.min, right: x.max, bottom: y.max, left: x.min };
}
function translateAxis(axis, distance2) {
  axis.min = axis.min + distance2;
  axis.max = axis.max + distance2;
}
function measureViewportBox(instance, transformPoint2) {
  return convertBoundingBoxToBox(
    transformBoxPoints(instance.getBoundingClientRect(), transformPoint2)
  );
}
function measurePageBox(element, rootProjectionNode2, transformPagePoint) {
  const viewportBox = measureViewportBox(element, transformPagePoint);
  const { scroll: scroll2 } = rootProjectionNode2;
  if (scroll2) {
    translateAxis(viewportBox.x, scroll2.offset.x);
    translateAxis(viewportBox.y, scroll2.offset.y);
  }
  return viewportBox;
}
function isPresent(visualElement) {
  var _a;
  return (_a = visualElement.projection) == null ? void 0 : _a.isPresent;
}
const elementDragControls = /* @__PURE__ */ new WeakMap();
class VisualElementDragControls {
  constructor(visualElement) {
    this.openGlobalLock = null;
    this.isDragging = false;
    this.currentDirection = null;
    this.originPoint = { x: 0, y: 0 };
    this.constraints = false;
    this.hasMutatedConstraints = false;
    this.elastic = createBox();
    this.visualElement = visualElement;
  }
  start(originEvent, { snapToCursor = false } = {}) {
    const onSessionStart = (event) => {
      const { dragSnapToOrigin: dragSnapToOrigin2 } = this.getProps();
      dragSnapToOrigin2 ? this.pauseAnimation() : this.stopAnimation();
      if (snapToCursor) {
        this.snapToCursor(extractEventInfo(event, "page").point);
      }
    };
    const onStart = (event, info) => {
      const { drag, dragPropagation, onDragStart } = this.getProps();
      if (drag && !dragPropagation) {
        if (this.openGlobalLock)
          this.openGlobalLock();
        this.openGlobalLock = getGlobalLock(drag);
        if (!this.openGlobalLock)
          return;
      }
      this.isDragging = true;
      this.currentDirection = null;
      this.resolveConstraints();
      if (this.visualElement.projection) {
        this.visualElement.projection.isAnimationBlocked = true;
        this.visualElement.projection.target = void 0;
      }
      eachAxis$1((axis) => {
        let current = this.getAxisMotionValue(axis).get() || 0;
        if (motionDom.percent.test(current)) {
          const { projection } = this.visualElement;
          if (projection && projection.layout) {
            const measuredAxis = projection.layout.layoutBox[axis];
            if (measuredAxis) {
              const length = calcLength$1(measuredAxis);
              current = length * (parseFloat(current) / 100);
            }
          }
        }
        this.originPoint[axis] = current;
      });
      if (onDragStart) {
        motionDom.frame.postRender(() => onDragStart(event, info));
      }
      addValueToWillChange(this.visualElement, "transform");
      const state = this.visualElement.state;
      state.setActive("whileDrag", true);
    };
    const onMove = (event, info) => {
      const {
        dragPropagation,
        dragDirectionLock,
        onDirectionLock,
        onDrag
      } = this.getProps();
      if (!dragPropagation && !this.openGlobalLock)
        return;
      const { offset } = info;
      if (dragDirectionLock && this.currentDirection === null) {
        this.currentDirection = getCurrentDirection(offset);
        if (this.currentDirection !== null) {
          onDirectionLock && onDirectionLock(this.currentDirection);
        }
        return;
      }
      this.updateAxis("x", info.point, offset);
      this.updateAxis("y", info.point, offset);
      this.visualElement.render();
      onDrag && onDrag(event, info);
    };
    const onSessionEnd = (event, info) => this.stop(event, info);
    const resumeAnimation = () => eachAxis$1(
      (axis) => {
        var _a;
        return this.getAnimationState(axis) === "paused" && ((_a = this.getAxisMotionValue(axis).animation) == null ? void 0 : _a.play());
      }
    );
    const { dragSnapToOrigin } = this.getProps();
    this.panSession = new PanSession(
      originEvent,
      {
        onSessionStart,
        onStart,
        onMove,
        onSessionEnd,
        resumeAnimation
      },
      {
        transformPagePoint: this.visualElement.getTransformPagePoint(),
        dragSnapToOrigin,
        contextWindow: getContextWindow(this.visualElement)
      }
    );
  }
  stop(event, info) {
    const isDragging = this.isDragging;
    this.cancel();
    if (!isDragging)
      return;
    const { velocity } = info;
    this.startAnimation(velocity);
    const { onDragEnd } = this.getProps();
    if (onDragEnd) {
      motionDom.frame.postRender(() => onDragEnd(event, info));
    }
  }
  cancel() {
    this.isDragging = false;
    const { projection, animationState } = this.visualElement;
    if (projection) {
      projection.isAnimationBlocked = false;
    }
    this.panSession && this.panSession.end();
    this.panSession = void 0;
    const { dragPropagation } = this.getProps();
    if (!dragPropagation && this.openGlobalLock) {
      this.openGlobalLock();
      this.openGlobalLock = null;
    }
    const state = this.visualElement.state;
    state.setActive("whileDrag", false);
  }
  updateAxis(axis, _point, offset) {
    const { drag } = this.getProps();
    if (!offset || !shouldDrag(axis, drag, this.currentDirection))
      return;
    const axisValue = this.getAxisMotionValue(axis);
    let next = this.originPoint[axis] + offset[axis];
    if (this.constraints && this.constraints[axis]) {
      next = applyConstraints(
        next,
        this.constraints[axis],
        this.elastic[axis]
      );
    }
    axisValue.set(next);
  }
  resolveConstraints() {
    var _a;
    const { dragConstraints, dragElastic } = this.getProps();
    const layout = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(false) : (_a = this.visualElement.projection) == null ? void 0 : _a.layout;
    const prevConstraints = this.constraints;
    if (dragConstraints && isHTMLElement(dragConstraints)) {
      if (!this.constraints) {
        this.constraints = this.resolveRefConstraints();
      }
    } else {
      if (dragConstraints && layout) {
        this.constraints = calcRelativeConstraints(
          layout.layoutBox,
          dragConstraints
        );
      } else {
        this.constraints = false;
      }
    }
    this.elastic = resolveDragElastic(dragElastic);
    if (prevConstraints !== this.constraints && layout && this.constraints && !this.hasMutatedConstraints) {
      eachAxis$1((axis) => {
        if (this.constraints !== false && this.getAxisMotionValue(axis)) {
          this.constraints[axis] = rebaseAxisConstraints(
            layout.layoutBox[axis],
            this.constraints[axis]
          );
        }
      });
    }
  }
  resolveRefConstraints() {
    const { dragConstraints: constraints, onMeasureDragConstraints } = this.getProps();
    if (!constraints || !isHTMLElement(constraints))
      return false;
    const constraintsElement = constraints;
    heyListen.invariant(
      constraintsElement !== null,
      "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop."
    );
    const { projection } = this.visualElement;
    if (!projection || !projection.layout)
      return false;
    const constraintsBox = measurePageBox(
      constraintsElement,
      projection.root,
      this.visualElement.getTransformPagePoint()
    );
    let measuredConstraints = calcViewportConstraints(
      projection.layout.layoutBox,
      constraintsBox
    );
    if (onMeasureDragConstraints) {
      const userConstraints = onMeasureDragConstraints(
        convertBoxToBoundingBox(measuredConstraints)
      );
      this.hasMutatedConstraints = !!userConstraints;
      if (userConstraints) {
        measuredConstraints = convertBoundingBoxToBox(userConstraints);
      }
    }
    return measuredConstraints;
  }
  startAnimation(velocity) {
    const {
      drag,
      dragMomentum,
      dragElastic,
      dragTransition,
      dragSnapToOrigin,
      onDragTransitionEnd
    } = this.getProps();
    const constraints = this.constraints || {};
    const momentumAnimations = eachAxis$1((axis) => {
      if (!shouldDrag(axis, drag, this.currentDirection)) {
        return;
      }
      let transition = constraints && constraints[axis] || {};
      if (dragSnapToOrigin)
        transition = { min: 0, max: 0 };
      const bounceStiffness = dragElastic ? 200 : 1e6;
      const bounceDamping = dragElastic ? 40 : 1e7;
      const inertia = {
        type: "inertia",
        velocity: dragMomentum ? velocity[axis] : 0,
        bounceStiffness,
        bounceDamping,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...dragTransition,
        ...transition
      };
      return this.startAxisValueAnimation(axis, inertia);
    });
    return Promise.all(momentumAnimations).then(onDragTransitionEnd);
  }
  startAxisValueAnimation(axis, transition) {
    const axisValue = this.getAxisMotionValue(axis);
    addValueToWillChange(this.visualElement, axis);
    return axisValue.start(
      animateMotionValue(
        axis,
        axisValue,
        0,
        transition,
        this.visualElement,
        false
      )
    );
  }
  stopAnimation() {
    if (!isPresent(this.visualElement))
      return;
    eachAxis$1((axis) => this.getAxisMotionValue(axis).stop());
  }
  pauseAnimation() {
    eachAxis$1((axis) => {
      var _a;
      return (_a = this.getAxisMotionValue(axis).animation) == null ? void 0 : _a.pause();
    });
  }
  getAnimationState(axis) {
    var _a;
    return (_a = this.getAxisMotionValue(axis).animation) == null ? void 0 : _a.state;
  }
  /**
   * Drag works differently depending on which props are provided.
   *
   * - If _dragX and _dragY are provided, we output the gesture delta directly to those motion values.
   * - Otherwise, we apply the delta to the x/y motion values.
   */
  getAxisMotionValue(axis) {
    const dragKey = `_drag${axis.toUpperCase()}`;
    const props = this.visualElement.getProps();
    const externalMotionValue = props[dragKey];
    return externalMotionValue || this.visualElement.getValue(
      axis,
      (props.initial ? props.initial[axis] : void 0) || 0
    );
  }
  snapToCursor(point2) {
    eachAxis$1((axis) => {
      const { drag } = this.getProps();
      if (!shouldDrag(axis, drag, this.currentDirection))
        return;
      const { projection } = this.visualElement;
      const axisValue = this.getAxisMotionValue(axis);
      if (projection && projection.layout) {
        const { min, max } = projection.layout.layoutBox[axis];
        axisValue.set(point2[axis] - motionDom.mixNumber(min, max, 0.5));
      }
    });
  }
  /**
   * When the viewport resizes we want to check if the measured constraints
   * have changed and, if so, reposition the element within those new constraints
   * relative to where it was before the resize.
   */
  scalePositionWithinConstraints() {
    if (!this.visualElement.current)
      return;
    const { drag, dragConstraints } = this.getProps();
    const { projection } = this.visualElement;
    if (!isHTMLElement(dragConstraints) || !projection || !this.constraints)
      return;
    this.stopAnimation();
    const boxProgress = { x: 0, y: 0 };
    eachAxis$1((axis) => {
      const axisValue = this.getAxisMotionValue(axis);
      if (axisValue && this.constraints !== false) {
        const latest = axisValue.get();
        boxProgress[axis] = calcOrigin(
          { min: latest, max: latest },
          this.constraints[axis]
        );
      }
    });
    const { transformTemplate } = this.visualElement.getProps();
    this.visualElement.current.style.transform = transformTemplate ? transformTemplate({}, "") : "none";
    projection.root && projection.root.updateScroll();
    projection.updateLayout();
    this.resolveConstraints();
    eachAxis$1((axis) => {
      if (!shouldDrag(axis, drag, null))
        return;
      const axisValue = this.getAxisMotionValue(axis);
      const { min, max } = this.constraints[axis];
      axisValue.set(motionDom.mixNumber(min, max, boxProgress[axis]));
    });
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    elementDragControls.set(this.visualElement, this);
    const element = this.visualElement.current;
    const stopPointerListener = addPointerEvent(
      element,
      "pointerdown",
      (event) => {
        const { drag, dragListener = true } = this.getProps();
        drag && dragListener && this.start(event);
      }
    );
    const measureDragConstraints = () => {
      const { dragConstraints } = this.getProps();
      if (isHTMLElement(dragConstraints)) {
        this.constraints = this.resolveRefConstraints();
      }
    };
    const { projection } = this.visualElement;
    const stopMeasureLayoutListener = projection.addEventListener(
      "measure",
      measureDragConstraints
    );
    if (projection && !projection.layout) {
      projection.root && projection.root.updateScroll();
      projection.updateLayout();
    }
    motionDom.frame.read(measureDragConstraints);
    const stopResizeListener = addDomEvent$1(window, "resize", () => this.scalePositionWithinConstraints());
    const stopLayoutUpdateListener = projection.addEventListener(
      "didUpdate",
      ({ delta, hasLayoutChanged }) => {
        if (this.isDragging && hasLayoutChanged) {
          eachAxis$1((axis) => {
            const motionValue = this.getAxisMotionValue(axis);
            if (!motionValue)
              return;
            this.originPoint[axis] += delta[axis].translate;
            motionValue.set(
              motionValue.get() + delta[axis].translate
            );
          });
          this.visualElement.render();
        }
      }
    );
    return () => {
      stopResizeListener();
      stopPointerListener();
      stopMeasureLayoutListener();
      stopLayoutUpdateListener && stopLayoutUpdateListener();
    };
  }
  getProps() {
    const props = this.visualElement.getProps();
    const {
      drag = false,
      dragDirectionLock = false,
      dragPropagation = false,
      dragConstraints = false,
      dragElastic = defaultElastic,
      dragMomentum = true
    } = props;
    return {
      ...props,
      drag,
      dragDirectionLock,
      dragPropagation,
      dragConstraints,
      dragElastic,
      dragMomentum
    };
  }
}
function shouldDrag(direction, drag, currentDirection) {
  return (drag === true || drag === direction) && (currentDirection === null || currentDirection === direction);
}
function getCurrentDirection(offset, lockThreshold = 10) {
  let direction = null;
  if (Math.abs(offset.y) > lockThreshold) {
    direction = "y";
  } else if (Math.abs(offset.x) > lockThreshold) {
    direction = "x";
  }
  return direction;
}
class DragGesture extends Feature {
  constructor(state) {
    super(state);
    this.removeGroupControls = noop;
    this.removeListeners = noop;
    this.controls = new VisualElementDragControls(state.visualElement);
  }
  mount() {
    const { dragControls } = this.state.options;
    if (dragControls) {
      this.removeGroupControls = dragControls.subscribe(this.controls);
    }
    this.removeListeners = this.controls.addListeners() || noop;
  }
  unmount() {
    this.removeGroupControls();
    this.removeListeners();
  }
}
const defaultScaleCorrector = {
  borderRadius: {
    ...correctBorderRadius,
    applyTo: [
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius"
    ]
  },
  borderTopLeftRadius: correctBorderRadius,
  borderTopRightRadius: correctBorderRadius,
  borderBottomLeftRadius: correctBorderRadius,
  borderBottomRightRadius: correctBorderRadius,
  boxShadow: correctBoxShadow
};
const globalProjectionState = {
  /**
   * Global flag as to whether the tree has animated since the last time
   * we resized the window
   */
  hasAnimatedSinceResize: true,
  /**
   * We set this to true once, on the first update. Any nodes added to the tree beyond that
   * update will be given a `data-projection-id` attribute.
   */
  hasEverUpdated: false
};
let hasLayoutUpdate = false;
class LayoutFeature extends Feature {
  constructor(state) {
    super(state);
    addScaleCorrector(defaultScaleCorrector);
    state.getSnapshot = this.getSnapshot.bind(this);
    state.didUpdate = this.didUpdate.bind(this);
  }
  beforeUpdate(newOptions) {
    this.getSnapshot(newOptions, void 0);
  }
  update() {
    this.didUpdate();
  }
  didUpdate() {
    var _a, _b;
    if (!hasLayoutUpdate)
      return;
    if (this.state.options.layout || this.state.options.layoutId || this.state.options.drag) {
      hasLayoutUpdate = false;
      (_b = (_a = this.state.visualElement.projection) == null ? void 0 : _a.root) == null ? void 0 : _b.didUpdate();
    }
  }
  mount() {
    var _a;
    const options = this.state.options;
    const layoutGroup = this.state.options.layoutGroup;
    if (options.layout || options.layoutId) {
      const projection = this.state.visualElement.projection;
      if (projection) {
        projection.promote();
        const stack = projection.getStack();
        if ((stack == null ? void 0 : stack.prevLead) && !stack.prevLead.snapshot) {
          stack.prevLead.willUpdate();
          hasLayoutUpdate = true;
        }
        (_a = layoutGroup == null ? void 0 : layoutGroup.group) == null ? void 0 : _a.add(projection);
      }
      globalProjectionState.hasEverUpdated = true;
    }
    this.didUpdate();
  }
  beforeUnmount() {
    this.getSnapshot(this.state.options, false);
  }
  unmount() {
    const layoutGroup = this.state.options.layoutGroup;
    const projection = this.state.visualElement.projection;
    if (projection) {
      if ((layoutGroup == null ? void 0 : layoutGroup.group) && (this.state.options.layout || this.state.options.layoutId)) {
        layoutGroup.group.remove(projection);
      }
      if (this.state.options.layoutId) {
        hasLayoutUpdate = true;
      }
      this.didUpdate();
    }
  }
  getSnapshot(newOptions, isPresent2) {
    const projection = this.state.visualElement.projection;
    const { drag, layoutDependency, layout, layoutId } = newOptions;
    if (!projection || !layout && !layoutId && !drag) {
      return;
    }
    hasLayoutUpdate = true;
    const prevProps = this.state.options;
    if (drag || prevProps.layoutDependency !== layoutDependency || layoutDependency === void 0 || core.isDef(isPresent2) && projection.isPresent !== isPresent2) {
      projection.willUpdate();
    }
    if (core.isDef(isPresent2) && isPresent2 !== projection.isPresent) {
      projection.isPresent = isPresent2;
      if (isPresent2) {
        projection.promote();
      } else {
        projection.relegate();
      }
    }
  }
}
function asyncHandler(handler) {
  return (event, info) => {
    if (handler) {
      motionDom.frame.postRender(() => handler(event, info));
    }
  };
}
class PanGesture extends Feature {
  constructor() {
    super(...arguments);
    this.removePointerDownListener = noop;
  }
  onPointerDown(pointerDownEvent) {
    this.session = new PanSession(
      pointerDownEvent,
      this.createPanHandlers(),
      {
        transformPagePoint: this.state.visualElement.getTransformPagePoint(),
        contextWindow: getContextWindow(this.state.visualElement)
      }
    );
  }
  createPanHandlers() {
    return {
      onSessionStart: asyncHandler((_, info) => {
        const { onPanSessionStart } = this.state.options;
        onPanSessionStart && onPanSessionStart(_, info);
      }),
      onStart: asyncHandler((_, info) => {
        const { onPanStart } = this.state.options;
        onPanStart && onPanStart(_, info);
      }),
      onMove: (event, info) => {
        const { onPan } = this.state.options;
        onPan && onPan(event, info);
      },
      onEnd: (event, info) => {
        const { onPanEnd } = this.state.options;
        delete this.session;
        if (onPanEnd) {
          motionDom.frame.postRender(() => onPanEnd(event, info));
        }
      }
    };
  }
  mount() {
    this.removePointerDownListener = addPointerEvent(
      this.state.element,
      "pointerdown",
      this.onPointerDown.bind(this)
    );
  }
  update() {
  }
  unmount() {
    this.removePointerDownListener();
    this.session && this.session.end();
  }
}
class FeatureManager {
  constructor(state) {
    this.features = [];
    const { features = [], lazyMotionContext } = state.options;
    const allFeatures = features.concat(lazyMotionContext.features.value);
    this.features = allFeatures.map((Feature2) => new Feature2(state));
    const featureInstances = this.features;
    vue.watch(lazyMotionContext.features, (features2) => {
      features2.forEach((feature) => {
        if (!allFeatures.includes(feature)) {
          allFeatures.push(feature);
          const featureInstance = new feature(state);
          featureInstances.push(featureInstance);
          if (state.isMounted()) {
            featureInstance.beforeMount();
            featureInstance.mount();
          }
        }
      });
    }, {
      flush: "pre"
    });
  }
  mount() {
    this.features.forEach((feature) => feature.mount());
  }
  beforeMount() {
    this.features.forEach((feature) => {
      var _a;
      return (_a = feature.beforeMount) == null ? void 0 : _a.call(feature);
    });
  }
  unmount(unMountChildren = false) {
    this.features.forEach((feature) => feature.unmount(unMountChildren));
  }
  update() {
    this.features.forEach((feature) => {
      var _a;
      return (_a = feature.update) == null ? void 0 : _a.call(feature);
    });
  }
  beforeUpdate(options) {
    this.features.forEach((feature) => {
      var _a;
      return (_a = feature.beforeUpdate) == null ? void 0 : _a.call(feature, options);
    });
  }
  beforeUnmount() {
    this.features.forEach((feature) => feature.beforeUnmount());
  }
}
function isAnimationControls(v) {
  return v !== null && typeof v === "object" && typeof v.start === "function";
}
function motionEvent(name, target, isExit) {
  return new CustomEvent(name, { detail: { target, isExit } });
}
const rotation = {
  syntax: "<angle>",
  initialValue: "0deg",
  toDefaultUnit: (v) => `${v}deg`
};
const baseTransformProperties = {
  translate: {
    syntax: "<length-percentage>",
    initialValue: "0px",
    toDefaultUnit: (v) => `${v}px`
  },
  rotate: rotation,
  scale: {
    syntax: "<number>",
    initialValue: 1,
    toDefaultUnit: noopReturn
  },
  skew: rotation
};
const order = ["translate", "scale", "rotate", "skew"];
const axes = ["", "X", "Y", "Z"];
const transformDefinitions = /* @__PURE__ */ new Map();
const transforms = ["transformPerspective", "x", "y", "z", "translateX", "translateY", "translateZ", "scale", "scaleX", "scaleY", "rotate", "rotateX", "rotateY", "rotateZ", "skew", "skewX", "skewY"];
order.forEach((name) => {
  axes.forEach((axis) => {
    transforms.push(name + axis);
    transformDefinitions.set(
      name + axis,
      baseTransformProperties[name]
    );
  });
});
const transformLookup = new Set(transforms);
const isTransform = (name) => transformLookup.has(name);
const transformAlias = {
  x: "translateX",
  y: "translateY",
  z: "translateZ"
};
function compareTransformOrder([a], [b]) {
  return transforms.indexOf(a) - transforms.indexOf(b);
}
function transformListToString(template, [name, value]) {
  return `${template} ${name}(${value})`;
}
function buildTransformTemplate(transforms2) {
  return transforms2.sort(compareTransformOrder).reduce(transformListToString, "").trim();
}
const transformResetValue = {
  translate: [0, 0],
  rotate: 0,
  scale: 1,
  skew: 0,
  x: 0,
  y: 0,
  z: 0
};
const style = {
  get: (element, name) => {
    let value = isCssVar(name) ? element.style.getPropertyValue(name) : getComputedStyle(element)[name];
    if (!value && value !== "0") {
      const definition = transformDefinitions.get(name);
      if (definition)
        value = definition.initialValue;
    }
    return value;
  },
  set: (element, name, value) => {
    if (isCssVar(name)) {
      element.style.setProperty(name, value);
    } else {
      element.style[name] = value;
    }
  }
};
function createStyles(keyframes) {
  var _a;
  const initialKeyframes = {};
  const transforms2 = [];
  for (let key in keyframes) {
    let value = keyframes[key];
    value = motionDom.isMotionValue(value) ? value.get() : value;
    if (isTransform(key)) {
      if (key in transformAlias) {
        key = transformAlias[key];
      }
    }
    let initialKeyframe = Array.isArray(value) ? value[0] : value;
    const definition = transformDefinitions.get(key);
    if (definition) {
      initialKeyframe = isNumber(value) ? (_a = definition.toDefaultUnit) == null ? void 0 : _a.call(definition, value) : value;
      transforms2.push([key, initialKeyframe]);
    } else {
      initialKeyframes[key] = initialKeyframe;
    }
  }
  if (transforms2.length) {
    initialKeyframes.transform = buildTransformTemplate(transforms2);
  }
  if (Object.keys(initialKeyframes).length === 0) {
    return null;
  }
  return initialKeyframes;
}
const SVG_STYLE_TO_ATTRIBUTES = {
  "fill": true,
  "stroke": true,
  "opacity": true,
  "stroke-width": true,
  "fill-opacity": true,
  "stroke-opacity": true,
  "stroke-linecap": true,
  "stroke-linejoin": true,
  "stroke-dasharray": true,
  "stroke-dashoffset": true,
  "cx": true,
  "cy": true,
  "r": true,
  "d": true,
  "x1": true,
  "y1": true,
  "x2": true,
  "y2": true,
  "points": true,
  "path-length": true,
  "viewBox": true,
  "width": true,
  "height": true,
  "preserve-aspect-ratio": true,
  "clip-path": true,
  "filter": true,
  "mask": true,
  "stop-color": true,
  "stop-opacity": true,
  "gradient-transform": true,
  "gradient-units": true,
  "spread-method": true,
  "marker-end": true,
  "marker-mid": true,
  "marker-start": true,
  "text-anchor": true,
  "dominant-baseline": true,
  "font-family": true,
  "font-size": true,
  "font-weight": true,
  "letter-spacing": true,
  "vector-effect": true
};
function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
function buildSVGPath(attrs, length, spacing = 1, offset = 0) {
  attrs.pathLength = 1;
  delete attrs["path-length"];
  attrs["stroke-dashoffset"] = motionDom.px.transform(-offset);
  const pathLength = motionDom.px.transform(length);
  const pathSpacing = motionDom.px.transform(spacing);
  attrs["stroke-dasharray"] = `${pathLength} ${pathSpacing}`;
}
function convertSvgStyleToAttributes(keyframes) {
  const attrs = {};
  const styleProps = {};
  for (const key in keyframes) {
    const kebabKey = camelToKebab(key);
    if (kebabKey in SVG_STYLE_TO_ATTRIBUTES) {
      const value = keyframes[key];
      attrs[kebabKey] = motionDom.isMotionValue(value) ? value.get() : value;
    } else {
      styleProps[key] = keyframes[key];
    }
  }
  if (attrs["path-length"] !== void 0) {
    buildSVGPath(attrs, attrs["path-length"], attrs["path-spacing"], attrs["path-offset"]);
  }
  return {
    attrs,
    style: styleProps
  };
}
function createVisualElement(Component, options) {
  return isSVGElement(Component) ? new SVGVisualElement(options) : new HTMLVisualElement(options);
}
function calcChildStagger(children, child, delayChildren, staggerChildren = 0, staggerDirection = 1) {
  const sortedChildren = Array.from(children);
  const index = sortedChildren.indexOf(child);
  const numChildren = children.size;
  const maxStaggerDuration = (numChildren - 1) * staggerChildren;
  const delayIsFunction = typeof delayChildren === "function";
  if (index === sortedChildren.length - 1) {
    child.parent.enteringChildren = void 0;
  }
  return delayIsFunction ? delayChildren(index, numChildren) : staggerDirection === 1 ? index * staggerChildren : maxStaggerDuration - index * staggerChildren;
}
const STATE_TYPES = ["initial", "animate", "whileInView", "whileHover", "whilePress", "whileDrag", "whileFocus", "exit"];
class AnimationFeature extends Feature {
  constructor(state) {
    var _a, _b;
    super(state);
    this.animateUpdates = ({
      controlActiveState,
      directAnimate,
      directTransition,
      controlDelay = 0,
      isExit
    } = {}) => {
      const { reducedMotion } = this.state.options.motionConfig;
      this.state.visualElement.shouldReduceMotion = reducedMotion === "always" || reducedMotion === "user" && !!prefersReducedMotion.current;
      const prevTarget = this.state.target;
      this.state.target = { ...this.state.baseTarget };
      let animationOptions = {};
      animationOptions = this.resolveStateAnimation({
        controlActiveState,
        directAnimate,
        directTransition
      });
      this.state.finalTransition = animationOptions;
      const factories = this.createAnimationFactories(prevTarget, animationOptions, controlDelay);
      const { getChildAnimations } = this.setupChildAnimations(animationOptions, this.state.activeStates);
      return this.executeAnimations({
        factories,
        getChildAnimations,
        transition: animationOptions,
        controlActiveState,
        isExit
      });
    };
    this.state.visualElement = createVisualElement(this.state.options.as, {
      presenceContext: null,
      parent: (_a = this.state.parent) == null ? void 0 : _a.visualElement,
      props: {
        ...this.state.options,
        whileTap: this.state.options.whilePress
      },
      visualState: {
        renderState: {
          transform: {},
          transformOrigin: {},
          style: {},
          vars: {},
          attrs: {}
        },
        latestValues: {
          ...this.state.baseTarget
        }
      },
      reducedMotionConfig: this.state.options.motionConfig.reducedMotion
    });
    (_b = this.state.visualElement.parent) == null ? void 0 : _b.addChild(this.state.visualElement);
    this.state.animateUpdates = this.animateUpdates;
    if (this.state.isMounted())
      this.state.startAnimation();
  }
  updateAnimationControlsSubscription() {
    const { animate: animate2 } = this.state.options;
    if (isAnimationControls(animate2)) {
      this.unmountControls = animate2.subscribe(this.state);
    }
  }
  executeAnimations({
    factories,
    getChildAnimations,
    transition,
    controlActiveState,
    isExit = false
  }) {
    const getAnimation = () => Promise.all(factories.map((factory) => factory()).filter(Boolean));
    const animationTarget2 = { ...this.state.target };
    const element = this.state.element;
    const finishAnimation2 = (animationPromise) => {
      var _a, _b;
      if (isExit) {
        this.state.isExiting = true;
      }
      element.dispatchEvent(motionEvent("motionstart", animationTarget2));
      (_b = (_a = this.state.options).onAnimationStart) == null ? void 0 : _b.call(_a, animationTarget2);
      animationPromise.then(() => {
        var _a2, _b2;
        if (isExit) {
          this.state.isExiting = false;
        }
        element.dispatchEvent(motionEvent("motioncomplete", animationTarget2, isExit));
        (_b2 = (_a2 = this.state.options).onAnimationComplete) == null ? void 0 : _b2.call(_a2, animationTarget2);
      }).catch(noop);
    };
    const getAnimationPromise = () => {
      const animationPromise = (transition == null ? void 0 : transition.when) ? (transition.when === "beforeChildren" ? getAnimation() : getChildAnimations()).then(() => transition.when === "beforeChildren" ? getChildAnimations() : getAnimation()) : Promise.all([getAnimation(), getChildAnimations()]);
      finishAnimation2(animationPromise);
      return animationPromise;
    };
    return controlActiveState ? getAnimationPromise : getAnimationPromise();
  }
  /**
   * Setup child animations
   */
  setupChildAnimations(transition, controlActiveState) {
    var _a;
    const visualElement = this.state.visualElement;
    if (!((_a = visualElement.variantChildren) == null ? void 0 : _a.size) || !controlActiveState)
      return { getChildAnimations: () => Promise.resolve() };
    const { staggerChildren = 0, staggerDirection = 1, delayChildren = 0 } = transition || {};
    const numChildren = visualElement.variantChildren.size;
    const maxStaggerDuration = (numChildren - 1) * staggerChildren;
    const delayIsFunction = typeof delayChildren === "function";
    const generateStaggerDuration = delayIsFunction ? (i) => delayChildren(i, numChildren) : staggerDirection === 1 ? (i = 0) => i * staggerChildren : (i = 0) => maxStaggerDuration - i * staggerChildren;
    const childAnimations = Array.from(visualElement.variantChildren).map((child, index) => {
      return child.state.animateUpdates({
        controlActiveState,
        controlDelay: (delayIsFunction ? 0 : delayChildren) + generateStaggerDuration(index)
      });
    });
    return {
      getChildAnimations: () => Promise.all(childAnimations.map((animation) => {
        return animation();
      }))
    };
  }
  createAnimationFactories(prevTarget, animationOptions, controlDelay) {
    const factories = [];
    Object.keys(this.state.target).forEach((key) => {
      var _a;
      if (!hasChanged(prevTarget[key], this.state.target[key]))
        return;
      (_a = this.state.baseTarget)[key] ?? (_a[key] = style.get(this.state.element, key));
      const keyValue = this.state.target[key] === "none" && core.isDef(transformResetValue[key]) ? transformResetValue[key] : this.state.target[key];
      factories.push(() => {
        var _a2;
        return animate(
          this.state.element,
          { [key]: keyValue },
          {
            ...(animationOptions == null ? void 0 : animationOptions[key]) || animationOptions,
            delay: (((_a2 = animationOptions == null ? void 0 : animationOptions[key]) == null ? void 0 : _a2.delay) || (animationOptions == null ? void 0 : animationOptions.delay) || 0) + controlDelay
          }
        );
      });
    });
    return factories;
  }
  resolveStateAnimation({
    controlActiveState,
    directAnimate,
    directTransition
  }) {
    let variantTransition = this.state.options.transition;
    let variant = {};
    const { variants, custom, transition, animatePresenceContext } = this.state.options;
    const customValue = custom ?? (animatePresenceContext == null ? void 0 : animatePresenceContext.custom);
    this.state.activeStates = { ...this.state.activeStates, ...controlActiveState };
    STATE_TYPES.forEach((name) => {
      if (!this.state.activeStates[name] || isAnimationControls(this.state.options[name]))
        return;
      const definition = this.state.options[name];
      let resolvedVariant = core.isDef(definition) ? resolveVariant(definition, variants, customValue) : void 0;
      if (this.state.visualElement.isVariantNode) {
        const controlVariant = resolveVariant(this.state.context[name], variants, customValue);
        resolvedVariant = controlVariant ? Object.assign(controlVariant || {}, resolvedVariant) : Object.assign(variant, resolvedVariant);
      }
      if (!resolvedVariant)
        return;
      if (name !== "initial")
        variantTransition = resolvedVariant.transition || this.state.options.transition || {};
      variant = Object.assign(variant, resolvedVariant);
    });
    if (directAnimate) {
      variant = resolveVariant(directAnimate, variants, customValue);
      variantTransition = variant.transition || directTransition || transition;
    }
    Object.entries(variant).forEach(([key, value]) => {
      if (key === "transition")
        return;
      this.state.target[key] = value;
    });
    return variantTransition;
  }
  /**
   * Subscribe any provided AnimationControls to the component's VisualElement
   */
  mount() {
    var _a, _b;
    const { element } = this.state;
    mountedStates.set(element, this.state);
    if (!visualElementStore.get(element)) {
      this.state.visualElement.mount(element);
      visualElementStore.set(element, this.state.visualElement);
    }
    this.state.visualElement.state = this.state;
    this.updateAnimationControlsSubscription();
    const visualElement = this.state.visualElement;
    const parentVisualElement = visualElement.parent;
    visualElement.enteringChildren = void 0;
    if (((_a = this.state.parent) == null ? void 0 : _a.isMounted()) && !visualElement.isControllingVariants && ((_b = parentVisualElement == null ? void 0 : parentVisualElement.enteringChildren) == null ? void 0 : _b.has(visualElement))) {
      const { delayChildren } = this.state.parent.finalTransition || {};
      this.animateUpdates({
        controlActiveState: this.state.parent.activeStates,
        controlDelay: calcChildStagger(parentVisualElement.enteringChildren, visualElement, delayChildren)
      })();
    }
  }
  update() {
    const { animate: animate2 } = this.state.options;
    const { animate: prevAnimate } = this.state.visualElement.prevProps || {};
    if (animate2 !== prevAnimate) {
      this.updateAnimationControlsSubscription();
    }
  }
  unmount() {
    var _a;
    (_a = this.unmountControls) == null ? void 0 : _a.call(this);
  }
}
class FocusGesture extends Feature {
  constructor() {
    super(...arguments);
    this.isActive = false;
  }
  onFocus() {
    let isFocusVisible = false;
    try {
      isFocusVisible = this.state.element.matches(":focus-visible");
    } catch (e) {
      isFocusVisible = true;
    }
    if (!isFocusVisible)
      return;
    this.state.setActive("whileFocus", true);
    this.isActive = true;
  }
  onBlur() {
    if (!this.isActive)
      return;
    this.state.setActive("whileFocus", false);
    this.isActive = false;
  }
  mount() {
    this.unmount = pipe(
      addDomEvent$1(this.state.element, "focus", () => this.onFocus()),
      addDomEvent$1(this.state.element, "blur", () => this.onBlur())
    );
  }
}
const compareByDepth = (a, b) => a.depth - b.depth;
class FlatTree {
  constructor() {
    this.children = [];
    this.isDirty = false;
  }
  add(child) {
    addUniqueItem(this.children, child);
    this.isDirty = true;
  }
  remove(child) {
    removeItem(this.children, child);
    this.isDirty = true;
  }
  forEach(callback) {
    this.isDirty && this.children.sort(compareByDepth);
    this.isDirty = false;
    this.children.forEach(callback);
  }
}
function resolveMotionValue(value) {
  return motionDom.isMotionValue(value) ? value.get() : value;
}
const borders = ["TopLeft", "TopRight", "BottomLeft", "BottomRight"];
const numBorders = borders.length;
const asNumber = (value) => typeof value === "string" ? parseFloat(value) : value;
const isPx = (value) => typeof value === "number" || motionDom.px.test(value);
function mixValues(target, follow, lead, progress2, shouldCrossfadeOpacity, isOnlyMember) {
  if (shouldCrossfadeOpacity) {
    target.opacity = motionDom.mixNumber(0, lead.opacity ?? 1, easeCrossfadeIn(progress2));
    target.opacityExit = motionDom.mixNumber(follow.opacity ?? 1, 0, easeCrossfadeOut(progress2));
  } else if (isOnlyMember) {
    target.opacity = motionDom.mixNumber(follow.opacity ?? 1, lead.opacity ?? 1, progress2);
  }
  for (let i = 0; i < numBorders; i++) {
    const borderLabel = `border${borders[i]}Radius`;
    let followRadius = getRadius(follow, borderLabel);
    let leadRadius = getRadius(lead, borderLabel);
    if (followRadius === void 0 && leadRadius === void 0)
      continue;
    followRadius || (followRadius = 0);
    leadRadius || (leadRadius = 0);
    const canMix = followRadius === 0 || leadRadius === 0 || isPx(followRadius) === isPx(leadRadius);
    if (canMix) {
      target[borderLabel] = Math.max(motionDom.mixNumber(asNumber(followRadius), asNumber(leadRadius), progress2), 0);
      if (motionDom.percent.test(leadRadius) || motionDom.percent.test(followRadius)) {
        target[borderLabel] += "%";
      }
    } else {
      target[borderLabel] = leadRadius;
    }
  }
  if (follow.rotate || lead.rotate) {
    target.rotate = motionDom.mixNumber(follow.rotate || 0, lead.rotate || 0, progress2);
  }
}
function getRadius(values, radiusName) {
  return values[radiusName] !== void 0 ? values[radiusName] : values.borderRadius;
}
const easeCrossfadeIn = /* @__PURE__ */ compress(0, 0.5, circOut);
const easeCrossfadeOut = /* @__PURE__ */ compress(0.5, 0.95, noop);
function compress(min, max, easing) {
  return (p) => {
    if (p < min)
      return 0;
    if (p > max)
      return 1;
    return easing(/* @__PURE__ */ progress(min, max, p));
  };
}
function copyAxisInto(axis, originAxis) {
  axis.min = originAxis.min;
  axis.max = originAxis.max;
}
function copyBoxInto(box, originBox) {
  copyAxisInto(box.x, originBox.x);
  copyAxisInto(box.y, originBox.y);
}
function copyAxisDeltaInto(delta, originDelta) {
  delta.translate = originDelta.translate;
  delta.scale = originDelta.scale;
  delta.originPoint = originDelta.originPoint;
  delta.origin = originDelta.origin;
}
const SCALE_PRECISION = 1e-4;
const SCALE_MIN = 1 - SCALE_PRECISION;
const SCALE_MAX = 1 + SCALE_PRECISION;
const TRANSLATE_PRECISION = 0.01;
const TRANSLATE_MIN = 0 - TRANSLATE_PRECISION;
const TRANSLATE_MAX = 0 + TRANSLATE_PRECISION;
function calcLength(axis) {
  return axis.max - axis.min;
}
function isNear(value, target, maxDistance) {
  return Math.abs(value - target) <= maxDistance;
}
function calcAxisDelta(delta, source, target, origin = 0.5) {
  delta.origin = origin;
  delta.originPoint = motionDom.mixNumber(source.min, source.max, delta.origin);
  delta.scale = calcLength(target) / calcLength(source);
  delta.translate = motionDom.mixNumber(target.min, target.max, delta.origin) - delta.originPoint;
  if (delta.scale >= SCALE_MIN && delta.scale <= SCALE_MAX || isNaN(delta.scale)) {
    delta.scale = 1;
  }
  if (delta.translate >= TRANSLATE_MIN && delta.translate <= TRANSLATE_MAX || isNaN(delta.translate)) {
    delta.translate = 0;
  }
}
function calcBoxDelta(delta, source, target, origin) {
  calcAxisDelta(delta.x, source.x, target.x, origin ? origin.originX : void 0);
  calcAxisDelta(delta.y, source.y, target.y, origin ? origin.originY : void 0);
}
function calcRelativeAxis(target, relative, parent) {
  target.min = parent.min + relative.min;
  target.max = target.min + calcLength(relative);
}
function calcRelativeBox(target, relative, parent) {
  calcRelativeAxis(target.x, relative.x, parent.x);
  calcRelativeAxis(target.y, relative.y, parent.y);
}
function calcRelativeAxisPosition(target, layout, parent) {
  target.min = layout.min - parent.min;
  target.max = target.min + calcLength(layout);
}
function calcRelativePosition(target, layout, parent) {
  calcRelativeAxisPosition(target.x, layout.x, parent.x);
  calcRelativeAxisPosition(target.y, layout.y, parent.y);
}
function removePointDelta(point2, translate, scale, originPoint, boxScale) {
  point2 -= translate;
  point2 = scalePoint(point2, 1 / scale, originPoint);
  if (boxScale !== void 0) {
    point2 = scalePoint(point2, 1 / boxScale, originPoint);
  }
  return point2;
}
function removeAxisDelta(axis, translate = 0, scale = 1, origin = 0.5, boxScale, originAxis = axis, sourceAxis = axis) {
  if (motionDom.percent.test(translate)) {
    translate = parseFloat(translate);
    const relativeProgress = motionDom.mixNumber(sourceAxis.min, sourceAxis.max, translate / 100);
    translate = relativeProgress - sourceAxis.min;
  }
  if (typeof translate !== "number")
    return;
  let originPoint = motionDom.mixNumber(originAxis.min, originAxis.max, origin);
  if (axis === originAxis)
    originPoint -= translate;
  axis.min = removePointDelta(axis.min, translate, scale, originPoint, boxScale);
  axis.max = removePointDelta(axis.max, translate, scale, originPoint, boxScale);
}
function removeAxisTransforms(axis, transforms2, [key, scaleKey, originKey], origin, sourceAxis) {
  removeAxisDelta(axis, transforms2[key], transforms2[scaleKey], transforms2[originKey], transforms2.scale, origin, sourceAxis);
}
const xKeys = ["x", "scaleX", "originX"];
const yKeys = ["y", "scaleY", "originY"];
function removeBoxTransforms(box, transforms2, originBox, sourceBox) {
  removeAxisTransforms(box.x, transforms2, xKeys, originBox ? originBox.x : void 0, sourceBox ? sourceBox.x : void 0);
  removeAxisTransforms(box.y, transforms2, yKeys, originBox ? originBox.y : void 0, sourceBox ? sourceBox.y : void 0);
}
function isAxisDeltaZero(delta) {
  return delta.translate === 0 && delta.scale === 1;
}
function isDeltaZero(delta) {
  return isAxisDeltaZero(delta.x) && isAxisDeltaZero(delta.y);
}
function axisEquals(a, b) {
  return a.min === b.min && a.max === b.max;
}
function boxEquals(a, b) {
  return axisEquals(a.x, b.x) && axisEquals(a.y, b.y);
}
function axisEqualsRounded(a, b) {
  return Math.round(a.min) === Math.round(b.min) && Math.round(a.max) === Math.round(b.max);
}
function boxEqualsRounded(a, b) {
  return axisEqualsRounded(a.x, b.x) && axisEqualsRounded(a.y, b.y);
}
function aspectRatio(box) {
  return calcLength(box.x) / calcLength(box.y);
}
function axisDeltaEquals(a, b) {
  return a.translate === b.translate && a.scale === b.scale && a.originPoint === b.originPoint;
}
class NodeStack {
  constructor() {
    this.members = [];
  }
  add(node) {
    addUniqueItem(this.members, node);
    node.scheduleRender();
  }
  remove(node) {
    removeItem(this.members, node);
    if (node === this.prevLead) {
      this.prevLead = void 0;
    }
    if (node === this.lead) {
      const prevLead = this.members[this.members.length - 1];
      if (prevLead) {
        this.promote(prevLead);
      }
    }
  }
  relegate(node) {
    const indexOfNode = this.members.findIndex((member) => node === member);
    if (indexOfNode === 0)
      return false;
    let prevLead;
    for (let i = indexOfNode; i >= 0; i--) {
      const member = this.members[i];
      if (member.isPresent !== false) {
        prevLead = member;
        break;
      }
    }
    if (prevLead) {
      this.promote(prevLead);
      return true;
    } else {
      return false;
    }
  }
  promote(node, preserveFollowOpacity) {
    const prevLead = this.lead;
    if (node === prevLead)
      return;
    this.prevLead = prevLead;
    this.lead = node;
    node.show();
    if (prevLead) {
      prevLead.instance && prevLead.scheduleRender();
      node.scheduleRender();
      node.resumeFrom = prevLead;
      if (preserveFollowOpacity) {
        node.resumeFrom.preserveOpacity = true;
      }
      if (prevLead.snapshot) {
        node.snapshot = prevLead.snapshot;
        node.snapshot.latestValues = prevLead.animationValues || prevLead.latestValues;
      }
      if (node.root && node.root.isUpdating) {
        node.isLayoutDirty = true;
      }
      const { crossfade } = node.options;
      if (crossfade === false) {
        prevLead.hide();
      }
    }
  }
  exitAnimationComplete() {
    this.members.forEach((node) => {
      const { options, resumingFrom } = node;
      options.onExitComplete && options.onExitComplete();
      if (resumingFrom) {
        resumingFrom.options.onExitComplete && resumingFrom.options.onExitComplete();
      }
    });
  }
  scheduleRender() {
    this.members.forEach((node) => {
      node.instance && node.scheduleRender(false);
    });
  }
  /**
   * Clear any leads that have been removed this render to prevent them from being
   * used in future animations and to prevent memory leaks
   */
  removeLeadSnapshot() {
    if (this.lead && this.lead.snapshot) {
      this.lead.snapshot = void 0;
    }
  }
}
function buildProjectionTransform(delta, treeScale, latestTransform) {
  let transform = "";
  const xTranslate = delta.x.translate / treeScale.x;
  const yTranslate = delta.y.translate / treeScale.y;
  const zTranslate = (latestTransform == null ? void 0 : latestTransform.z) || 0;
  if (xTranslate || yTranslate || zTranslate) {
    transform = `translate3d(${xTranslate}px, ${yTranslate}px, ${zTranslate}px) `;
  }
  if (treeScale.x !== 1 || treeScale.y !== 1) {
    transform += `scale(${1 / treeScale.x}, ${1 / treeScale.y}) `;
  }
  if (latestTransform) {
    const { transformPerspective, rotate, rotateX, rotateY, skewX, skewY } = latestTransform;
    if (transformPerspective)
      transform = `perspective(${transformPerspective}px) ${transform}`;
    if (rotate)
      transform += `rotate(${rotate}deg) `;
    if (rotateX)
      transform += `rotateX(${rotateX}deg) `;
    if (rotateY)
      transform += `rotateY(${rotateY}deg) `;
    if (skewX)
      transform += `skewX(${skewX}deg) `;
    if (skewY)
      transform += `skewY(${skewY}deg) `;
  }
  const elementScaleX = delta.x.scale * treeScale.x;
  const elementScaleY = delta.y.scale * treeScale.y;
  if (elementScaleX !== 1 || elementScaleY !== 1) {
    transform += `scale(${elementScaleX}, ${elementScaleY})`;
  }
  return transform || "none";
}
function eachAxis(callback) {
  return [callback("x"), callback("y")];
}
const metrics = {
  nodes: 0,
  calculatedTargetDeltas: 0,
  calculatedProjections: 0
};
const transformAxes = ["", "X", "Y", "Z"];
const animationTarget = 1e3;
let id$1 = 0;
function resetDistortingTransform(key, visualElement, values, sharedAnimationValues) {
  const { latestValues } = visualElement;
  if (latestValues[key]) {
    values[key] = latestValues[key];
    visualElement.setStaticValue(key, 0);
    if (sharedAnimationValues) {
      sharedAnimationValues[key] = 0;
    }
  }
}
function cancelTreeOptimisedTransformAnimations(projectionNode) {
  projectionNode.hasCheckedOptimisedAppear = true;
  if (projectionNode.root === projectionNode)
    return;
  const { visualElement } = projectionNode.options;
  if (!visualElement)
    return;
  const appearId = getOptimisedAppearId(visualElement);
  if (window.MotionHasOptimisedAnimation(appearId, "transform")) {
    const { layout, layoutId } = projectionNode.options;
    window.MotionCancelOptimisedAnimation(appearId, "transform", motionDom.frame, !(layout || layoutId));
  }
  const { parent } = projectionNode;
  if (parent && !parent.hasCheckedOptimisedAppear) {
    cancelTreeOptimisedTransformAnimations(parent);
  }
}
function createProjectionNode({ attachResizeListener, defaultParent, measureScroll, checkIsScrollRoot, resetTransform }) {
  return class ProjectionNode {
    constructor(latestValues = {}, parent = defaultParent == null ? void 0 : defaultParent()) {
      this.id = id$1++;
      this.animationId = 0;
      this.animationCommitId = 0;
      this.children = /* @__PURE__ */ new Set();
      this.options = {};
      this.isTreeAnimating = false;
      this.isAnimationBlocked = false;
      this.isLayoutDirty = false;
      this.isProjectionDirty = false;
      this.isSharedProjectionDirty = false;
      this.isTransformDirty = false;
      this.updateManuallyBlocked = false;
      this.updateBlockedByResize = false;
      this.isUpdating = false;
      this.isSVG = false;
      this.needsReset = false;
      this.shouldResetTransform = false;
      this.hasCheckedOptimisedAppear = false;
      this.treeScale = { x: 1, y: 1 };
      this.eventHandlers = /* @__PURE__ */ new Map();
      this.hasTreeAnimated = false;
      this.layoutVersion = 0;
      this.updateScheduled = false;
      this.scheduleUpdate = () => this.update();
      this.projectionUpdateScheduled = false;
      this.checkUpdateFailed = () => {
        if (this.isUpdating) {
          this.isUpdating = false;
          this.clearAllSnapshots();
        }
      };
      this.updateProjection = () => {
        this.projectionUpdateScheduled = false;
        if (motionDom.statsBuffer.value) {
          metrics.nodes = metrics.calculatedTargetDeltas = metrics.calculatedProjections = 0;
        }
        this.nodes.forEach(propagateDirtyNodes);
        this.nodes.forEach(resolveTargetDelta);
        this.nodes.forEach(calcProjection);
        this.nodes.forEach(cleanDirtyNodes);
        if (motionDom.statsBuffer.addProjectionMetrics) {
          motionDom.statsBuffer.addProjectionMetrics(metrics);
        }
      };
      this.resolvedRelativeTargetAt = 0;
      this.linkedParentVersion = 0;
      this.hasProjected = false;
      this.isVisible = true;
      this.animationProgress = 0;
      this.sharedNodes = /* @__PURE__ */ new Map();
      this.latestValues = latestValues;
      this.root = parent ? parent.root || parent : this;
      this.path = parent ? [...parent.path, parent] : [];
      this.parent = parent;
      this.depth = parent ? parent.depth + 1 : 0;
      for (let i = 0; i < this.path.length; i++) {
        this.path[i].shouldResetTransform = true;
      }
      if (this.root === this)
        this.nodes = new FlatTree();
    }
    addEventListener(name, handler) {
      if (!this.eventHandlers.has(name)) {
        this.eventHandlers.set(name, new SubscriptionManager());
      }
      return this.eventHandlers.get(name).add(handler);
    }
    notifyListeners(name, ...args) {
      const subscriptionManager = this.eventHandlers.get(name);
      subscriptionManager && subscriptionManager.notify(...args);
    }
    hasListeners(name) {
      return this.eventHandlers.has(name);
    }
    /**
     * Lifecycles
     */
    mount(instance) {
      if (this.instance)
        return;
      this.isSVG = motionDom.isSVGElement(instance) && !motionDom.isSVGSVGElement(instance);
      this.instance = instance;
      const { layoutId, layout, visualElement } = this.options;
      if (visualElement && !visualElement.current) {
        visualElement.mount(instance);
      }
      this.root.nodes.add(this);
      this.parent && this.parent.children.add(this);
      if (this.root.hasTreeAnimated && (layout || layoutId)) {
        this.isLayoutDirty = true;
      }
      if (attachResizeListener) {
        let cancelDelay;
        let innerWidth = 0;
        const resizeUnblockUpdate = () => this.root.updateBlockedByResize = false;
        motionDom.frame.read(() => {
          innerWidth = window.innerWidth;
        });
        attachResizeListener(instance, () => {
          const newInnerWidth = window.innerWidth;
          if (newInnerWidth === innerWidth)
            return;
          innerWidth = newInnerWidth;
          this.root.updateBlockedByResize = true;
          cancelDelay && cancelDelay();
          cancelDelay = delay(resizeUnblockUpdate, 250);
          if (globalProjectionState.hasAnimatedSinceResize) {
            globalProjectionState.hasAnimatedSinceResize = false;
            this.nodes.forEach(finishAnimation);
          }
        });
      }
      if (layoutId) {
        this.root.registerSharedNode(layoutId, this);
      }
      if (this.options.animate !== false && visualElement && (layoutId || layout)) {
        this.addEventListener("didUpdate", ({ delta, hasLayoutChanged, hasRelativeLayoutChanged, layout: newLayout }) => {
          if (this.isTreeAnimationBlocked()) {
            this.target = void 0;
            this.relativeTarget = void 0;
            return;
          }
          const layoutTransition = this.options.transition || visualElement.getDefaultTransition() || defaultLayoutTransition;
          const { onLayoutAnimationStart, onLayoutAnimationComplete } = visualElement.getProps();
          const hasTargetChanged = !this.targetLayout || !boxEqualsRounded(this.targetLayout, newLayout);
          const hasOnlyRelativeTargetChanged = !hasLayoutChanged && hasRelativeLayoutChanged;
          if (this.options.layoutRoot || this.resumeFrom || hasOnlyRelativeTargetChanged || hasLayoutChanged && (hasTargetChanged || !this.currentAnimation)) {
            if (this.resumeFrom) {
              this.resumingFrom = this.resumeFrom;
              this.resumingFrom.resumingFrom = void 0;
            }
            const animationOptions = {
              ...motionDom.getValueTransition(layoutTransition, "layout"),
              onPlay: onLayoutAnimationStart,
              onComplete: onLayoutAnimationComplete
            };
            if (visualElement.shouldReduceMotion || this.options.layoutRoot) {
              animationOptions.delay = 0;
              animationOptions.type = false;
            }
            this.startAnimation(animationOptions);
            this.setAnimationOrigin(delta, hasOnlyRelativeTargetChanged);
          } else {
            if (!hasLayoutChanged) {
              finishAnimation(this);
            }
            if (this.isLead() && this.options.onExitComplete) {
              this.options.onExitComplete();
            }
          }
          this.targetLayout = newLayout;
        });
      }
    }
    unmount() {
      this.options.layoutId && this.willUpdate();
      this.root.nodes.remove(this);
      const stack = this.getStack();
      stack && stack.remove(this);
      this.parent && this.parent.children.delete(this);
      this.instance = void 0;
      this.eventHandlers.clear();
      motionDom.cancelFrame(this.updateProjection);
    }
    // only on the root
    blockUpdate() {
      this.updateManuallyBlocked = true;
    }
    unblockUpdate() {
      this.updateManuallyBlocked = false;
    }
    isUpdateBlocked() {
      return this.updateManuallyBlocked || this.updateBlockedByResize;
    }
    isTreeAnimationBlocked() {
      return this.isAnimationBlocked || this.parent && this.parent.isTreeAnimationBlocked() || false;
    }
    // Note: currently only running on root node
    startUpdate() {
      if (this.isUpdateBlocked())
        return;
      this.isUpdating = true;
      this.nodes && this.nodes.forEach(resetSkewAndRotation);
      this.animationId++;
    }
    getTransformTemplate() {
      const { visualElement } = this.options;
      return visualElement && visualElement.getProps().transformTemplate;
    }
    willUpdate(shouldNotifyListeners = true) {
      this.root.hasTreeAnimated = true;
      if (this.root.isUpdateBlocked()) {
        this.options.onExitComplete && this.options.onExitComplete();
        return;
      }
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear) {
        cancelTreeOptimisedTransformAnimations(this);
      }
      !this.root.isUpdating && this.root.startUpdate();
      if (this.isLayoutDirty)
        return;
      this.isLayoutDirty = true;
      for (let i = 0; i < this.path.length; i++) {
        const node = this.path[i];
        node.shouldResetTransform = true;
        node.updateScroll("snapshot");
        if (node.options.layoutRoot) {
          node.willUpdate(false);
        }
      }
      const { layoutId, layout } = this.options;
      if (layoutId === void 0 && !layout)
        return;
      const transformTemplate = this.getTransformTemplate();
      this.prevTransformTemplateValue = transformTemplate ? transformTemplate(this.latestValues, "") : void 0;
      this.updateSnapshot();
      shouldNotifyListeners && this.notifyListeners("willUpdate");
    }
    update() {
      this.updateScheduled = false;
      const updateWasBlocked = this.isUpdateBlocked();
      if (updateWasBlocked) {
        this.unblockUpdate();
        this.clearAllSnapshots();
        this.nodes.forEach(clearMeasurements);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(clearIsLayoutDirty);
        return;
      }
      this.animationCommitId = this.animationId;
      if (!this.isUpdating) {
        this.nodes.forEach(clearIsLayoutDirty);
      } else {
        this.isUpdating = false;
        this.nodes.forEach(resetTransformStyle);
        this.nodes.forEach(updateLayout);
        this.nodes.forEach(notifyLayoutUpdate);
      }
      this.clearAllSnapshots();
      const now = motionDom.time.now();
      motionDom.frameData.delta = clamp(0, 1e3 / 60, now - motionDom.frameData.timestamp);
      motionDom.frameData.timestamp = now;
      motionDom.frameData.isProcessing = true;
      motionDom.frameSteps.update.process(motionDom.frameData);
      motionDom.frameSteps.preRender.process(motionDom.frameData);
      motionDom.frameSteps.render.process(motionDom.frameData);
      motionDom.frameData.isProcessing = false;
    }
    didUpdate() {
      if (!this.updateScheduled) {
        this.updateScheduled = true;
        motionDom.microtask.read(this.scheduleUpdate);
      }
    }
    clearAllSnapshots() {
      this.nodes.forEach(clearSnapshot);
      this.sharedNodes.forEach(removeLeadSnapshots);
    }
    scheduleUpdateProjection() {
      if (!this.projectionUpdateScheduled) {
        this.projectionUpdateScheduled = true;
        motionDom.frame.preRender(this.updateProjection, false, true);
      }
    }
    scheduleCheckAfterUnmount() {
      motionDom.frame.postRender(() => {
        if (this.isLayoutDirty) {
          this.root.didUpdate();
        } else {
          this.root.checkUpdateFailed();
        }
      });
    }
    /**
     * Update measurements
     */
    updateSnapshot() {
      if (this.snapshot || !this.instance)
        return;
      this.snapshot = this.measure();
      if (this.snapshot && !calcLength(this.snapshot.measuredBox.x) && !calcLength(this.snapshot.measuredBox.y)) {
        this.snapshot = void 0;
      }
    }
    updateLayout() {
      if (!this.instance)
        return;
      this.updateScroll();
      if (!(this.options.alwaysMeasureLayout && this.isLead()) && !this.isLayoutDirty) {
        return;
      }
      if (this.resumeFrom && !this.resumeFrom.instance) {
        for (let i = 0; i < this.path.length; i++) {
          const node = this.path[i];
          node.updateScroll();
        }
      }
      const prevLayout = this.layout;
      this.layout = this.measure(false);
      this.layoutVersion++;
      this.layoutCorrected = createBox$1();
      this.isLayoutDirty = false;
      this.projectionDelta = void 0;
      this.notifyListeners("measure", this.layout.layoutBox);
      const { visualElement } = this.options;
      visualElement && visualElement.notify("LayoutMeasure", this.layout.layoutBox, prevLayout ? prevLayout.layoutBox : void 0);
    }
    updateScroll(phase = "measure") {
      let needsMeasurement = Boolean(this.options.layoutScroll && this.instance);
      if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === phase) {
        needsMeasurement = false;
      }
      if (needsMeasurement && this.instance) {
        const isRoot = checkIsScrollRoot(this.instance);
        this.scroll = {
          animationId: this.root.animationId,
          phase,
          isRoot,
          offset: measureScroll(this.instance),
          wasRoot: this.scroll ? this.scroll.isRoot : isRoot
        };
      }
    }
    resetTransform() {
      if (!resetTransform)
        return;
      const isResetRequested = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout;
      const hasProjection = this.projectionDelta && !isDeltaZero(this.projectionDelta);
      const transformTemplate = this.getTransformTemplate();
      const transformTemplateValue = transformTemplate ? transformTemplate(this.latestValues, "") : void 0;
      const transformTemplateHasChanged = transformTemplateValue !== this.prevTransformTemplateValue;
      if (isResetRequested && this.instance && (hasProjection || hasTransform(this.latestValues) || transformTemplateHasChanged)) {
        resetTransform(this.instance, transformTemplateValue);
        this.shouldResetTransform = false;
        this.scheduleRender();
      }
    }
    measure(removeTransform = true) {
      const pageBox = this.measurePageBox();
      let layoutBox = this.removeElementScroll(pageBox);
      if (removeTransform) {
        layoutBox = this.removeTransform(layoutBox);
      }
      roundBox(layoutBox);
      return {
        animationId: this.root.animationId,
        measuredBox: pageBox,
        layoutBox,
        latestValues: {},
        source: this.id
      };
    }
    measurePageBox() {
      var _a;
      const { visualElement } = this.options;
      if (!visualElement)
        return createBox$1();
      const box = visualElement.measureViewportBox();
      const wasInScrollRoot = ((_a = this.scroll) == null ? void 0 : _a.wasRoot) || this.path.some(checkNodeWasScrollRoot);
      if (!wasInScrollRoot) {
        const { scroll: scroll2 } = this.root;
        if (scroll2) {
          translateAxis$1(box.x, scroll2.offset.x);
          translateAxis$1(box.y, scroll2.offset.y);
        }
      }
      return box;
    }
    removeElementScroll(box) {
      var _a;
      const boxWithoutScroll = createBox$1();
      copyBoxInto(boxWithoutScroll, box);
      if ((_a = this.scroll) == null ? void 0 : _a.wasRoot) {
        return boxWithoutScroll;
      }
      for (let i = 0; i < this.path.length; i++) {
        const node = this.path[i];
        const { scroll: scroll2, options } = node;
        if (node !== this.root && scroll2 && options.layoutScroll) {
          if (scroll2.wasRoot) {
            copyBoxInto(boxWithoutScroll, box);
          }
          translateAxis$1(boxWithoutScroll.x, scroll2.offset.x);
          translateAxis$1(boxWithoutScroll.y, scroll2.offset.y);
        }
      }
      return boxWithoutScroll;
    }
    applyTransform(box, transformOnly = false) {
      const withTransforms = createBox$1();
      copyBoxInto(withTransforms, box);
      for (let i = 0; i < this.path.length; i++) {
        const node = this.path[i];
        if (!transformOnly && node.options.layoutScroll && node.scroll && node !== node.root) {
          transformBox(withTransforms, {
            x: -node.scroll.offset.x,
            y: -node.scroll.offset.y
          });
        }
        if (!hasTransform(node.latestValues))
          continue;
        transformBox(withTransforms, node.latestValues);
      }
      if (hasTransform(this.latestValues)) {
        transformBox(withTransforms, this.latestValues);
      }
      return withTransforms;
    }
    removeTransform(box) {
      const boxWithoutTransform = createBox$1();
      copyBoxInto(boxWithoutTransform, box);
      for (let i = 0; i < this.path.length; i++) {
        const node = this.path[i];
        if (!node.instance)
          continue;
        if (!hasTransform(node.latestValues))
          continue;
        hasScale(node.latestValues) && node.updateSnapshot();
        const sourceBox = createBox$1();
        const nodeBox = node.measurePageBox();
        copyBoxInto(sourceBox, nodeBox);
        removeBoxTransforms(boxWithoutTransform, node.latestValues, node.snapshot ? node.snapshot.layoutBox : void 0, sourceBox);
      }
      if (hasTransform(this.latestValues)) {
        removeBoxTransforms(boxWithoutTransform, this.latestValues);
      }
      return boxWithoutTransform;
    }
    setTargetDelta(delta) {
      this.targetDelta = delta;
      this.root.scheduleUpdateProjection();
      this.isProjectionDirty = true;
    }
    setOptions(options) {
      this.options = {
        ...this.options,
        ...options,
        crossfade: options.crossfade !== void 0 ? options.crossfade : true
      };
    }
    clearMeasurements() {
      this.scroll = void 0;
      this.layout = void 0;
      this.snapshot = void 0;
      this.prevTransformTemplateValue = void 0;
      this.targetDelta = void 0;
      this.target = void 0;
      this.isLayoutDirty = false;
    }
    forceRelativeParentToResolveTarget() {
      if (!this.relativeParent)
        return;
      if (this.relativeParent.resolvedRelativeTargetAt !== motionDom.frameData.timestamp) {
        this.relativeParent.resolveTargetDelta(true);
      }
    }
    resolveTargetDelta(forceRecalculation = false) {
      var _a;
      const lead = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = lead.isProjectionDirty);
      this.isTransformDirty || (this.isTransformDirty = lead.isTransformDirty);
      this.isSharedProjectionDirty || (this.isSharedProjectionDirty = lead.isSharedProjectionDirty);
      const isShared = Boolean(this.resumingFrom) || this !== lead;
      const canSkip = !(forceRecalculation || isShared && this.isSharedProjectionDirty || this.isProjectionDirty || ((_a = this.parent) == null ? void 0 : _a.isProjectionDirty) || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize);
      if (canSkip)
        return;
      const { layout, layoutId } = this.options;
      if (!this.layout || !(layout || layoutId))
        return;
      this.resolvedRelativeTargetAt = motionDom.frameData.timestamp;
      const relativeParent = this.getClosestProjectingParent();
      if (relativeParent && this.linkedParentVersion !== relativeParent.layoutVersion && !relativeParent.options.layoutRoot) {
        this.removeRelativeTarget();
      }
      if (!this.targetDelta && !this.relativeTarget) {
        if (relativeParent && relativeParent.layout) {
          this.createRelativeTarget(relativeParent, this.layout.layoutBox, relativeParent.layout.layoutBox);
        } else {
          this.removeRelativeTarget();
        }
      }
      if (!this.relativeTarget && !this.targetDelta)
        return;
      if (!this.target) {
        this.target = createBox$1();
        this.targetWithTransforms = createBox$1();
      }
      if (this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target) {
        this.forceRelativeParentToResolveTarget();
        calcRelativeBox(this.target, this.relativeTarget, this.relativeParent.target);
      } else if (this.targetDelta) {
        if (Boolean(this.resumingFrom)) {
          this.target = this.applyTransform(this.layout.layoutBox);
        } else {
          copyBoxInto(this.target, this.layout.layoutBox);
        }
        applyBoxDelta(this.target, this.targetDelta);
      } else {
        copyBoxInto(this.target, this.layout.layoutBox);
      }
      if (this.attemptToResolveRelativeTarget) {
        this.attemptToResolveRelativeTarget = false;
        if (relativeParent && Boolean(relativeParent.resumingFrom) === Boolean(this.resumingFrom) && !relativeParent.options.layoutScroll && relativeParent.target && this.animationProgress !== 1) {
          this.createRelativeTarget(relativeParent, this.target, relativeParent.target);
        } else {
          this.relativeParent = this.relativeTarget = void 0;
        }
      }
      if (motionDom.statsBuffer.value) {
        metrics.calculatedTargetDeltas++;
      }
    }
    getClosestProjectingParent() {
      if (!this.parent || hasScale(this.parent.latestValues) || has2DTranslate(this.parent.latestValues)) {
        return void 0;
      }
      if (this.parent.isProjecting()) {
        return this.parent;
      } else {
        return this.parent.getClosestProjectingParent();
      }
    }
    isProjecting() {
      return Boolean((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(relativeParent, layout, parentLayout) {
      this.relativeParent = relativeParent;
      this.linkedParentVersion = relativeParent.layoutVersion;
      this.forceRelativeParentToResolveTarget();
      this.relativeTarget = createBox$1();
      this.relativeTargetOrigin = createBox$1();
      calcRelativePosition(this.relativeTargetOrigin, layout, parentLayout);
      copyBoxInto(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      var _a;
      const lead = this.getLead();
      const isShared = Boolean(this.resumingFrom) || this !== lead;
      let canSkip = true;
      if (this.isProjectionDirty || ((_a = this.parent) == null ? void 0 : _a.isProjectionDirty)) {
        canSkip = false;
      }
      if (isShared && (this.isSharedProjectionDirty || this.isTransformDirty)) {
        canSkip = false;
      }
      if (this.resolvedRelativeTargetAt === motionDom.frameData.timestamp) {
        canSkip = false;
      }
      if (canSkip)
        return;
      const { layout, layoutId } = this.options;
      this.isTreeAnimating = Boolean(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation);
      if (!this.isTreeAnimating) {
        this.targetDelta = this.relativeTarget = void 0;
      }
      if (!this.layout || !(layout || layoutId))
        return;
      copyBoxInto(this.layoutCorrected, this.layout.layoutBox);
      const prevTreeScaleX = this.treeScale.x;
      const prevTreeScaleY = this.treeScale.y;
      applyTreeDeltas(this.layoutCorrected, this.treeScale, this.path, isShared);
      if (lead.layout && !lead.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1)) {
        lead.target = lead.layout.layoutBox;
        lead.targetWithTransforms = createBox$1();
      }
      const { target } = lead;
      if (!target) {
        if (this.prevProjectionDelta) {
          this.createProjectionDeltas();
          this.scheduleRender();
        }
        return;
      }
      if (!this.projectionDelta || !this.prevProjectionDelta) {
        this.createProjectionDeltas();
      } else {
        copyAxisDeltaInto(this.prevProjectionDelta.x, this.projectionDelta.x);
        copyAxisDeltaInto(this.prevProjectionDelta.y, this.projectionDelta.y);
      }
      calcBoxDelta(this.projectionDelta, this.layoutCorrected, target, this.latestValues);
      if (this.treeScale.x !== prevTreeScaleX || this.treeScale.y !== prevTreeScaleY || !axisDeltaEquals(this.projectionDelta.x, this.prevProjectionDelta.x) || !axisDeltaEquals(this.projectionDelta.y, this.prevProjectionDelta.y)) {
        this.hasProjected = true;
        this.scheduleRender();
        this.notifyListeners("projectionUpdate", target);
      }
      if (motionDom.statsBuffer.value) {
        metrics.calculatedProjections++;
      }
    }
    hide() {
      this.isVisible = false;
    }
    show() {
      this.isVisible = true;
    }
    scheduleRender(notifyAll = true) {
      var _a;
      (_a = this.options.visualElement) == null ? void 0 : _a.scheduleRender();
      if (notifyAll) {
        const stack = this.getStack();
        stack && stack.scheduleRender();
      }
      if (this.resumingFrom && !this.resumingFrom.instance) {
        this.resumingFrom = void 0;
      }
    }
    createProjectionDeltas() {
      this.prevProjectionDelta = createDelta();
      this.projectionDelta = createDelta();
      this.projectionDeltaWithTransform = createDelta();
    }
    setAnimationOrigin(delta, hasOnlyRelativeTargetChanged = false) {
      const snapshot = this.snapshot;
      const snapshotLatestValues = snapshot ? snapshot.latestValues : {};
      const mixedValues = { ...this.latestValues };
      const targetDelta = createDelta();
      if (!this.relativeParent || !this.relativeParent.options.layoutRoot) {
        this.relativeTarget = this.relativeTargetOrigin = void 0;
      }
      this.attemptToResolveRelativeTarget = !hasOnlyRelativeTargetChanged;
      const relativeLayout = createBox$1();
      const snapshotSource = snapshot ? snapshot.source : void 0;
      const layoutSource = this.layout ? this.layout.source : void 0;
      const isSharedLayoutAnimation = snapshotSource !== layoutSource;
      const stack = this.getStack();
      const isOnlyMember = !stack || stack.members.length <= 1;
      const shouldCrossfadeOpacity = Boolean(isSharedLayoutAnimation && !isOnlyMember && this.options.crossfade === true && !this.path.some(hasOpacityCrossfade));
      this.animationProgress = 0;
      let prevRelativeTarget;
      this.mixTargetDelta = (latest) => {
        const progress2 = latest / 1e3;
        mixAxisDelta(targetDelta.x, delta.x, progress2);
        mixAxisDelta(targetDelta.y, delta.y, progress2);
        this.setTargetDelta(targetDelta);
        if (this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout) {
          calcRelativePosition(relativeLayout, this.layout.layoutBox, this.relativeParent.layout.layoutBox);
          mixBox(this.relativeTarget, this.relativeTargetOrigin, relativeLayout, progress2);
          if (prevRelativeTarget && boxEquals(this.relativeTarget, prevRelativeTarget)) {
            this.isProjectionDirty = false;
          }
          if (!prevRelativeTarget)
            prevRelativeTarget = createBox$1();
          copyBoxInto(prevRelativeTarget, this.relativeTarget);
        }
        if (isSharedLayoutAnimation) {
          this.animationValues = mixedValues;
          mixValues(mixedValues, snapshotLatestValues, this.latestValues, progress2, shouldCrossfadeOpacity, isOnlyMember);
        }
        this.root.scheduleUpdateProjection();
        this.scheduleRender();
        this.animationProgress = progress2;
      };
      this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(options) {
      var _a, _b, _c;
      this.notifyListeners("animationStart");
      (_a = this.currentAnimation) == null ? void 0 : _a.stop();
      (_c = (_b = this.resumingFrom) == null ? void 0 : _b.currentAnimation) == null ? void 0 : _c.stop();
      if (this.pendingAnimation) {
        motionDom.cancelFrame(this.pendingAnimation);
        this.pendingAnimation = void 0;
      }
      this.pendingAnimation = motionDom.frame.update(() => {
        globalProjectionState.hasAnimatedSinceResize = true;
        motionDom.activeAnimations.layout++;
        this.motionValue || (this.motionValue = motionDom.motionValue(0));
        this.currentAnimation = animateSingleValue(this.motionValue, [0, 1e3], {
          ...options,
          velocity: 0,
          isSync: true,
          onUpdate: (latest) => {
            this.mixTargetDelta(latest);
            options.onUpdate && options.onUpdate(latest);
          },
          onStop: () => {
            motionDom.activeAnimations.layout--;
          },
          onComplete: () => {
            motionDom.activeAnimations.layout--;
            options.onComplete && options.onComplete();
            this.completeAnimation();
          }
        });
        if (this.resumingFrom) {
          this.resumingFrom.currentAnimation = this.currentAnimation;
        }
        this.pendingAnimation = void 0;
      });
    }
    completeAnimation() {
      if (this.resumingFrom) {
        this.resumingFrom.currentAnimation = void 0;
        this.resumingFrom.preserveOpacity = void 0;
      }
      const stack = this.getStack();
      stack && stack.exitAnimationComplete();
      this.resumingFrom = this.currentAnimation = this.animationValues = void 0;
      this.notifyListeners("animationComplete");
    }
    finishAnimation() {
      if (this.currentAnimation) {
        this.mixTargetDelta && this.mixTargetDelta(animationTarget);
        this.currentAnimation.stop();
      }
      this.completeAnimation();
    }
    applyTransformsToTarget() {
      const lead = this.getLead();
      let { targetWithTransforms, target, layout, latestValues } = lead;
      if (!targetWithTransforms || !target || !layout)
        return;
      if (this !== lead && this.layout && layout && shouldAnimatePositionOnly(this.options.animationType, this.layout.layoutBox, layout.layoutBox)) {
        target = this.target || createBox$1();
        const xLength = calcLength(this.layout.layoutBox.x);
        target.x.min = lead.target.x.min;
        target.x.max = target.x.min + xLength;
        const yLength = calcLength(this.layout.layoutBox.y);
        target.y.min = lead.target.y.min;
        target.y.max = target.y.min + yLength;
      }
      copyBoxInto(targetWithTransforms, target);
      transformBox(targetWithTransforms, latestValues);
      calcBoxDelta(this.projectionDeltaWithTransform, this.layoutCorrected, targetWithTransforms, latestValues);
    }
    registerSharedNode(layoutId, node) {
      if (!this.sharedNodes.has(layoutId)) {
        this.sharedNodes.set(layoutId, new NodeStack());
      }
      const stack = this.sharedNodes.get(layoutId);
      stack.add(node);
      const config = node.options.initialPromotionConfig;
      node.promote({
        transition: config ? config.transition : void 0,
        preserveFollowOpacity: config && config.shouldPreserveFollowOpacity ? config.shouldPreserveFollowOpacity(node) : void 0
      });
    }
    isLead() {
      const stack = this.getStack();
      return stack ? stack.lead === this : true;
    }
    getLead() {
      var _a;
      const { layoutId } = this.options;
      return layoutId ? ((_a = this.getStack()) == null ? void 0 : _a.lead) || this : this;
    }
    getPrevLead() {
      var _a;
      const { layoutId } = this.options;
      return layoutId ? (_a = this.getStack()) == null ? void 0 : _a.prevLead : void 0;
    }
    getStack() {
      const { layoutId } = this.options;
      if (layoutId)
        return this.root.sharedNodes.get(layoutId);
    }
    promote({ needsReset, transition, preserveFollowOpacity } = {}) {
      const stack = this.getStack();
      if (stack)
        stack.promote(this, preserveFollowOpacity);
      if (needsReset) {
        this.projectionDelta = void 0;
        this.needsReset = true;
      }
      if (transition)
        this.setOptions({ transition });
    }
    relegate() {
      const stack = this.getStack();
      if (stack) {
        return stack.relegate(this);
      } else {
        return false;
      }
    }
    resetSkewAndRotation() {
      const { visualElement } = this.options;
      if (!visualElement)
        return;
      let hasDistortingTransform = false;
      const { latestValues } = visualElement;
      if (latestValues.z || latestValues.rotate || latestValues.rotateX || latestValues.rotateY || latestValues.rotateZ || latestValues.skewX || latestValues.skewY) {
        hasDistortingTransform = true;
      }
      if (!hasDistortingTransform)
        return;
      const resetValues = {};
      if (latestValues.z) {
        resetDistortingTransform("z", visualElement, resetValues, this.animationValues);
      }
      for (let i = 0; i < transformAxes.length; i++) {
        resetDistortingTransform(`rotate${transformAxes[i]}`, visualElement, resetValues, this.animationValues);
        resetDistortingTransform(`skew${transformAxes[i]}`, visualElement, resetValues, this.animationValues);
      }
      visualElement.render();
      for (const key in resetValues) {
        visualElement.setStaticValue(key, resetValues[key]);
        if (this.animationValues) {
          this.animationValues[key] = resetValues[key];
        }
      }
      visualElement.scheduleRender();
    }
    applyProjectionStyles(targetStyle, styleProp) {
      if (!this.instance || this.isSVG)
        return;
      if (!this.isVisible) {
        targetStyle.visibility = "hidden";
        return;
      }
      const transformTemplate = this.getTransformTemplate();
      if (this.needsReset) {
        this.needsReset = false;
        targetStyle.visibility = "";
        targetStyle.opacity = "";
        targetStyle.pointerEvents = resolveMotionValue(styleProp == null ? void 0 : styleProp.pointerEvents) || "";
        targetStyle.transform = transformTemplate ? transformTemplate(this.latestValues, "") : "none";
        return;
      }
      const lead = this.getLead();
      if (!this.projectionDelta || !this.layout || !lead.target) {
        if (this.options.layoutId) {
          targetStyle.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1;
          targetStyle.pointerEvents = resolveMotionValue(styleProp == null ? void 0 : styleProp.pointerEvents) || "";
        }
        if (this.hasProjected && !hasTransform(this.latestValues)) {
          targetStyle.transform = transformTemplate ? transformTemplate({}, "") : "none";
          this.hasProjected = false;
        }
        return;
      }
      targetStyle.visibility = "";
      const valuesToRender = lead.animationValues || lead.latestValues;
      this.applyTransformsToTarget();
      let transform = buildProjectionTransform(this.projectionDeltaWithTransform, this.treeScale, valuesToRender);
      if (transformTemplate) {
        transform = transformTemplate(valuesToRender, transform);
      }
      targetStyle.transform = transform;
      const { x, y } = this.projectionDelta;
      targetStyle.transformOrigin = `${x.origin * 100}% ${y.origin * 100}% 0`;
      if (lead.animationValues) {
        targetStyle.opacity = lead === this ? valuesToRender.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : valuesToRender.opacityExit;
      } else {
        targetStyle.opacity = lead === this ? valuesToRender.opacity !== void 0 ? valuesToRender.opacity : "" : valuesToRender.opacityExit !== void 0 ? valuesToRender.opacityExit : 0;
      }
      for (const key in scaleCorrectors) {
        if (valuesToRender[key] === void 0)
          continue;
        const { correct, applyTo, isCSSVariable } = scaleCorrectors[key];
        const corrected = transform === "none" ? valuesToRender[key] : correct(valuesToRender[key], lead);
        if (applyTo) {
          const num = applyTo.length;
          for (let i = 0; i < num; i++) {
            targetStyle[applyTo[i]] = corrected;
          }
        } else {
          if (isCSSVariable) {
            this.options.visualElement.renderState.vars[key] = corrected;
          } else {
            targetStyle[key] = corrected;
          }
        }
      }
      if (this.options.layoutId) {
        targetStyle.pointerEvents = lead === this ? resolveMotionValue(styleProp == null ? void 0 : styleProp.pointerEvents) || "" : "none";
      }
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((node) => {
        var _a;
        return (_a = node.currentAnimation) == null ? void 0 : _a.stop();
      });
      this.root.nodes.forEach(clearMeasurements);
      this.root.sharedNodes.clear();
    }
  };
}
function updateLayout(node) {
  node.updateLayout();
}
function notifyLayoutUpdate(node) {
  var _a;
  const snapshot = ((_a = node.resumeFrom) == null ? void 0 : _a.snapshot) || node.snapshot;
  if (node.isLead() && node.layout && snapshot && node.hasListeners("didUpdate")) {
    const { layoutBox: layout, measuredBox: measuredLayout } = node.layout;
    const { animationType } = node.options;
    const isShared = snapshot.source !== node.layout.source;
    if (animationType === "size") {
      eachAxis((axis) => {
        const axisSnapshot = isShared ? snapshot.measuredBox[axis] : snapshot.layoutBox[axis];
        const length = calcLength(axisSnapshot);
        axisSnapshot.min = layout[axis].min;
        axisSnapshot.max = axisSnapshot.min + length;
      });
    } else if (shouldAnimatePositionOnly(animationType, snapshot.layoutBox, layout)) {
      eachAxis((axis) => {
        const axisSnapshot = isShared ? snapshot.measuredBox[axis] : snapshot.layoutBox[axis];
        const length = calcLength(layout[axis]);
        axisSnapshot.max = axisSnapshot.min + length;
        if (node.relativeTarget && !node.currentAnimation) {
          node.isProjectionDirty = true;
          node.relativeTarget[axis].max = node.relativeTarget[axis].min + length;
        }
      });
    }
    const layoutDelta = createDelta();
    calcBoxDelta(layoutDelta, layout, snapshot.layoutBox);
    const visualDelta = createDelta();
    if (isShared) {
      calcBoxDelta(visualDelta, node.applyTransform(measuredLayout, true), snapshot.measuredBox);
    } else {
      calcBoxDelta(visualDelta, layout, snapshot.layoutBox);
    }
    const hasLayoutChanged = !isDeltaZero(layoutDelta);
    let hasRelativeLayoutChanged = false;
    if (!node.resumeFrom) {
      const relativeParent = node.getClosestProjectingParent();
      if (relativeParent && !relativeParent.resumeFrom) {
        const { snapshot: parentSnapshot, layout: parentLayout } = relativeParent;
        if (parentSnapshot && parentLayout) {
          const relativeSnapshot = createBox$1();
          calcRelativePosition(relativeSnapshot, snapshot.layoutBox, parentSnapshot.layoutBox);
          const relativeLayout = createBox$1();
          calcRelativePosition(relativeLayout, layout, parentLayout.layoutBox);
          if (!boxEqualsRounded(relativeSnapshot, relativeLayout)) {
            hasRelativeLayoutChanged = true;
          }
          if (relativeParent.options.layoutRoot) {
            node.relativeTarget = relativeLayout;
            node.relativeTargetOrigin = relativeSnapshot;
            node.relativeParent = relativeParent;
          }
        }
      }
    }
    node.notifyListeners("didUpdate", {
      layout,
      snapshot,
      delta: visualDelta,
      layoutDelta,
      hasLayoutChanged,
      hasRelativeLayoutChanged
    });
  } else if (node.isLead()) {
    const { onExitComplete } = node.options;
    onExitComplete && onExitComplete();
  }
  node.options.transition = void 0;
}
function propagateDirtyNodes(node) {
  if (motionDom.statsBuffer.value) {
    metrics.nodes++;
  }
  if (!node.parent)
    return;
  if (!node.isProjecting()) {
    node.isProjectionDirty = node.parent.isProjectionDirty;
  }
  node.isSharedProjectionDirty || (node.isSharedProjectionDirty = Boolean(node.isProjectionDirty || node.parent.isProjectionDirty || node.parent.isSharedProjectionDirty));
  node.isTransformDirty || (node.isTransformDirty = node.parent.isTransformDirty);
}
function cleanDirtyNodes(node) {
  node.isProjectionDirty = node.isSharedProjectionDirty = node.isTransformDirty = false;
}
function clearSnapshot(node) {
  node.clearSnapshot();
}
function clearMeasurements(node) {
  node.clearMeasurements();
}
function clearIsLayoutDirty(node) {
  node.isLayoutDirty = false;
}
function resetTransformStyle(node) {
  const { visualElement } = node.options;
  if (visualElement && visualElement.getProps().onBeforeLayoutMeasure) {
    visualElement.notify("BeforeLayoutMeasure");
  }
  node.resetTransform();
}
function finishAnimation(node) {
  node.finishAnimation();
  node.targetDelta = node.relativeTarget = node.target = void 0;
  node.isProjectionDirty = true;
}
function resolveTargetDelta(node) {
  node.resolveTargetDelta();
}
function calcProjection(node) {
  node.calcProjection();
}
function resetSkewAndRotation(node) {
  node.resetSkewAndRotation();
}
function removeLeadSnapshots(stack) {
  stack.removeLeadSnapshot();
}
function mixAxisDelta(output, delta, p) {
  output.translate = motionDom.mixNumber(delta.translate, 0, p);
  output.scale = motionDom.mixNumber(delta.scale, 1, p);
  output.origin = delta.origin;
  output.originPoint = delta.originPoint;
}
function mixAxis(output, from, to, p) {
  output.min = motionDom.mixNumber(from.min, to.min, p);
  output.max = motionDom.mixNumber(from.max, to.max, p);
}
function mixBox(output, from, to, p) {
  mixAxis(output.x, from.x, to.x, p);
  mixAxis(output.y, from.y, to.y, p);
}
function hasOpacityCrossfade(node) {
  return node.animationValues && node.animationValues.opacityExit !== void 0;
}
const defaultLayoutTransition = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
};
const userAgentContains = (string) => typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(string);
const roundPoint = userAgentContains("applewebkit/") && !userAgentContains("chrome/") ? Math.round : noop;
function roundAxis(axis) {
  axis.min = roundPoint(axis.min);
  axis.max = roundPoint(axis.max);
}
function roundBox(box) {
  roundAxis(box.x);
  roundAxis(box.y);
}
function shouldAnimatePositionOnly(animationType, snapshot, layout) {
  return animationType === "position" || animationType === "preserve-aspect" && !isNear(aspectRatio(snapshot), aspectRatio(layout), 0.2);
}
function checkNodeWasScrollRoot(node) {
  var _a;
  return node !== node.root && ((_a = node.scroll) == null ? void 0 : _a.wasRoot);
}
function addDomEvent(target, eventName, handler, options = { passive: true }) {
  target.addEventListener(eventName, handler, options);
  return () => target.removeEventListener(eventName, handler);
}
const DocumentProjectionNode = createProjectionNode({
  attachResizeListener: (ref, notify2) => addDomEvent(ref, "resize", notify2),
  measureScroll: () => ({
    x: document.documentElement.scrollLeft || document.body.scrollLeft,
    y: document.documentElement.scrollTop || document.body.scrollTop
  }),
  checkIsScrollRoot: () => true
});
const rootProjectionNode = {
  current: void 0
};
const HTMLProjectionNode = createProjectionNode({
  measureScroll: (instance) => ({
    x: instance.scrollLeft,
    y: instance.scrollTop
  }),
  defaultParent: () => {
    if (!rootProjectionNode.current) {
      const documentNode = new DocumentProjectionNode({});
      documentNode.mount(window);
      documentNode.setOptions({ layoutScroll: true });
      rootProjectionNode.current = documentNode;
    }
    return rootProjectionNode.current;
  },
  resetTransform: (instance, value) => {
    instance.style.transform = value !== void 0 ? value : "none";
  },
  checkIsScrollRoot: (instance) => Boolean(window.getComputedStyle(instance).position === "fixed")
});
function getClosestProjectingNode(visualElement) {
  if (!visualElement)
    return void 0;
  return visualElement.options.allowProjection !== false ? visualElement.projection : getClosestProjectingNode(visualElement.parent);
}
class ProjectionFeature extends Feature {
  constructor(state) {
    super(state);
    addScaleCorrector(defaultScaleCorrector);
  }
  initProjection() {
    const options = this.state.options;
    this.state.visualElement.projection = new HTMLProjectionNode(
      this.state.visualElement.latestValues,
      options["data-framer-portal-id"] ? void 0 : getClosestProjectingNode(this.state.visualElement.parent)
    );
    this.state.visualElement.projection.isPresent = true;
    this.setOptions();
  }
  beforeMount() {
    this.initProjection();
  }
  setOptions() {
    const options = this.state.options;
    const { layoutId, layout, drag = false, dragConstraints = false } = options;
    this.state.visualElement.projection.setOptions({
      layout,
      layoutId,
      alwaysMeasureLayout: Boolean(layoutId) || Boolean(drag) || dragConstraints && isHTMLElement(dragConstraints),
      visualElement: this.state.visualElement,
      animationType: typeof options.layout === "string" ? options.layout : "both",
      // initialPromotionConfig
      layoutRoot: options.layoutRoot,
      layoutScroll: options.layoutScroll,
      crossfade: options.crossfade,
      onExitComplete: () => {
        var _a;
        if (!((_a = this.state.visualElement.projection) == null ? void 0 : _a.isPresent)) {
          this.state.element.dispatchEvent(motionEvent("motioncomplete", this.state.target, true));
        }
      }
    });
  }
  update() {
    this.setOptions();
  }
  mount() {
    var _a;
    (_a = this.state.visualElement.projection) == null ? void 0 : _a.mount(this.state.element);
  }
}
const domMax = [
  AnimationFeature,
  PressGesture,
  HoverGesture,
  InViewGesture,
  FocusGesture,
  ProjectionFeature,
  PanGesture,
  DragGesture,
  LayoutFeature
];
const domAnimation = [
  AnimationFeature,
  PressGesture,
  HoverGesture,
  InViewGesture,
  FocusGesture
];
function isVariantLabels(value) {
  return typeof value === "string" || value === false || Array.isArray(value);
}
const mountedStates = /* @__PURE__ */ new WeakMap();
let id = 0;
class MotionState {
  constructor(options, parent) {
    var _a;
    this.element = null;
    this.isExiting = false;
    this.children = /* @__PURE__ */ new Set();
    this.activeStates = {
      initial: true,
      animate: true
    };
    this.currentProcess = null;
    this._context = null;
    this.animateUpdates = noop;
    this.id = `motion-state-${id++}`;
    this.options = options;
    this.parent = parent;
    (_a = parent == null ? void 0 : parent.children) == null ? void 0 : _a.add(this);
    const initial = options.initial === void 0 && options.variants ? this.context.initial : options.initial;
    const initialVariantSource = initial === false ? ["initial", "animate"] : ["initial"];
    this.initTarget(initialVariantSource);
    this.featureManager = new FeatureManager(this);
    this.type = isSVGElement(this.options.as) ? "svg" : "html";
  }
  // Get animation context, falling back to parent context for inheritance
  get context() {
    if (!this._context) {
      const handler = {
        get: (target, prop) => {
          var _a;
          return isVariantLabels(this.options[prop]) ? this.options[prop] : (_a = this.parent) == null ? void 0 : _a.context[prop];
        }
      };
      this._context = new Proxy({}, handler);
    }
    return this._context;
  }
  // Initialize animation target values
  initTarget(initialVariantSource) {
    var _a;
    const custom = this.options.custom ?? ((_a = this.options.animatePresenceContext) == null ? void 0 : _a.custom);
    this.baseTarget = initialVariantSource.reduce((acc, variant) => {
      return {
        ...acc,
        ...resolveVariant(this.options[variant] || this.context[variant], this.options.variants, custom)
      };
    }, {});
    this.target = {};
  }
  // Update visual element with new options
  updateOptions(options) {
    var _a;
    this.options = options;
    (_a = this.visualElement) == null ? void 0 : _a.update({
      ...this.options,
      whileTap: this.options.whilePress
    }, null);
  }
  // Called before mounting, executes in parent-to-child order
  beforeMount() {
    this.featureManager.beforeMount();
  }
  // Mount motion state to DOM element, handles parent-child relationships
  mount(element, options, notAnimate = false) {
    var _a;
    heyListen.invariant(
      Boolean(element),
      "Animation state must be mounted with valid Element"
    );
    this.element = element;
    this.updateOptions(options);
    this.featureManager.mount();
    if (!notAnimate && this.options.animate) {
      (_a = this.startAnimation) == null ? void 0 : _a.call(this);
    }
  }
  clearAnimation() {
    var _a, _b;
    this.currentProcess && motionDom.cancelFrame(this.currentProcess);
    this.currentProcess = null;
    (_b = (_a = this.visualElement) == null ? void 0 : _a.variantChildren) == null ? void 0 : _b.forEach((child) => {
      child.state.clearAnimation();
    });
  }
  // update trigger animation
  startAnimation() {
    this.clearAnimation();
    this.currentProcess = motionDom.frame.render(() => {
      this.currentProcess = null;
      this.animateUpdates();
    });
  }
  // Called before unmounting, executes in child-to-parent order
  beforeUnmount() {
    this.featureManager.beforeUnmount();
  }
  unmount(unMountChildren = false) {
    const unmountState = () => {
      var _a, _b, _c;
      if (unMountChildren) {
        Array.from(this.children).forEach(this.unmountChild);
      }
      (_b = (_a = this.parent) == null ? void 0 : _a.children) == null ? void 0 : _b.delete(this);
      mountedStates.delete(this.element);
      this.featureManager.unmount(unMountChildren);
      (_c = this.visualElement) == null ? void 0 : _c.unmount();
      this.clearAnimation();
    };
    unmountState();
  }
  unmountChild(child) {
    child.unmount(true);
  }
  // Called before updating, executes in parent-to-child order
  beforeUpdate(options) {
    this.featureManager.beforeUpdate(options);
  }
  // Update motion state with new options
  update(options) {
    this.updateOptions(options);
    this.featureManager.update();
    this.startAnimation();
  }
  // Set animation state active status and propagate to children
  setActive(name, isActive, isAnimate = true) {
    var _a;
    if (!this.element || this.activeStates[name] === isActive)
      return;
    this.activeStates[name] = isActive;
    (_a = this.visualElement.variantChildren) == null ? void 0 : _a.forEach((child) => {
      child.state.setActive(name, isActive, false);
    });
    if (isAnimate) {
      this.animateUpdates({
        isExit: name === "exit" && this.activeStates.exit
      });
    }
  }
  isMounted() {
    return Boolean(this.element);
  }
  getSnapshot(options, isPresent2, label) {
  }
  didUpdate(label) {
  }
}
function useMotionState(props) {
  var _a;
  const parentState = injectMotion(null);
  const layoutGroup = injectLayoutGroup({});
  const config = useMotionConfig();
  const animatePresenceContext = injectAnimatePresence({});
  const lazyMotionContext = useLazyMotionContext({
    features: vue.ref([]),
    strict: false
  });
  if (process.env.NODE_ENV !== "production" && ((_a = props.features) == null ? void 0 : _a.length) && lazyMotionContext.strict) {
    const strictMessage = "You have rendered a `motion` component within a `LazyMotion` component. This will break tree shaking. Import and render a `m` component instead.";
    props.ignoreStrict ? heyListen.warning(false, strictMessage) : heyListen.invariant(false, strictMessage);
  }
  const attrs = vue.useAttrs();
  function getLayoutId() {
    if (layoutGroup.id && props.layoutId)
      return `${layoutGroup.id}-${props.layoutId}`;
    return props.layoutId || void 0;
  }
  function getProps() {
    return {
      ...props,
      lazyMotionContext,
      layoutId: getLayoutId(),
      transition: props.transition ?? config.value.transition,
      layoutGroup,
      motionConfig: config.value,
      inViewOptions: props.inViewOptions ?? config.value.inViewOptions,
      animatePresenceContext,
      initial: animatePresenceContext.initial === false ? animatePresenceContext.initial : props.initial === true ? void 0 : props.initial
    };
  }
  function getMotionProps() {
    return {
      ...attrs,
      ...getProps()
    };
  }
  const state = new MotionState(
    getMotionProps(),
    parentState
  );
  provideMotion(state);
  function getAttrs() {
    var _a2;
    const isSVG = state.type === "svg";
    const attrsProps = { ...attrs };
    Object.keys(attrs).forEach((key) => {
      if (motionDom.isMotionValue(attrs[key]))
        attrsProps[key] = attrs[key].get();
    });
    let styleProps = {
      ...props.style,
      ...isSVG ? {} : ((_a2 = state.visualElement) == null ? void 0 : _a2.latestValues) || state.baseTarget
    };
    if (isSVG) {
      const { attrs: attrs2, style: style22 } = convertSvgStyleToAttributes({
        ...state.isMounted() ? state.target : state.baseTarget,
        ...styleProps
      });
      if (style22.transform || attrs2.transformOrigin) {
        style22.transformOrigin = attrs2.transformOrigin ?? "50% 50%";
        delete attrs2.transformOrigin;
      }
      if (style22.transform) {
        style22.transformBox = style22.transformBox ?? "fill-box";
        delete attrs2.transformBox;
      }
      Object.assign(attrsProps, attrs2);
      styleProps = style22;
    }
    if (props.drag && props.dragListener !== false) {
      Object.assign(styleProps, {
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        touchAction: props.drag === true ? "none" : `pan-${props.drag === "x" ? "y" : "x"}`
      });
    }
    const style2 = createStyles(styleProps);
    if (style2)
      attrsProps.style = style2;
    return attrsProps;
  }
  const instance = vue.getCurrentInstance().proxy;
  vue.onBeforeMount(() => {
    state.beforeMount();
  });
  vue.onMounted(() => {
    state.mount(getMotionElement(instance.$el), getMotionProps(), checkMotionIsHidden(instance));
  });
  vue.onBeforeUnmount(() => state.beforeUnmount());
  vue.onUnmounted(() => {
    const el = getMotionElement(instance.$el);
    if (!(el == null ? void 0 : el.isConnected)) {
      state.unmount();
    }
  });
  vue.onBeforeUpdate(() => {
    state.beforeUpdate(getMotionProps());
  });
  vue.onUpdated(() => {
    state.update(getMotionProps());
  });
  return {
    getProps,
    getAttrs,
    layoutGroup,
    state
  };
}
const MotionComponentProps = {
  "ignoreStrict": { type: Boolean },
  "forwardMotionProps": { type: Boolean, default: false },
  "asChild": { type: Boolean, default: false },
  "hover": { type: [String, Array, Object] },
  "press": { type: [String, Array, Object] },
  "inView": { type: [String, Array, Object] },
  "focus": { type: [String, Array, Object] },
  "whileDrag": { type: [String, Array, Object] },
  "whileHover": { type: [String, Array, Object], default: ({ hover }) => {
    if (process.env.NODE_ENV === "development" && hover) {
      heyListen.warning(true, "hover is deprecated. Use whileHover instead.");
    }
    return hover;
  } },
  "whilePress": { type: [String, Array, Object], default: ({ press }) => {
    if (process.env.NODE_ENV === "development" && press) {
      heyListen.warning(true, "press is deprecated. Use whilePress instead.");
    }
    return press;
  } },
  "whileInView": { type: [String, Array, Object], default: ({ inView: inView2 }) => {
    if (process.env.NODE_ENV === "development" && inView2) {
      heyListen.warning(true, "inView is deprecated. Use whileInView instead.");
    }
    return inView2;
  } },
  "whileFocus": { type: [String, Array, Object], default: ({ focus }) => {
    if (process.env.NODE_ENV === "development" && focus) {
      heyListen.warning(true, "focus is deprecated. Use whileFocus instead.");
    }
    return focus;
  } },
  "custom": { type: [String, Number, Object, Array] },
  "initial": { type: [String, Array, Object, Boolean], default: void 0 },
  "animate": { type: [String, Array, Object], default: void 0 },
  "exit": { type: [String, Array, Object] },
  "variants": { type: Object },
  "inherit": { type: Boolean },
  "style": { type: Object },
  "transformTemplate": { type: Function },
  "transition": { type: Object },
  "layoutGroup": { type: Object },
  "motionConfig": { type: Object },
  "onAnimationComplete": { type: Function },
  "onUpdate": { type: Function },
  "layout": { type: [Boolean, String], default: false },
  "layoutId": { type: String, default: void 0 },
  "layoutScroll": { type: Boolean, default: false },
  "layoutRoot": { type: Boolean, default: false },
  "data-framer-portal-id": { type: String },
  "crossfade": { type: Boolean, default: true },
  "layoutDependency": { type: null, default: void 0 },
  "onBeforeLayoutMeasure": { type: Function },
  "onLayoutMeasure": { type: Function },
  "onLayoutAnimationStart": { type: Function },
  "onLayoutAnimationComplete": { type: Function },
  "globalPressTarget": { type: Boolean },
  "onPressStart": { type: Function },
  "onPress": { type: Function },
  "onPressCancel": { type: Function },
  "onHoverStart": { type: Function },
  "onHoverEnd": { type: Function },
  "inViewOptions": { type: Object },
  "onViewportEnter": { type: Function },
  "onViewportLeave": { type: Function },
  "drag": { type: [Boolean, String] },
  "dragSnapToOrigin": { type: Boolean },
  "dragDirectionLock": { type: Boolean },
  "dragPropagation": { type: Boolean },
  "dragConstraints": { type: [Boolean, Object] },
  "dragElastic": { type: [Boolean, Number, Object], default: 0.5 },
  "dragMomentum": { type: Boolean, default: true },
  "dragTransition": { type: Object },
  "dragListener": { type: Boolean, default: true },
  "dragControls": { type: Object },
  "onDragStart": { type: Function },
  "onDragEnd": { type: Function },
  "onDrag": { type: Function },
  "onDirectionLock": { type: Function },
  "onDragTransitionEnd": { type: Function },
  "onMeasureDragConstraints": { type: Function },
  "onPanSessionStart": { type: Function },
  "onPanStart": { type: Function },
  "onPan": { type: Function },
  "onPanEnd": { type: Function }
};
function checkMotionIsHidden(instance) {
  var _a;
  const isHidden = ((_a = getMotionElement(instance.$el)) == null ? void 0 : _a.style.display) === "none";
  const hasTransition = instance.$.vnode.transition;
  return hasTransition && isHidden;
}
const componentMaxCache = /* @__PURE__ */ new Map();
const componentMiniCache = /* @__PURE__ */ new Map();
function renderSlotFragments(fragments) {
  if (!Array.isArray(fragments))
    return [fragments];
  const result = [];
  for (const item of fragments) {
    if (Array.isArray(item))
      result.push(...item);
    else
      result.push(item);
  }
  return result;
}
const SELF_CLOSING_TAGS = ["area", "img", "input"];
function handlePrimitiveAndSlot(asTag, allAttrs, slots) {
  var _a, _b;
  if (typeof asTag === "string" && SELF_CLOSING_TAGS.includes(asTag)) {
    return vue.h(asTag, allAttrs);
  }
  if (asTag === "template") {
    if (!slots.default)
      return null;
    const childrens = renderSlotFragments(slots.default());
    const firstNonCommentChildrenIndex = childrens.findIndex((child) => child.type !== vue.Comment);
    if (firstNonCommentChildrenIndex === -1)
      return childrens;
    const firstNonCommentChildren = childrens[firstNonCommentChildrenIndex];
    (_a = firstNonCommentChildren.props) == null ? true : delete _a.ref;
    const mergedProps = firstNonCommentChildren.props ? vue.mergeProps(allAttrs, firstNonCommentChildren.props) : allAttrs;
    if (allAttrs.class && ((_b = firstNonCommentChildren.props) == null ? void 0 : _b.class))
      delete firstNonCommentChildren.props.class;
    const cloned = vue.cloneVNode(firstNonCommentChildren, mergedProps);
    for (const prop in mergedProps) {
      if (prop.startsWith("on")) {
        cloned.props || (cloned.props = {});
        cloned.props[prop] = mergedProps[prop];
      }
    }
    if (childrens.length === 1)
      return cloned;
    childrens[firstNonCommentChildrenIndex] = cloned;
    return childrens;
  }
  return null;
}
function createMotionComponent(component, options = {}) {
  var _a;
  const isString = typeof component === "string";
  const name = isString ? component : component.name || "";
  const componentCache = ((_a = options.features) == null ? void 0 : _a.length) > 0 ? componentMaxCache : componentMiniCache;
  if (isString && (componentCache == null ? void 0 : componentCache.has(component))) {
    return componentCache.get(component);
  }
  const motionComponent = vue.defineComponent({
    inheritAttrs: false,
    props: {
      ...MotionComponentProps,
      features: {
        type: Object,
        default: () => options.features || []
      },
      as: { type: [String, Object], default: component || "div" }
    },
    name: name ? `motion.${name}` : "Motion",
    setup(props, { slots }) {
      const { getProps, getAttrs, state } = useMotionState(props);
      function onVnodeUpdated() {
        const el = state.element;
        const isComponent = typeof props.as === "object";
        if ((!isComponent || props.asChild) && el) {
          const { style: style2 } = getAttrs();
          if (style2) {
            for (const [key, val] of Object.entries(style2)) {
              el.style[key] = val;
            }
          }
        }
      }
      return () => {
        const motionProps = getProps();
        const motionAttrs = getAttrs();
        const asTag = props.asChild ? "template" : props.as;
        const allAttrs = {
          ...options.forwardMotionProps || props.forwardMotionProps ? motionProps : {},
          ...motionAttrs,
          onVnodeUpdated
        };
        const primitiveOrSlotResult = handlePrimitiveAndSlot(asTag, allAttrs, slots);
        if (primitiveOrSlotResult !== null) {
          return primitiveOrSlotResult;
        }
        return vue.h(asTag, {
          ...allAttrs
        }, slots);
      };
    }
  });
  if (isString) {
    componentCache == null ? void 0 : componentCache.set(component, motionComponent);
  }
  return motionComponent;
}
function createMotionComponentWithFeatures(features = []) {
  return new Proxy({}, {
    get(target, prop) {
      if (prop === "create") {
        return (component, options) => createMotionComponent(component, {
          ...options,
          features
        });
      }
      return createMotionComponent(prop, {
        features
      });
    }
  });
}
const motion = createMotionComponentWithFeatures(domMax);
const Motion = motion.create("div");
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
    const style2 = document.createElement("style");
    if (config.value.nonce) {
      style2.nonce = config.value.nonce;
    }
    styles.set(state, style2);
    document.head.appendChild(style2);
    if (style2.sheet) {
      style2.sheet.insertRule(`
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
    const style2 = styles.get(state);
    if (!style2)
      return;
    styles.delete(state);
    motionDom.frame.render(() => {
      document.head.removeChild(style2);
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
const _sfc_main$4 = /* @__PURE__ */ vue.defineComponent({
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
    vue.onUnmounted(() => {
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
    const transitionProps = vue.computed(() => {
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
      return vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.mode === "wait" ? vue.Transition : vue.TransitionGroup), vue.mergeProps({ css: false }, transitionProps.value, {
        appear: "",
        onLeave: exit,
        onEnter: enter
      }), {
        default: vue.withCtx(() => [
          vue.renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      }, 16);
    };
  }
});
const [useReorderContext, reorderContextProvider] = createContext("ReorderContext");
function compareMin(a, b) {
  return a.layout.min - b.layout.min;
}
function getValue(item) {
  return item.value;
}
function checkReorder(order2, value, offset, velocity) {
  if (!velocity)
    return order2;
  const index = order2.findIndex((item2) => item2.value === value);
  if (index === -1)
    return order2;
  const nextOffset = velocity > 0 ? 1 : -1;
  const nextItem = order2[index + nextOffset];
  if (!nextItem)
    return order2;
  const item = order2[index];
  const nextLayout = nextItem.layout;
  const nextItemCenter = motionDom.mixNumber(nextLayout.min, nextLayout.max, 0.5);
  if (nextOffset === 1 && item.layout.max + offset > nextItemCenter || nextOffset === -1 && item.layout.min + offset < nextItemCenter) {
    return moveItem(order2, index, index + nextOffset);
  }
  return order2;
}
function moveItem([...arr], fromIndex, toIndex) {
  const startIndex = fromIndex < 0 ? arr.length + fromIndex : fromIndex;
  if (startIndex >= 0 && startIndex < arr.length) {
    const endIndex = toIndex < 0 ? arr.length + toIndex : toIndex;
    const [item] = arr.splice(fromIndex, 1);
    arr.splice(endIndex, 0, item);
  }
  return arr;
}
function useDefaultMotionValue(value, defaultValue = 0) {
  return motionDom.isMotionValue(value) ? value : motionDom.motionValue(defaultValue);
}
const _sfc_main$3 = /* @__PURE__ */ vue.defineComponent({
  ...{
    name: "ReorderGroup",
    inheritAttrs: false
  },
  __name: "Group",
  props: {
    axis: { default: "y" },
    "onUpdate:values": {},
    values: {},
    as: { default: "ul" },
    asChild: { type: Boolean },
    hover: {},
    press: {},
    inView: {},
    focus: {},
    whileDrag: {},
    whileHover: {},
    whilePress: {},
    whileInView: {},
    whileFocus: {},
    forwardMotionProps: { type: Boolean },
    ignoreStrict: { type: Boolean },
    custom: {},
    initial: { type: [String, Array, Object, Boolean] },
    animate: {},
    exit: {},
    variants: {},
    inherit: { type: Boolean },
    style: {},
    transformTemplate: {},
    transition: {},
    onAnimationComplete: {},
    onUpdate: {},
    onAnimationStart: {},
    layout: { type: [Boolean, String] },
    layoutId: {},
    layoutScroll: { type: Boolean },
    layoutRoot: { type: Boolean },
    "data-framer-portal-id": {},
    crossfade: { type: Boolean },
    layoutDependency: {},
    onBeforeLayoutMeasure: {},
    onLayoutMeasure: {},
    onLayoutAnimationStart: {},
    onLayoutAnimationComplete: {},
    globalPressTarget: { type: Boolean },
    onPressStart: {},
    onPress: {},
    onPressCancel: {},
    onHoverStart: {},
    onHoverEnd: {},
    inViewOptions: {},
    onViewportEnter: {},
    onViewportLeave: {},
    drag: { type: [Boolean, String] },
    dragSnapToOrigin: { type: Boolean },
    dragDirectionLock: { type: Boolean },
    dragPropagation: { type: Boolean },
    dragConstraints: { type: [Boolean, Object] },
    dragElastic: { type: [Boolean, Number, Object] },
    dragMomentum: { type: Boolean },
    dragTransition: {},
    dragListener: { type: Boolean },
    dragControls: {},
    onDragStart: {},
    onDragEnd: {},
    onDrag: {},
    onDirectionLock: {},
    onDragTransitionEnd: {},
    onMeasureDragConstraints: {},
    onPanSessionStart: {},
    onPanStart: {},
    onPan: {},
    onPanEnd: {},
    onFocus: {},
    onBlur: {}
  },
  setup(__props) {
    const props = __props;
    const { axis } = vue.toRefs(props);
    let order2 = [];
    let isReordering = false;
    function warning() {
      heyListen.invariant(Boolean(props.values), "Reorder.Group must be provided a values prop");
    }
    vue.onUpdated(() => {
      isReordering = false;
    });
    vue.onBeforeUpdate(() => {
      order2 = [];
    });
    reorderContextProvider({
      axis,
      registerItem: (value, layout) => {
        const idx = order2.findIndex((entry) => value === entry.value);
        if (idx !== -1) {
          order2[idx].layout = layout[axis.value];
        } else {
          order2.push({ value, layout: layout[axis.value] });
        }
        order2.sort(compareMin);
      },
      updateOrder: (item, offset, velocity) => {
        var _a;
        if (isReordering)
          return;
        const newOrder = checkReorder(order2, item, offset, velocity);
        if (order2 !== newOrder) {
          isReordering = true;
          (_a = props["onUpdate:values"]) == null ? void 0 : _a.call(
            props,
            newOrder.map(getValue).filter((value) => props.values.includes(value))
          );
        }
      }
    });
    const attrs = vue.useAttrs();
    function bindProps() {
      const { axis: axis2, values, "onUpdate:values": onUpdateValues, ...rest } = props;
      return {
        ...attrs,
        ...rest
      };
    }
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.unref(Motion), vue.normalizeProps(vue.guardReactiveProps(bindProps())), {
        default: vue.withCtx(() => [
          vue.renderSlot(_ctx.$slots, "default"),
          vue.createTextVNode(" " + vue.toDisplayString(warning()), 1)
        ]),
        _: 3
      }, 16);
    };
  }
});
function useCombineMotionValues(combineValues) {
  const value = motionDom.motionValue(combineValues());
  const updateValue = () => value.set(combineValues());
  const scheduleUpdate = () => motionDom.frame.preRender(updateValue, false, true);
  let subscriptions;
  const subscribe = (values) => {
    subscriptions = values.map((v) => v.on("change", scheduleUpdate));
  };
  const unsubscribe = () => {
    subscriptions.forEach((unsubscribe2) => unsubscribe2());
    motionDom.cancelFrame(updateValue);
  };
  vue.onUnmounted(() => {
    unsubscribe();
  });
  return {
    subscribe,
    unsubscribe,
    value,
    updateValue
  };
}
function useComputed(computed) {
  motionDom.collectMotionValues.current = [];
  const { value, subscribe, unsubscribe, updateValue } = useCombineMotionValues(computed);
  subscribe(motionDom.collectMotionValues.current);
  motionDom.collectMotionValues.current = void 0;
  vue.watchEffect(() => {
    unsubscribe();
    motionDom.collectMotionValues.current = [];
    updateValue();
    subscribe(motionDom.collectMotionValues.current);
    motionDom.collectMotionValues.current = void 0;
  });
  return value;
}
function useTransform(input, inputRangeOrTransformer, outputRange, options) {
  if (typeof input === "function") {
    return useComputed(input);
  }
  const transformer = typeof inputRangeOrTransformer === "function" ? inputRangeOrTransformer : vue.isRef(inputRangeOrTransformer) ? vue.computed(() => motionDom.transform(inputRangeOrTransformer.value, outputRange, options)) : motionDom.transform(inputRangeOrTransformer, outputRange, options);
  return Array.isArray(input) ? useListTransform(
    input,
    transformer
  ) : useListTransform([input], ([latest]) => {
    if (vue.isRef(transformer)) {
      return transformer.value(latest);
    }
    return transformer(latest);
  });
}
function useListTransform(values, transformer) {
  const latest = [];
  const { value, subscribe } = useCombineMotionValues(() => {
    latest.length = 0;
    const numValues = values.length;
    for (let i = 0; i < numValues; i++) {
      latest[i] = values[i].get();
    }
    return vue.isRef(transformer) ? transformer.value(latest) : transformer(latest);
  });
  subscribe(values);
  return value;
}
function useTime() {
  const time = motionDom.motionValue(0);
  useAnimationFrame((t) => time.set(t));
  return time;
}
function useMotionTemplate(fragments, ...values) {
  const numFragments = fragments.length;
  function buildValue() {
    let output = "";
    for (let i = 0; i < numFragments; i++) {
      output += fragments[i];
      const value2 = values[i];
      if (value2) {
        output += motionDom.isMotionValue(value2) ? value2.get() : value2;
      }
    }
    return output;
  }
  const { value, subscribe } = useCombineMotionValues(buildValue);
  subscribe(values.filter(motionDom.isMotionValue));
  return value;
}
function useMotionValueEvent(value, event, callback) {
  const unlisten = value.on(event, callback);
  vue.onUnmounted(() => {
    unlisten();
  });
  return unlisten;
}
function toNumber(v) {
  if (typeof v === "number")
    return v;
  return parseFloat(v);
}
function useSpring(source, config = {}) {
  let activeSpringAnimation = null;
  const value = motionDom.motionValue(
    motionDom.isMotionValue(source) ? toNumber(source.get()) : source
  );
  let latestValue = value.get();
  let latestSetter = () => {
  };
  const stopAnimation2 = () => {
    if (activeSpringAnimation) {
      activeSpringAnimation.stop();
      activeSpringAnimation = null;
    }
  };
  const startAnimation = () => {
    const animation = activeSpringAnimation;
    if ((animation == null ? void 0 : animation.time) === 0) {
      animation.sample(motionDom.frameData.delta);
    }
    stopAnimation2();
    const springConfig = vue.isRef(config) ? config.value : config;
    activeSpringAnimation = motionDom.animateValue({
      keyframes: [value.get(), latestValue],
      velocity: value.getVelocity(),
      type: "spring",
      restDelta: 1e-3,
      restSpeed: 0.01,
      ...springConfig,
      onUpdate: latestSetter
    });
  };
  vue.watch(() => {
    if (vue.isRef(config)) {
      return config.value;
    }
    return config;
  }, () => {
    value.attach((v, set) => {
      latestValue = v;
      latestSetter = set;
      motionDom.frame.update(startAnimation);
      return value.get();
    }, stopAnimation2);
  }, { immediate: true });
  if (motionDom.isMotionValue(source)) {
    source.on("change", (v) => {
      value.set(toNumber(v));
    });
  }
  return value;
}
const isSSR = typeof window === "undefined";
function createScrollMotionValues() {
  return {
    scrollX: motionDom.motionValue(0),
    scrollY: motionDom.motionValue(0),
    scrollXProgress: motionDom.motionValue(0),
    scrollYProgress: motionDom.motionValue(0)
  };
}
function useScroll(scrollOptions = {}) {
  const values = createScrollMotionValues();
  vue.watchEffect((onCleanup) => {
    if (isSSR) {
      return;
    }
    const cleanup = scroll(
      (_progress, { x, y }) => {
        values.scrollX.set(x.current);
        values.scrollXProgress.set(x.progress);
        values.scrollY.set(y.current);
        values.scrollYProgress.set(y.progress);
      },
      {
        offset: vue.unref(scrollOptions.offset),
        axis: vue.unref(scrollOptions.axis),
        container: getElement(scrollOptions.container),
        target: getElement(scrollOptions.target)
      }
    );
    onCleanup(() => {
      cleanup();
    });
  }, {
    flush: "post"
  });
  return values;
}
function useVelocity(value) {
  const velocity = motionDom.motionValue(value.getVelocity());
  const updateVelocity = () => {
    const latest = value.getVelocity();
    velocity.set(latest);
    if (latest) {
      motionDom.frame.update(updateVelocity);
    }
  };
  useMotionValueEvent(value, "change", () => {
    motionDom.frame.update(updateVelocity, false, true);
  });
  return velocity;
}
const _sfc_main$2 = /* @__PURE__ */ vue.defineComponent({
  ...{
    name: "ReorderItem",
    inheritAttrs: false
  },
  __name: "Item",
  props: {
    value: {},
    layout: { type: [Boolean, String], default: true },
    as: { default: "li" },
    asChild: { type: Boolean },
    hover: { default: void 0 },
    press: {},
    inView: { default: void 0 },
    focus: {},
    whileDrag: { default: void 0 },
    whileHover: {},
    whilePress: {},
    whileInView: {},
    whileFocus: {},
    forwardMotionProps: { type: Boolean },
    ignoreStrict: { type: Boolean },
    custom: {},
    initial: { type: [String, Array, Object, Boolean], default: void 0 },
    animate: { default: void 0 },
    exit: {},
    variants: {},
    inherit: { type: Boolean },
    style: {},
    transformTemplate: {},
    transition: {},
    onAnimationComplete: {},
    onUpdate: {},
    onAnimationStart: {},
    layoutId: { default: void 0 },
    layoutScroll: { type: Boolean, default: false },
    layoutRoot: { type: Boolean, default: false },
    "data-framer-portal-id": {},
    crossfade: { type: Boolean, default: true },
    layoutDependency: {},
    onBeforeLayoutMeasure: {},
    onLayoutMeasure: {},
    onLayoutAnimationStart: {},
    onLayoutAnimationComplete: {},
    globalPressTarget: { type: Boolean },
    onPressStart: {},
    onPress: {},
    onPressCancel: {},
    onHoverStart: {},
    onHoverEnd: {},
    inViewOptions: {},
    onViewportEnter: {},
    onViewportLeave: {},
    drag: { type: [Boolean, String] },
    dragSnapToOrigin: { type: Boolean },
    dragDirectionLock: { type: Boolean },
    dragPropagation: { type: Boolean },
    dragConstraints: { type: [Boolean, Object] },
    dragElastic: { type: [Boolean, Number, Object], default: 0.5 },
    dragMomentum: { type: Boolean, default: true },
    dragTransition: {},
    dragListener: { type: Boolean, default: true },
    dragControls: {},
    onDragStart: {},
    onDragEnd: {},
    onDrag: {},
    onDirectionLock: {},
    onDragTransitionEnd: {},
    onMeasureDragConstraints: {},
    onPanSessionStart: {},
    onPanStart: {},
    onPan: {},
    onPanEnd: {},
    onFocus: {},
    onBlur: {}
  },
  setup(__props) {
    var _a, _b;
    const props = __props;
    const { style: style2 } = vue.toRefs(props);
    const context = useReorderContext(null);
    const point2 = {
      x: useDefaultMotionValue((_a = style2.value) == null ? void 0 : _a.x),
      y: useDefaultMotionValue((_b = style2.value) == null ? void 0 : _b.y)
    };
    const zIndex = useTransform([point2.x, point2.y], ([latestX, latestY]) => latestX || latestY ? 1 : "unset");
    function warning() {
      heyListen.invariant(Boolean(context), "Reorder.Item must be a child of Reorder.Group");
    }
    const { axis, registerItem, updateOrder } = context || {};
    const attrs = vue.useAttrs();
    function bindProps() {
      const { value, ...rest } = props;
      return {
        ...attrs,
        ...rest,
        style: {
          ...style2.value,
          x: point2.x,
          y: point2.y,
          zIndex
        }
      };
    }
    const drag = vue.computed(() => {
      if (props.drag) {
        return props.drag;
      }
      return axis.value;
    });
    const isDragging = vue.ref(false);
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.unref(Motion), vue.mergeProps(bindProps(), {
        drag: drag.value,
        "drag-snap-to-origin": true,
        onDrag: _cache[0] || (_cache[0] = (event, gesturePoint) => {
          const { velocity } = gesturePoint;
          velocity[vue.unref(axis)] && vue.unref(updateOrder)(_ctx.value, point2[vue.unref(axis)].get(), velocity[vue.unref(axis)]);
          !isDragging.value && (isDragging.value = true);
          _ctx.onDrag && _ctx.onDrag(event, gesturePoint);
        }),
        onDragEnd: _cache[1] || (_cache[1] = (event, gesturePoint) => {
          isDragging.value = false;
          _ctx.onDragEnd && _ctx.onDragEnd(event, gesturePoint);
        }),
        onLayoutMeasure: _cache[2] || (_cache[2] = (measured) => vue.unref(registerItem)(_ctx.value, measured))
      }), {
        default: vue.withCtx(() => [
          vue.renderSlot(_ctx.$slots, "default", { isDragging: isDragging.value }),
          vue.createTextVNode(" " + vue.toDisplayString(warning()), 1)
        ]),
        _: 3
      }, 16, ["drag"]);
    };
  }
});
const ReorderGroup = _sfc_main$3;
const ReorderItem = _sfc_main$2;
const Reorder = {
  Group: _sfc_main$3,
  Item: _sfc_main$2
};
const _sfc_main$1 = /* @__PURE__ */ vue.defineComponent({
  __name: "RowValue",
  props: {
    value: {}
  },
  setup(__props) {
    const props = __props;
    const instance = vue.getCurrentInstance().proxy;
    vue.watchEffect((cleanup) => {
      const unSub = props.value.on("change", (value) => {
        if (instance.$el) {
          instance.$el.textContent = value;
        }
      });
      cleanup(unSub);
    });
    return (_ctx, _cache) => {
      return vue.toDisplayString(_ctx.value.get());
    };
  }
});
const LazyMotion = vue.defineComponent({
  name: "LazyMotion",
  inheritAttrs: false,
  props: {
    features: {
      type: [Object, Function],
      default: () => []
    },
    strict: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { slots }) {
    const features = vue.ref(Array.isArray(props.features) ? props.features : []);
    if (!Array.isArray(props.features)) {
      const featuresPromise = typeof props.features === "function" ? props.features() : props.features;
      featuresPromise.then((feats) => {
        features.value = feats;
      });
    }
    lazyMotionContextProvider({
      features,
      strict: props.strict
    });
    return () => {
      var _a;
      return (_a = slots.default) == null ? void 0 : _a.call(slots);
    };
  }
});
const m = createMotionComponentWithFeatures();
const M = m.create("div");
function useForceUpdate() {
  const key = vue.ref(0);
  function forceUpdate() {
    key.value++;
  }
  return [forceUpdate, key];
}
function notify(node) {
  return !node.isLayoutDirty && node.willUpdate(false);
}
function nodeGroup() {
  const nodes = /* @__PURE__ */ new Set();
  const subscriptions = /* @__PURE__ */ new WeakMap();
  const dirtyAll = (node) => {
    nodes.forEach(notify);
  };
  return {
    add: (node) => {
      nodes.add(node);
      subscriptions.set(
        node,
        node.addEventListener("willUpdate", () => dirtyAll())
      );
    },
    remove: (node) => {
      nodes.delete(node);
      const unsubscribe = subscriptions.get(node);
      if (unsubscribe) {
        unsubscribe();
        subscriptions.delete(node);
      }
    },
    dirty: dirtyAll
  };
}
function useLayoutGroupProvider(props) {
  const parentGroup = injectLayoutGroup(null);
  const [forceRender, key] = useForceUpdate();
  const context = {
    id: getGroupId(props, parentGroup),
    group: getGroup(props, parentGroup),
    forceRender,
    key
  };
  provideLayoutGroup(context);
  return context;
}
function useLayoutGroup() {
  const { forceRender } = injectLayoutGroup({ forceRender: () => {
  } });
  return { forceRender };
}
function getGroupId(props, parentGroup) {
  const shouldInherit = props.inherit === true || props.inherit === "id";
  const parentId = parentGroup == null ? void 0 : parentGroup.id;
  if (shouldInherit && parentId) {
    return props.id ? `${parentId}-${props.id}` : parentId;
  }
  return props.id;
}
function getGroup(props, parentGroup) {
  const shouldInherit = props.inherit === true || props.inherit === "group";
  return shouldInherit ? (parentGroup == null ? void 0 : parentGroup.group) || nodeGroup() : nodeGroup();
}
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  __name: "LayoutGroup",
  props: {
    id: {},
    inherit: { type: [Boolean, String], default: true }
  },
  setup(__props) {
    const props = __props;
    const { forceRender, key } = useLayoutGroupProvider(props);
    return (_ctx, _cache) => {
      return vue.renderSlot(_ctx.$slots, "default", {
        renderKey: vue.unref(key),
        forceRender: vue.unref(forceRender)
      });
    };
  }
});
function useAnimate() {
  const dom = vue.ref(null);
  const domProxy = new Proxy(dom, {
    get(target, key) {
      if (typeof key === "string" || typeof key === "symbol") {
        if (key === "current")
          return Reflect.get(target, "value");
        return Reflect.get(target, key);
      }
      return void 0;
    },
    set(target, key, value) {
      if (key === "value")
        return Reflect.set(target, key, (value == null ? void 0 : value.$el) || value);
      if (key === "animations")
        return Reflect.set(target, key, value);
      return true;
    }
  });
  domProxy.animations = [];
  const animate2 = createScopedAnimate(domProxy);
  vue.onUnmounted(() => {
    domProxy.animations.forEach((animation) => animation.stop());
  });
  return [domProxy, animate2];
}
function stopAnimation(visualElement) {
  visualElement.values.forEach((value) => value.stop());
}
function setStateTarget(state, definition) {
  const resolvedVariant = resolveVariant(definition, state.options.variants, state.options.custom);
  Object.entries(resolvedVariant).forEach(([key, value]) => {
    if (key === "transition")
      return;
    state.target[key] = value;
  });
}
function animationControls() {
  let hasMounted = false;
  const subscribers = /* @__PURE__ */ new Set();
  const controls = {
    subscribe(state) {
      subscribers.add(state);
      return () => void subscribers.delete(state);
    },
    start(definition, transitionOverride) {
      heyListen.invariant(
        hasMounted,
        "controls.start() should only be called after a component has mounted. Consider calling within a useEffect hook."
      );
      const animations = [];
      subscribers.forEach((state) => {
        animations.push(
          state.animateUpdates({
            directAnimate: definition,
            directTransition: transitionOverride
          })
        );
      });
      return Promise.all(animations);
    },
    set(definition) {
      heyListen.invariant(
        hasMounted,
        "controls.set() should only be called after a component has mounted. Consider calling within a useEffect hook."
      );
      return subscribers.forEach((state) => {
        setValues(state, definition);
      });
    },
    stop() {
      subscribers.forEach((state) => {
        stopAnimation(state.visualElement);
      });
    },
    mount() {
      hasMounted = true;
      return () => {
        hasMounted = false;
        controls.stop();
      };
    }
  };
  return controls;
}
function setValues(state, definition) {
  if (typeof definition === "string") {
    return setVariants(state, [definition]);
  } else if (Array.isArray(definition)) {
    return setVariants(state, definition);
  } else {
    setStateTarget(state, definition);
    setTarget(state.visualElement, definition);
  }
}
function setVariants(state, variantLabels) {
  const reversedLabels = [...variantLabels].reverse();
  const visualElement = state.visualElement;
  reversedLabels.forEach((key) => {
    const variant = visualElement.getVariant(key);
    variant && setTarget(visualElement, variant);
    setStateTarget(state, variant);
    if (visualElement.variantChildren) {
      visualElement.variantChildren.forEach((child) => {
        setVariants(mountedStates.get(child.current), variantLabels);
      });
    }
  });
}
function useAnimationControls() {
  const controls = animationControls();
  let unmount;
  vue.onMounted(() => {
    unmount = controls.mount();
  });
  vue.onUnmounted(() => {
    unmount();
  });
  return controls;
}
function useReducedMotion(options = {}) {
  const reducedMotion = core.useMediaQuery("(prefers-reduced-motion: reduce)", options);
  return vue.computed(() => reducedMotion.value);
}
class DragControls {
  constructor() {
    this.componentControls = /* @__PURE__ */ new Set();
  }
  /**
   * Subscribe a component's internal `VisualElementDragControls` to the user-facing API.
   *
   * @internal
   */
  subscribe(controls) {
    this.componentControls.add(controls);
    return () => this.componentControls.delete(controls);
  }
  /**
   * Start a drag gesture on every `motion` component that has this set of drag controls
   * passed into it via the `dragControls` prop.
   *
   * ```jsx
   * dragControls.start(e, {
   *   snapToCursor: true
   * })
   * ```
   *
   * @param event - PointerEvent
   * @param options - Options
   *
   * @public
   */
  start(event, options) {
    this.componentControls.forEach((controls) => {
      controls.start(
        event,
        options
      );
    });
  }
}
const createDragControls = () => new DragControls();
const useDragControls = createDragControls;
Object.defineProperty(exports, "useMotionValue", {
  enumerable: true,
  get: () => motionDom.motionValue
});
exports.AnimatePresence = _sfc_main$4;
exports.LayoutGroup = _sfc_main;
exports.LazyMotion = LazyMotion;
exports.M = M;
exports.Motion = Motion;
exports.MotionConfig = _sfc_main$5;
exports.MotionGlobalConfig = MotionGlobalConfig;
exports.Reorder = Reorder;
exports.ReorderGroup = ReorderGroup;
exports.ReorderItem = ReorderItem;
exports.RowValue = _sfc_main$1;
exports.SubscriptionManager = SubscriptionManager;
exports.addScaleCorrector = addScaleCorrector;
exports.addUniqueItem = addUniqueItem;
exports.animate = animate;
exports.animateMini = animateMini;
exports.anticipate = anticipate;
exports.backIn = backIn;
exports.backInOut = backInOut;
exports.backOut = backOut;
exports.circIn = circIn;
exports.circInOut = circInOut;
exports.circOut = circOut;
exports.clamp = clamp;
exports.createContext = createContext;
exports.createScopedAnimate = createScopedAnimate;
exports.cubicBezier = cubicBezier;
exports.delay = delayInSeconds;
exports.delayInMs = delay;
exports.distance = distance;
exports.distance2D = distance2D;
exports.domAnimation = domAnimation;
exports.domMax = domMax;
exports.easeIn = easeIn;
exports.easeInOut = easeInOut;
exports.easeOut = easeOut;
exports.easingDefinitionToFunction = easingDefinitionToFunction;
exports.getContextWindow = getContextWindow;
exports.getEasingForSegment = getEasingForSegment;
exports.hasWarned = hasWarned;
exports.inView = inView;
exports.injectLayoutGroup = injectLayoutGroup;
exports.injectMotion = injectMotion;
exports.isBezierDefinition = isBezierDefinition;
exports.isEasingArray = isEasingArray;
exports.isNumericalString = isNumericalString;
exports.isObject = isObject;
exports.isZeroValueString = isZeroValueString;
exports.m = m;
exports.memo = memo;
exports.millisecondsToSeconds = millisecondsToSeconds;
exports.mirrorEasing = mirrorEasing;
exports.motion = motion;
exports.mountedStates = mountedStates;
exports.moveItem = moveItem$1;
exports.noop = noop;
exports.pipe = pipe;
exports.progress = progress;
exports.provideLayoutGroup = provideLayoutGroup;
exports.provideMotion = provideMotion;
exports.provideMotionConfig = provideMotionConfig;
exports.removeItem = removeItem;
exports.reverseEasing = reverseEasing;
exports.scroll = scroll;
exports.scrollInfo = scrollInfo;
exports.secondsToMilliseconds = secondsToMilliseconds;
exports.steps = steps;
exports.useAnimate = useAnimate;
exports.useAnimationControls = useAnimationControls;
exports.useAnimationFrame = useAnimationFrame;
exports.useCombineMotionValues = useCombineMotionValues;
exports.useComputed = useComputed;
exports.useDomRef = useDomRef;
exports.useDragControls = useDragControls;
exports.useInView = useInView;
exports.useLayoutGroup = useLayoutGroup;
exports.useMotionConfig = useMotionConfig;
exports.useMotionTemplate = useMotionTemplate;
exports.useMotionValueEvent = useMotionValueEvent;
exports.usePageInView = usePageInView;
exports.useReducedMotion = useReducedMotion;
exports.useScroll = useScroll;
exports.useSpring = useSpring;
exports.useTime = useTime;
exports.useTransform = useTransform;
exports.useVelocity = useVelocity;
exports.velocityPerSecond = velocityPerSecond;
exports.warnOnce = warnOnce;
exports.wrap = wrap;
Object.keys(motionDom).forEach((k) => {
  if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
    enumerable: true,
    get: () => motionDom[k]
  });
});
