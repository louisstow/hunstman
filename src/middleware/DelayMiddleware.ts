import { Middleware } from "../Middleware";
import { Request } from "../Request";

class DelayMiddleware extends Middleware {
  delay: number;

  constructor(delay?: number) {
    super();
    this.delay = delay || 100;
  }

  processRequest(r: Request): Promise<Request> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(r), this.delay);
    });
  }
}

export { DelayMiddleware };
