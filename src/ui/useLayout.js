// src/ui/useLayout.js
// Window-size facts shared by layout primitives. F4 extends this (tablet /
// desktop study layouts) rather than adding a parallel hook.
import { Platform, useWindowDimensions } from "react-native";
import { getBreakpoint, getLayoutClass, resolveGutter } from "../theme";

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const breakpoint = getBreakpoint(width);
  return {
    width,
    height,
    breakpoint,
    // "phone" | "short" | "tablet" | "desktop": geometry only, never hover (F4)
    layoutClass: getLayoutClass(width, height),
    isPhone: breakpoint === "phone",
    isDesktop: breakpoint === "desktop",
    isLandscape: width > height,
    isWeb: Platform.OS === "web",
    gutter: resolveGutter(width),
  };
}
