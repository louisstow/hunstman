import { Middleware } from "../Middleware";
import { Request } from "../Request";
import { Spider } from "../Spider";
declare class ThrottleMiddleware extends Middleware {
    spacing: number;
    constructor(spacingMs: number);
    processRequest(r: Request, spider: Spider, bufferIndex: number): Promise<Request>;
}
export { ThrottleMiddleware };
