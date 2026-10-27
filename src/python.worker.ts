import type { ToWorker } from "./python-messages";
import { createSession } from "./python-session";

const session = createSession((message) => self.postMessage(message));

// Handle messages one at a time. Booting is async, so without this a case
// load sent right after boot would start before Python exists.
let queue = Promise.resolve();

self.onmessage = (event: MessageEvent<ToWorker>) => {
  // The catch keeps one failed message from silently blocking every later one.
  queue = queue.then(() => session.handle(event.data)).catch((err) => console.error(err));
};
