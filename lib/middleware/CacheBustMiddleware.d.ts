import { Middleware } from "../Middleware";
import { Request } from "../Request";
declare class CacheBustMiddleware extends Middleware {
    processRequest(r: Request): Promise<Request>;
}
export { CacheBustMiddleware };
