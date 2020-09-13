let __mockedResponse: any = null;
let __reflectOptions = false;

const mockedAxios = (opts: any) => {
  if (__reflectOptions) {
    return Promise.resolve({ data: opts });
  }
  return __mockedResponse;
};

class CancelTokenSource {
  token = "1";

  cancel() {
    return 42;
  }
}

class AxiosError {}
class AxiosRequestConfig {}

mockedAxios.CancelToken = {
  source() {
    return new CancelTokenSource();
  },
};

const __setMockedRepsonse = (v: any) => {
  __mockedResponse = v;
};

const __setReflectOptions = (v: boolean) => {
  __reflectOptions = v;
};

export {
  CancelTokenSource,
  AxiosError,
  AxiosRequestConfig,
  __setMockedRepsonse,
  __setReflectOptions,
};
export default mockedAxios;
