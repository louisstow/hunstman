import { Middleware } from "../Middleware";
import { QueueItem } from "../Queue";

class RetryMiddleware extends Middleware {
  numTimes: number = 5;
  retryCodes: number[] = [500, 502, 503, 504, 522, 524, 408, 429, 400, 403];

  attempts: { [url: string]: number } = {};

  constructor(numTimes?: number, retryCodes?: number[]) {
    super();

    if (numTimes) {
      this.numTimes = numTimes;
    }

    if (retryCodes) {
      this.retryCodes = retryCodes;
    }
  }

  processResponse(item: QueueItem): boolean {
    if (
      item.request.response &&
      this.retryCodes.includes(item.request.response.status)
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
