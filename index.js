// index.js – entry point
import { registerRootComponent } from "expo";

// The offline portfolio demo is a separate web build, made with
// EXPO_PUBLIC_FLASH_DEMO=1 at bundle time (npm run export:demo). Without it —
// every normal start, export and native build — this is the app, talking to
// the real backend. The comparison is inlined and constant-folded at build
// time, so a normal bundle doesn't contain the demo or its fixture.
const Root =
  process.env.EXPO_PUBLIC_FLASH_DEMO === "1"
    ? require("./src/demo/DemoApp").default
    : require("./App").default;

registerRootComponent(Root);
