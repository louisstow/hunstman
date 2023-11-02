import { Middleware } from "../Middleware";
import { Request } from "../Request";
declare class UserAgentMiddleware extends Middleware {
    strategy: string;
    agentList: string[];
    index: number;
    stickyCache: {
        [key: string]: string;
    };
    constructor(strategy?: string, agentList?: string[]);
    randomPick(): string;
    pick(r: Request): string;
    processRequest(r: Request | null): Promise<Request | null>;
}
export { UserAgentMiddleware };
