import axios, { CancelTokenSource, AxiosError } from "axios";
import { Response } from "./Response";

import ProxyAgent from "proxy-agent";

const CancelToken = axios.CancelToken;

enum RequestState {
  WAITING,
  REQUESTING,
  CANCELLED,
  COMPLETED,
  FAILED,
  SKIPPED,
}

type Method = "GET" | "POST";

class Request {
  url: string;
  method: Method;
  meta: { [k: string]: any };
  headers: { [h: string]: string };
  data: { [k: string]: any } | undefined;
  state: RequestState;
  cancelToken: CancelTokenSource;
  response: Response | null;
  proxy: string | false = false;
  timeout: number = 0;
  error: AxiosError | null = null;

  startTime: number | null;
  endTime: number | null;

  constructor(
    url: string,
    method: Method = "GET",
    data: { [k: string]: any } | undefined = undefined
  ) {
    this.url = url;
    this.meta = {};
    this.headers = {};
    this.state = RequestState.WAITING;
    this.method = method;
    this.data = data;
    this.cancelToken = CancelToken.source();
    this.response = null;
    this.startTime = null;
    this.endTime = null;
  }

  setMeta(key: string, value: any) {
    this.meta[key] = value;
  }

  getMeta(key: string) {
    return this.meta[key];
  }

  setHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  setProxy(proxy: string) {
    this.proxy = proxy;
  }

  setTimeout(ms: number) {
    this.timeout = ms;
  }

  cancel() {
    this.state = RequestState.CANCELLED;
    this.cancelToken.cancel();
  }

  duration(): number | null {
    if (this.startTime && this.endTime) {
      return this.endTime - this.startTime;
    }

    return null;
  }

  reset() {
    this.startTime = null;
    this.endTime = null;
    this.error = null;
    this.response = null;
    this.state = RequestState.WAITING;
  }

  serialize(): object {
    return {
      url: this.url,
      headers: { ...this.headers },
      meta: { ...this.meta },
      method: this.method,
      data: this.data,
      response: this.response?.serialize(),
    };
  }

  run(): Promise<Response> {
    if (this.state === RequestState.REQUESTING) {
      throw new Error("Request has already been started");
    }

    this.state = RequestState.REQUESTING;
    this.startTime = Date.now();

    let httpAgent: any = undefined;
    if (this.proxy) {
      httpAgent = new ProxyAgent(this.proxy);
      httpAgent.rejectUnauthorized = false;
    }

    return new Promise((resolve, reject) => {
      axios({
        url: this.url,
        method: this.method,
        data: this.data,
        headers: this.headers,
        responseType: "text",
        transformResponse: [
          (data) => {
            return data;
          },
        ],
        cancelToken: this.cancelToken.token,
        timeout: this.timeout,
        httpsAgent: httpAgent,
        httpAgent: httpAgent,
      })
        .then((resp) => {
          this.state = RequestState.COMPLETED;
          this.endTime = Date.now();

          const r = new Response(
            this,
            resp.status,
            resp.statusText,
            resp.headers,
            resp.data,
            resp.data
          );

          this.response = r;
          resolve(r);
        })
        .catch((err: AxiosError) => {
          this.state = RequestState.FAILED;
          this.endTime = Date.now();
          this.error = err;

          if (err.response) {
            const r = new Response(
              this,
              err.response.status,
              err.response.statusText,
              err.response.headers,
              err.response.data,
              err.response.data
            );

            this.response = r;
          }

          reject(err);
        });
    });
  }
}

export { Request, RequestState };
