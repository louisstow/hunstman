import axios, {
  CancelTokenSource,
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { Response } from "./Response";

import ProxyAgent from "proxy-agent";

const CancelToken = axios.CancelToken;
const nop = (data: any) => data;

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

  public setMeta(key: string, value: any) {
    this.meta[key] = value;
  }

  public getMeta(key: string) {
    return this.meta[key];
  }

  public setHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  public setProxy(proxy: string) {
    this.proxy = proxy;
  }

  public setTimeout(ms: number) {
    this.timeout = ms;
  }

  public cancel() {
    this.state = RequestState.CANCELLED;
    this.cancelToken.cancel();
  }

  public duration(): number | null {
    if (this.startTime && this.endTime) {
      return this.endTime - this.startTime;
    }

    return null;
  }

  public reset() {
    this.startTime = null;
    this.endTime = null;
    this.error = null;
    this.response = null;
    this.state = RequestState.WAITING;
  }

  public serialize(): object {
    return {
      url: this.url,
      headers: { ...this.headers },
      meta: { ...this.meta },
      method: this.method,
      data: this.data,
      response: this.response?.serialize(),
    };
  }

  public setResponse(resp: AxiosResponse): Response {
    const r = new Response(
      this,
      resp?.request?.responseURL,
      resp.status,
      resp.statusText,
      resp.headers,
      resp.data,
      resp.data
    );

    this.response = r;
    return r;
  }

  private createAxiosProps(): AxiosRequestConfig {
    const httpAgent = this.proxy ? new ProxyAgent(this.proxy) : undefined;

    return {
      url: this.url,
      method: this.method,
      data: this.data,
      headers: this.headers,
      responseType: "text",
      transformResponse: [nop],
      cancelToken: this.cancelToken.token,
      timeout: this.timeout,
      httpsAgent: httpAgent,
      httpAgent: httpAgent,
    };
  }

  public async run(): Promise<Response> {
    if (this.state === RequestState.REQUESTING) {
      throw new Error("Request has already been started");
    }

    this.reset();
    this.state = RequestState.REQUESTING;
    this.startTime = Date.now();

    try {
      const resp = await axios(this.createAxiosProps());
      this.state = RequestState.COMPLETED;
      this.endTime = Date.now();

      return this.setResponse(resp);
    } catch (caughtError) {
      const err = caughtError as AxiosError;

      this.state = RequestState.FAILED;
      this.endTime = Date.now();
      this.error = err;

      if (err.response) {
        this.setResponse(err.response);
      }

      throw err;
    }
  }
}

export { Request, RequestState };
