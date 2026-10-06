// src/ui/index.js — shared UI primitives (F1 visual foundation)
export { default as Button, IconButton } from "./Button";
export { default as Surface } from "./Surface";
export { default as Screen } from "./Screen";
export { default as PageHeader } from "./PageHeader";
export { default as Notice } from "./Notice";
export { default as StatusView } from "./StatusView";
export { default as Chip, ChipGroup } from "./Chip";
export { default as Badge, MetaLabel } from "./Badge";
export { default as TextField } from "./TextField";
export { default as BrandMark, CardStackGlyph, ProductSteps } from "./BrandMark";
export { default as NotifyHost } from "./NotifyHost";
export { notify } from "./notify";
export { FadeIn, useReducedMotion, useMotionDuration, USE_NATIVE_DRIVER } from "./motion";
export { useLayout } from "./useLayout";
export { installWebGlobalStyles } from "./webGlobalStyles";
