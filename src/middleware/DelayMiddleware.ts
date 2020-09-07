import { Middleware } from "../Middleware";
import { Request } from "../Request";

class DelayMiddleware extends Middleware {
  delay: number;
  variance: number = 0.5; // randomly + or - this as a % of delay

  constructor(delay?: number, variance?: number) {
    super();
    this.delay = delay || 100;
    if (variance !== undefined) {
      this.variance = variance;
    }
  }

  calculateDelay(): number {
    const rand = Math.random() * 2 - 1; // between -1 and 1
    const delta = this.delay * this.variance * rand;
    return Math.round(this.delay + delta);
  }

  processRequest(r: Request): Promise<Request> {
    const delay = this.calculateDelay();

    return new Promise((resolve) => {
      setTimeout(() => resolve(r), delay);
    });
  }
}

export { DelayMiddleware };
