type Header = { [h: string]: string };

class Response {
  status: number;
  headers: Header;
  statusText: string;
  data: any;

  constructor(status: number, statusText: string, headers: Header, data: any) {
    this.status = status;
    this.statusText = statusText;
    this.headers = headers;
    this.data = data;
  }
}

export { Response };
