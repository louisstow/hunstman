import type { Request } from "./Request";
interface SpiderError {
    toJSON(): Record<string, string | number | undefined | null>;
}
declare class ResponseError extends Error implements SpiderError {
    url: string;
    status: number;
    constructor(message: string, url: string, status: number);
    toJSON(): {
        name: string;
        message: string;
        stack: string | undefined;
        url: string;
        status: number;
    };
    static create(src: unknown, url: string, status: number): ResponseError;
}
declare class CrawlError extends Error implements SpiderError {
    request: Request;
    constructor(message: string, request: Request);
    toJSON(): {
        name: string;
        message: string;
        stack: string | undefined;
        url: string;
        status: number | undefined;
    };
    static create(src: unknown, request: Request): CrawlError;
}
declare class HandlerError extends Error implements SpiderError {
    event: string;
    constructor(message: string, event: string);
    toJSON(): {
        name: string;
        message: string;
        stack: string | undefined;
        event: string;
    };
    static create(src: unknown, event: string): HandlerError;
}
export { ResponseError, CrawlError, HandlerError, SpiderError };
