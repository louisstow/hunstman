import type { Request } from "./Request";
declare type Header = {
    [h: string]: string;
};
declare class Response {
    status: number;
    headers: Header;
    statusText: string;
    data: any;
    raw: string;
    request: Request;
    constructor(request: Request, status: number, statusText: string, headers: Header, data: any, raw: string);
    serialize(): object;
}
export { Response };
