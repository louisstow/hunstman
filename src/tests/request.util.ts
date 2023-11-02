import { Request } from "../Request";
import mockAxios from "jest-mock-axios";

const simulateRequest = (
  n: number,
  response: any,
  delay: number = -1,
  passes: boolean = true
): Request => {
  const timeout = delay === -1 ? (Math.random() * 100) | 0 : delay;
  const r = new Request(`n:${n}`);

  const prevRun = r.run;
  r.run = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const p = prevRun.call(r);
        if (passes) {
          mockAxios.mockResponse(response);
        } else {
          mockAxios.mockError({ response });
        }

        p.then(resolve).catch(reject);
      }, timeout);
    });
  };

  return r;
};

export { simulateRequest };
