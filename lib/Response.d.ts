declare type Header = {
    [h: string]: string;
};
declare class Response {
    status: number;
    headers: Header;
    statusText: string;
    data: any;
    constructor(status: number, statusText: string, headers: Header, data: any);
}
export { Response };
