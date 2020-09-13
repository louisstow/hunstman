import { Middleware } from "../Middleware";
import { QueueItem } from "../Queue";

class JSONMiddleware extends Middleware {
  requireContentType: boolean = true;

  constructor(requireContentType?: boolean) {
    super();
    if (requireContentType !== undefined) {
      this.requireContentType = requireContentType;
    }
  }

  processResponse(item: QueueItem) {
    const resp = item.request.response;
    if (resp) {
      if (
        this.requireContentType &&
        !resp.headers?.["content-type"]?.includes("json")
      ) {
        return Promise.resolve(true);
      }

      try {
        resp.data = JSON.parse(resp.raw);
      } catch (err) {
        return Promise.resolve(false);
      }
    }

    return Promise.resolve(true);
  }
}

export { JSONMiddleware };
