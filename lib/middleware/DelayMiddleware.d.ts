import { Middleware } from "../Middleware";
import { Request } from "../Request";
declare class DelayMiddleware extends Middleware {
    delay: number;
    constructor(delay?: number);
    processRequest(r: Request): Promise<Request>;
}
export { DelayMiddleware };
