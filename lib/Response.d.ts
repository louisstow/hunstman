import type { Request } from "./Request";
type Header = {
    [h: string]: string;
};
declare class Response<T = any> {
    url: string;
    status: number;
    headers: Header;
    statusText: string;
    data: T;
    raw: string;
    request: Request;
    constructor(request: Request, url: string, status: number, statusText: string, headers: Header, data: any, raw: string);
    urljoin(u: string): string;
    serialize(): object;
}
export { Response };
