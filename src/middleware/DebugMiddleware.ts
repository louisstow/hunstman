import { Middleware } from "../Middleware";
import { Request } from "../Request";
import { QueueItem } from "../Queue";
import { Spider } from "../Spider";

class DebugMiddleware extends Middleware {
  processRequest(r: Request, spider: Spider): Promise<Request> {
    spider.logger.debug(`Requesting ${r.url}`);
    return Promise.resolve(r);
  }

  processResponse(item: QueueItem, spider: Spider): boolean {
    const req = item.request;
    const resp = req.response;
    let status: string = "UNK";

    if (resp) {
      status = String(resp.status);
    } else if (req.error && req.error.code) {
      status = req.error.code;
    }

    spider.logger.debug(`${status} from ${item.request.url}`);
    return true;
  }
}

export { DebugMiddleware };
