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
    const delay = this.spacing * bufferIndex;
    return new Promise((resolve) => {
      setTimeout(() => resolve(r), delay);
    });
  }
}

export { ThrottleMiddleware };
