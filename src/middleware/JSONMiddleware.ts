import { Middleware } from "../Middleware";
import { QueueItem } from "Queue";

class JSONMiddleware extends Middleware {
  processResponse(item: QueueItem): boolean {
    const resp = item.request.response;
    if (resp && item.request.headers["content-type"].includes("/json")) {
      try {
        resp.data = JSON.parse(resp.data);
      } catch (err) {
        return false;
      }
    }

    return true;
  }
}

export { JSONMiddleware };
