import axios, { CancelTokenSource, AxiosProxyConfig } from "axios";
import { Response } from "./Response";

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
  proxy: AxiosProxyConfig | false = false;

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

  setProxy(proxy: AxiosProxyConfig) {
    this.proxy = proxy;
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

  run(): Promise<Response> {
    if (this.state === RequestState.REQUESTING) {
      throw new Error("Request has already been started");
    }

    this.state = RequestState.REQUESTING;
    this.startTime = Date.now();

    return new Promise((resolve, reject) => {
      axios({
        url: this.url,
        method: this.method,
        data: this.data,
        headers: this.headers,
        responseType: "text",
        cancelToken: this.cancelToken.token,
        proxy: this.proxy,
      })
        .then((resp) => {
          this.state = RequestState.COMPLETED;
          this.endTime = Date.now();

          const r = new Response(
            resp.status,
            resp.statusText,
            resp.headers,
            resp.data
          );

          this.response = r;
          resolve(r);
        })
        .catch((err) => {
          this.state = RequestState.FAILED;
          this.endTime = Date.now();

          const r = new Response(
            err.response.status,
            err.response.statusText,
            err.response.headers,
            err.response.data
          );

          this.response = r;
          reject(r);
        });
    });
  }
}

export { Request, RequestState };
