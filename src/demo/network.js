// src/demo/network.js
// The offline demo never needs the network (F6). Its deck source reads a
// bundled fixture, so nothing in the demo should call fetch at all; this
// guard turns any request that slips in anyway into a loud, local failure
// instead of a call to a backend or a model provider.

export const OFFLINE_MESSAGE = "The Flashcard Maker demo is offline: no network requests are made.";

export function blockNetwork(target = globalThis, log = console) {
  const refuse = (what) => {
    log?.error?.(`[demo] blocked ${what}`);
    return new TypeError(OFFLINE_MESSAGE);
  };
  target.fetch = (input) => Promise.reject(refuse(`fetch ${typeof input === "string" ? input : input?.url ?? ""}`));
  if (typeof target.XMLHttpRequest === "function") {
    target.XMLHttpRequest = function BlockedXMLHttpRequest() {
      throw refuse("XMLHttpRequest");
    };
  }
  return target;
}
