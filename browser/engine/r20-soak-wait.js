"use strict";

// The predicate is evaluated in Chromium, not in Node. Every parameter it
// needs must be passed through Playwright's serializable argument object.
function waitForNativeTicks(page, epoch, tick, requiredTicks, timeoutMs) {
  if (![epoch,tick,requiredTicks,timeoutMs].every(Number.isSafeInteger) ||
      epoch < 1 || tick < 0 || requiredTicks < 1 || timeoutMs < 1)
    throw new RangeError("Invalid native soak tick-wait parameters");
  return page.waitForFunction(({epoch,tick,requiredTicks}) => {
    const snapshot = WCRTS.latest();
    return snapshot?.epoch === epoch && snapshot.tick >= tick + requiredTicks;
  }, {epoch,tick,requiredTicks}, {timeout:timeoutMs});
}

module.exports = {waitForNativeTicks};
