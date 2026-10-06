// src/ui/motion.js
// Motion primitives: reduced-motion awareness + a restrained entrance.
//
// useReducedMotion() reflects the OS setting on iOS/Android and
// `prefers-reduced-motion` on web. Any animation added to the app should use
// it to fall back to an instant change.
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Platform } from "react-native";
import { easing, motion } from "../theme";

// One shared subscription; every hook instance reads the same value.
let current = false;
const subscribers = new Set();
let started = false;

function setCurrent(v) {
  const next = !!v;
  if (next === current) return;
  current = next;
  subscribers.forEach((fn) => fn(next));
}

function start() {
  if (started) return;
  started = true;
  AccessibilityInfo.isReduceMotionEnabled?.()
    .then(setCurrent)
    .catch(() => {});
  // Native passes a boolean; react-native-web passes the MediaQueryList event.
  AccessibilityInfo.addEventListener?.("reduceMotionChanged", (e) =>
    setCurrent(typeof e === "boolean" ? e : e?.matches)
  );
}

export function useReducedMotion() {
  const [reduce, setReduce] = useState(current);
  useEffect(() => {
    start();
    subscribers.add(setReduce);
    setReduce(current);
    return () => subscribers.delete(setReduce);
  }, []);
  return reduce;
}

/** Duration helper: 0 when the user prefers reduced motion. */
export function useMotionDuration(name = "standard") {
  const reduce = useReducedMotion();
  return reduce ? 0 : motion.duration[name] ?? motion.duration.standard;
}

// Animated's native driver is unavailable on web (it warns and falls back).
export const USE_NATIVE_DRIVER = Platform.OS !== "web";

/**
 * Panel entrance: short fade + 8px rise. Instant under reduced motion.
 */
export function FadeIn({ children, style, delay = 0, offset = 8, ...rest }) {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) {
      v.setValue(1);
      return undefined;
    }
    const anim = Animated.timing(v, {
      toValue: 1,
      duration: motion.duration.standard,
      delay,
      easing: easing.standard,
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    anim.start();
    return () => anim.stop();
  }, [reduce]);

  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]} {...rest}>
      {children}
    </Animated.View>
  );
}
