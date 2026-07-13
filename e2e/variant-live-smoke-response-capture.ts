export type ApiDiagnostic = {
  method: string;
  path: string;
  resourceType: string;
  status: number;
  url: string;
};

type ApiRequestMetadata = {
  method: string;
  resourceType: string;
};

type ApiRequestMetadataLookup<RequestType> = {
  get(request: RequestType): ApiRequestMetadata | undefined;
};

type ApiResponseLike<RequestType> = {
  request(): RequestType;
  status(): number;
  url(): string;
};

export const isLocalApiUrl = (rawUrl: string): boolean => {
  try {
    const url = new URL(rawUrl);
    return (
      url.pathname.startsWith('/api/') &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    );
  } catch {
    return false;
  }
};

export const apiPath = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    return url.pathname.replace(/\/$/, '') || '/';
  } catch {
    return rawUrl;
  }
};

export function captureLocalApiResponse<RequestType>(
  response: ApiResponseLike<RequestType>,
  apiRequestMetadata: ApiRequestMetadataLookup<RequestType>,
  apiResponses: ApiDiagnostic[],
  detachedResponseErrors: string[],
): void {
  try {
    const url = response.url();
    if (!isLocalApiUrl(url)) return;
    const requestMetadata = apiRequestMetadata.get(response.request());
    apiResponses.push({
      method: requestMetadata?.method ?? 'unknown',
      path: apiPath(url),
      resourceType: requestMetadata?.resourceType ?? 'unknown',
      status: response.status(),
      url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('was not bound in the connection')) throw error;
    detachedResponseErrors.push(message);
  }
}
