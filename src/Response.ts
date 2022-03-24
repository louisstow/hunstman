import { URL } from "url";
import path from "path";

import type { Request } from "./Request";

type Header = { [h: string]: string };

class Response<T = any> {
  url: string;
  status: number;
  headers: Header;
  statusText: string;
  data: T;
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

  urljoin(u: string) {
    if (u.match(/^https?:\/\//)) {
      return u;
    }

    const url = new URL(this.url);

    if (u.startsWith("/")) {
      return `${url.origin}${u}`;
    }

    return `${url.origin}${path.join(url.pathname, u)}`;
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
