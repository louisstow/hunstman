import { Middleware } from "../Middleware";
import { QueueItem } from "../Queue";

import cheerio from "cheerio";

class CheerioMiddleware extends Middleware {
  isXML: boolean = false;

  constructor(options: { isXML: boolean }) {
    super();
    this.isXML = options.isXML || false;
  }

  processResponse(item: QueueItem) {
    const resp = item.request.response;
    if (resp) {
      resp.data = cheerio.load(resp.raw, {
        xmlMode: this.isXML,
      });
    }

    return Promise.resolve(true);
  }
}

export { CheerioMiddleware };
