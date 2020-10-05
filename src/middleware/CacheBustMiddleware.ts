import { Middleware } from "../Middleware";
import { Request } from "../Request";

import { URL } from "url";

class CacheBustMiddleware extends Middleware {
  processRequest(r: Request) {
    const reqUrl = new URL(r.url);
    reqUrl.searchParams.set("_cache", String(Date.now()));
    r.url = reqUrl.href;
    return Promise.resolve(r);
  }
}

export { CacheBustMiddleware };
