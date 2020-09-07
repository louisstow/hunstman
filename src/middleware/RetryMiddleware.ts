import { Middleware } from "../Middleware";
import { QueueItem } from "../Queue";

class RetryMiddleware extends Middleware {
  numTimes: number = 5;
  retryStatusCodes: number[] = [
    500,
    502,
    503,
    504,
    522,
    524,
    408,
    429,
    400,
    403,
  ];
  retryErrorCodes: string[] = ["ECONNABORTED", "ETIMEDOUT"];

  attempts: { [url: string]: number } = {};

  constructor(numTimes?: number, retryStatusCodes?: number[]) {
    super();

    if (numTimes) {
      this.numTimes = numTimes;
    }

    if (retryStatusCodes) {
      this.retryStatusCodes = retryStatusCodes;
    }
  }

  processResponse(item: QueueItem): boolean {
    const req = item.request;
    const resp = req.response;

    if (
      (resp && this.retryStatusCodes.includes(resp.status)) ||
      (req.error && this.retryErrorCodes.includes(req.error.code || ""))
    ) {
      // keep track of attempts
      if (!this.attempts[item.request.url]) {
        this.attempts[item.request.url] = 0;
      } else if (this.attempts[item.request.url] >= this.numTimes) {
        return true;
      }

      item.ready = true;
      this.attempts[item.request.url]++;
      return false;
    }

    return true;
  }
}

export { RetryMiddleware };
