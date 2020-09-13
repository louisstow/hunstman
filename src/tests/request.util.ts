import { Request } from "../Request";

const simulateRequest = (
  n: number,
  response: any,
  delay: number = -1,
  passes: boolean = true
): Request => {
  const timeout = delay === -1 ? (Math.random() * 100) | 0 : delay;
  const r = new Request(`n:${n}`);

  const oldRun = r.run;

  r.run = function () {
    require("axios").__setMockedRepsonse(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (passes) resolve(response);
          else reject({ response });
        }, timeout);
      })
    );
    return oldRun.call(r);
  };

  return r;
};

export { simulateRequest };
