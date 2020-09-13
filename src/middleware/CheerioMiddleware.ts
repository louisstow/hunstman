import { Middleware } from "../Middleware";
import { QueueItem } from "../Queue";

import cheerio from "cheerio";

class CheerioMiddleware extends Middleware {
  processResponse(item: QueueItem) {
    const resp = item.request.response;
    if (resp) {
      resp.data = cheerio.load(resp.raw);
    }

    return Promise.resolve(true);
  }
}

export { CheerioMiddleware };
