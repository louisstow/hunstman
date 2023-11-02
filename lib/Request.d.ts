/// <reference types="node" />
import { CancelTokenSource, AxiosError, AxiosResponse } from "axios";
import { EventEmitter } from "events";
import { Response } from "./Response";
declare enum RequestState {
    WAITING = 0,
    REQUESTING = 1,
    CANCELLED = 2,
    COMPLETED = 3,
    FAILED = 4,
    SKIPPED = 5
}
type Method = "GET" | "POST";
declare class Request extends EventEmitter {
    url: string;
    method: Method;
    meta: {
        [k: string]: unknown;
    };
    headers: {
        [h: string]: string;
    };
    data: {
        [k: string]: any;
    } | undefined;
    state: RequestState;
    cancelToken: CancelTokenSource;
    response: Response | null;
    responseType: "text" | "arraybuffer";
    proxy: string | false;
    timeout: number;
    error: AxiosError | null;
    startTime: number | null;
    endTime: number | null;
    constructor(url: string, method?: Method, data?: {
        [k: string]: any;
    } | undefined);
    setMeta<T>(key: string, value: T): void;
    getMeta<T>(key: string): T;
    setHeader(key: string, value: string): void;
    setProxy(proxy: string): void;
    setTimeout(ms: number): void;
    setResponseType(type: "text" | "arraybuffer"): void;
    cancel(): void;
    duration(): number | null;
    reset(): void;
    serialize(): object;
    setResponse(resp: AxiosResponse): Response;
    private createAxiosProps;
    run(): Promise<Response>;
}
export { Request, RequestState };
