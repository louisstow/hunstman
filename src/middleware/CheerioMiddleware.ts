import { Middleware } from "../Middleware";
import { QueueItem } from "../Queue";

import cheerio from "cheerio";

class CheerioMiddleware extends Middleware {
  processResponse(item: QueueItem): boolean {
    const resp = item.request.response;
    if (resp && resp.headers?.["content-type"]?.includes("text/html")) {
      resp.data = cheerio.load(resp.data);
    }

    return true;
  }
}

export { CheerioMiddleware };
