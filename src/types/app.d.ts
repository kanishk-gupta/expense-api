export type TApiResponse<T> = {
  message: string;
  success?: boolean;
  resultData?: object;
  // resultData?: T;
  statusCode?: number;
  code?: string | undefined;
  error?: unknown | undefined;
  errorMessage?: string | undefined;
  timeStamp?: string;
  stack?: string | undefined;
};

export type TTokenPayload = {
  id: string;
  fullname?: string;
  email?: string;
};

export type TInputGQL<T> = {
  input: T;
};

export type TResponseGQL<T> = {
  success?: boolean;
  message: string;
  code?: string;
} & T;