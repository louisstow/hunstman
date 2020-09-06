import { Middleware } from "../Middleware";
import { QueueItem } from "../Queue";

import cheerio from "cheerio";

class CheerioMiddleware extends Middleware {
  processResponse(item: QueueItem): boolean {
    const resp = item.request.response;
    if (resp) {
      resp.data = cheerio.load(resp.raw);
    }

    return true;
  }
}

export { CheerioMiddleware };
