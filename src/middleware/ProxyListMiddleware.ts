import { Middleware } from "../Middleware";
import { Request } from "../Request";
import { QueueItem } from "../Queue";
import { Spider } from "../Spider";

class ProxyListMiddleware extends Middleware {
  proxyList: string[];
  rotateProxyCodes: number[] = [400, 403, 429];
  attempts: { [proxy: string]: number } = {};
  maxAttempts: number = 3;

  constructor(proxyList: string[], rotateProxyCodes?: number[]) {
    super();
    this.proxyList = proxyList;
    if (rotateProxyCodes) {
      this.rotateProxyCodes = rotateProxyCodes;
    }
  }

  processRequest(r: Request, spider: Spider): Promise<Request> {
    r.setProxy(this.proxyList[(Math.random() * this.proxyList.length) | 0]);
    return Promise.resolve(r);
  }

  processResponse(item: QueueItem, spider: Spider): boolean {
    const req = item.request;
    const resp = req.response;

    // if a request fails, remove the proxy from the list
    if (
      item.request.proxy &&
      ((resp && this.rotateProxyCodes.includes(resp.status)) || req.error)
    ) {
      if (!this.attempts[item.request.proxy]) {
        this.attempts[item.request.proxy] = 0;
      }

      spider.logger.info("Failed attempt", item.request.proxy, req.error?.code);
      this.attempts[item.request.proxy]++;

      if (this.attempts[item.request.proxy] >= this.maxAttempts) {
        this.proxyList = this.proxyList.filter((p) => p !== item.request.proxy);
        spider.logger.info("proxy list removing", item.request.proxy);
        spider.logger.info("new proxy list size", this.proxyList.length);
      }

      item.ready = true;
      return false;
    }

    return true;
  }
}

export { ProxyListMiddleware };
