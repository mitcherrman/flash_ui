// src/ui/notifyStore.js
// Pure queue behind notify() on web (no React Native imports; unit-tested).
// One dialog is shown at a time, in FIFO order.

let seq = 0;
let queue = [];
const listeners = new Set();

function emit() {
  const snapshot = queue.slice();
  listeners.forEach((fn) => fn(snapshot));
}

/** Normalise Alert.alert-style arguments into a dialog record. */
export function makeDialog(title, message, buttons) {
  const list = Array.isArray(buttons) && buttons.length ? buttons : [{ text: "OK" }];
  return {
    id: ++seq,
    title: title == null ? "" : String(title),
    message: message == null ? "" : String(message),
    buttons: list.map((b) => ({
      text: b?.text ? String(b.text) : "OK",
      style: b?.style === "cancel" || b?.style === "destructive" ? b.style : "default",
      onPress: typeof b?.onPress === "function" ? b.onPress : null,
    })),
  };
}

export function enqueue(dialog) {
  queue = [...queue, dialog];
  emit();
  return dialog.id;
}

/** Remove a dialog; runs the chosen button's onPress after removal. */
export function resolveDialog(id, buttonIndex = null) {
  const d = queue.find((x) => x.id === id);
  if (!d) return;
  queue = queue.filter((x) => x.id !== id);
  emit();
  const btn = buttonIndex == null ? null : d.buttons[buttonIndex];
  if (btn?.onPress) {
    try {
      btn.onPress();
    } catch (e) {
      console.error("[notify] button handler failed", e);
    }
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(queue.slice());
  return () => listeners.delete(fn);
}

export function _resetForTests() {
  queue = [];
  seq = 0;
  listeners.clear();
}
