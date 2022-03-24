import { Middleware } from "../Middleware";
import { Request } from "../Request";
import { Spider } from "../Spider";

class ThrottleMiddleware extends Middleware {
  spacing: number;

  constructor(spacingMs: number) {
    super();
    this.spacing = spacingMs || 100;
  }

  processRequest(
    r: Request,
    spider: Spider,
    bufferIndex: number
  ): Promise<Request> {
    const diff = Date.now() - spider.stats.lastRequestTime;
    const delay = Math.max(this.spacing - diff, 0) * bufferIndex;

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(r);
      }, delay);
    });
  }
}

export { ThrottleMiddleware };
