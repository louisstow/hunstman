import axios, {
  CancelTokenSource,
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosHeaders,
} from "axios";

import { HttpsProxyAgent } from "https-proxy-agent";
import { EventEmitter } from "events";

import { Response } from "./Response";

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

class Request extends EventEmitter {
  url: string;
  method: Method;
  meta: { [k: string]: unknown };
  headers: { [h: string]: string };
  data: { [k: string]: any } | undefined;
  state: RequestState;
  cancelToken: CancelTokenSource;
  response: Response | null;
  responseType: "text" | "arraybuffer" = "text";
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
    super();

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

  public setMeta<T>(key: string, value: T) {
    this.meta[key] = value;
  }

  public getMeta<T>(key: string): T {
    return this.meta[key] as T;
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

  public setResponseType(type: "text" | "arraybuffer") {
    this.responseType = type;
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
      responseType: this.responseType,
      response: this.response?.serialize(),
    };
  }

  public setResponse(resp: AxiosResponse): Response {
    const r = new Response(
      this,
      resp.request?.res?.responseUrl || this.url,
      resp.status,
      resp.statusText,
      resp.headers as AxiosHeaders,
      resp.data,
      resp.data
    );

    this.response = r;
    return r;
  }

  private createAxiosProps(): AxiosRequestConfig {
    const agent = this.proxy ? new HttpsProxyAgent(this.proxy) : undefined;

    return {
      url: this.url,
      method: this.method,
      data: this.data,
      headers: this.headers,
      responseType: this.responseType,
      transformResponse: [nop],
      cancelToken: this.cancelToken.token,
      timeout: this.timeout,
      httpAgent: agent,
      httpsAgent: agent,
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
