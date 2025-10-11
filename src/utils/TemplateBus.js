// src/utils/TemplateBus.js
// super tiny event bus just for opening the Template modal

const listeners = new Set();

/** Subscribe to "open template" requests. Returns an unsubscribe fn. */
export function onTemplateOpen(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Ask any mounted TemplateBar to open its modal. */
export function requestTemplateOpen() {
  // copy to array in case a listener unsubscribes while iterating
  [...listeners].forEach((fn) => {
    try { fn(); } catch (e) {}
  });
}
