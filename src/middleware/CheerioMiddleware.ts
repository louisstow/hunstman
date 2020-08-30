import { Middleware } from "../Middleware";
import { QueueItem } from "Queue";

import cheerio from "cheerio";

class CheerioMiddleware extends Middleware {
  processResponse(item: QueueItem): boolean {
    const resp = item.request.response;
    if (resp && item.request.headers["content-type"].includes("text/html")) {
      const $ = cheerio.load(resp.data);
      resp.data = $;
    }

    return true;
  }
}

export { CheerioMiddleware };
