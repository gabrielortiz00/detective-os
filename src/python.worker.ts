import type { ToWorker } from "./python-messages";
import { createSession } from "./python-session";

const session = createSession((message) => self.postMessage(message));

self.onmessage = (event: MessageEvent<ToWorker>) => {
  void session.handle(event.data);
};
