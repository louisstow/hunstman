import type { Request } from "./Request";
declare type Header = {
    [h: string]: string;
};
declare class Response {
    url: string;
    status: number;
    headers: Header;
    statusText: string;
    data: any;
    raw: string;
    request: Request;
    constructor(request: Request, url: string, status: number, statusText: string, headers: Header, data: any, raw: string);
    serialize(): object;
}
export { Response };
