import { Middleware } from "../Middleware";
import { Request } from "../Request";
declare class DelayMiddleware extends Middleware {
    delay: number;
    variance: number;
    constructor(delay?: number, variance?: number);
    calculateDelay(): number;
    processRequest(r: Request): Promise<Request>;
}
export { DelayMiddleware };
