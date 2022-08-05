declare class ResponseError extends Error {
    url: string;
    status: number;
    constructor(message: string, url: string, status: number);
    static fromError(srcErr: Error, url: string, status: number): ResponseError;
}
export { ResponseError };
