import type { Request } from "./Request";

type Header = { [h: string]: string };

class Response {
  url: string;
  status: number;
  headers: Header;
  statusText: string;
  data: any;
  raw: string;
  request: Request;

  constructor(
    request: Request,
    url: string,
    status: number,
    statusText: string,
    headers: Header,
    data: any,
    raw: string
  ) {
    this.request = request;
    this.url = url;
    this.status = status;
    this.statusText = statusText;
    this.headers = headers;
    this.data = data;
    this.raw = raw;
  }

  serialize(): object {
    return {
      url: this.url,
      status: this.status,
      statusText: this.statusText,
      headers: { ...this.headers },
      raw: this.raw,
    };
  }
}

export { Response };
