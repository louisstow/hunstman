import { Middleware } from "../Middleware";
import { Request } from "../Request";
import { QueueItem } from "../Queue";
import { Spider } from "../Spider";
declare class ProxyListMiddleware extends Middleware {
    proxyList: string[];
    rotateProxyCodes: number[];
    attempts: {
        [proxy: string]: number;
    };
    maxAttempts: number;
    constructor(proxyList: string[], rotateProxyCodes?: number[]);
    processRequest(r: Request, spider: Spider): Promise<Request>;
    processResponse(item: QueueItem, spider: Spider): boolean;
}
export { ProxyListMiddleware };
