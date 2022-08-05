class ResponseError extends Error {
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

  static fromError(srcErr: Error, url: string, status: number) {
    const err = new ResponseError(srcErr.message, url, status);
    err.name = srcErr.name;
    err.stack = srcErr.stack;
    return err;
  }
}

export { ResponseError };
