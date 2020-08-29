import { Request, RequestState } from "../src/Request";

const simulateRequest = (
  n: number,
  response: any,
  delay: number = -1,
  passes: boolean = true
): Request => {
  const timeout = delay === -1 ? (Math.random() * 100) | 0 : delay;
  const r = new Request(`n:${n}`);

  r.run = jest.fn().mockImplementation(() => {
    r.state = RequestState.REQUESTING;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        r.response = { ...response };
        if (passes) {
          if (r.state !== RequestState.CANCELLED)
            r.state = RequestState.COMPLETED;
          resolve(r.response);
        } else {
          r.state = RequestState.FAILED;
          reject(r.response);
        }
      }, timeout);
    });
  });
  return r;
};

export { simulateRequest };
