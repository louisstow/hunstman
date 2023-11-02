import type { Request } from "./Request";

interface SpiderError {
  toJSON(): Record<string, string | number | undefined | null>;
}

class ResponseError extends Error implements SpiderError {
  url: string;
  status: number;

  constructor(message: string, url: string, status: number) {
    super(message);
    this.url = url;
    this.status = status;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ResponseError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      url: this.url,
      status: this.status,
    };
  }

  static create(src: unknown, url: string, status: number) {
    if (typeof src === "string") {
      return new ResponseError(src, url, status);
    }

    if (src instanceof Error) {
      const err = new ResponseError(src.message, url, status);
      err.name = src.name;
      err.stack = src.stack;
      return err;
    }

    return new ResponseError(`Unknown: (${src})`, url, status);
  }
}

class CrawlError extends Error implements SpiderError {
  request: Request;

  constructor(message: string, request: Request) {
    super(message);
    this.request = request;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CrawlError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      url: this.request.url,
      status: this.request.response?.status,
    };
  }

  static create(src: unknown, request: Request) {
    if (typeof src === "string") {
      return new CrawlError(src, request);
    }

    if (src instanceof Error) {
      const err = new CrawlError(src.message, request);
      err.name = src.name;
      err.stack = src.stack;
      return err;
    }

    return new CrawlError(`Unknown: (${src})`, request);
  }
}

class HandlerError extends Error implements SpiderError {
  event: string;

  constructor(message: string, event: string) {
    super(message);
    this.event = event;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HandlerError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      event: this.event,
    };
  }

  static create(src: unknown, event: string) {
    if (typeof src === "string") {
      return new HandlerError(src, event);
    }

    if (src instanceof Error) {
      const err = new HandlerError(src.message, event);
      err.name = src.name;
      err.stack = src.stack;
      return err;
    }

    return new HandlerError(`Unknown: (${src})`, event);
  }
}

export { ResponseError, CrawlError, HandlerError, SpiderError };
