export interface TextRequestOptions extends RequestInit {
  rewriteUrl?: (input: string) => string;
}

function toRequestUrl(input: string, rewriteUrl?: (url: string) => string): string {
  return rewriteUrl ? rewriteUrl(input) : input;
}

export async function fetchText(
  input: string,
  options: TextRequestOptions = {}
): Promise<string> {
  const { rewriteUrl, ...init } = options;
  const response = await fetch(toRequestUrl(input, rewriteUrl), init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${input}`);
  }
  return response.text();
}

export async function fetchJson<T>(
  input: string,
  options: TextRequestOptions = {}
): Promise<T> {
  const text = await fetchText(input, options);
  return JSON.parse(text) as T;
}

export async function postForm<T>(
  input: string,
  body: URLSearchParams,
  options: TextRequestOptions = {}
): Promise<T> {
  return fetchJson<T>(input, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(options.headers ?? {}),
    },
    body: body.toString(),
  });
}

export async function postJson<T>(
  input: string,
  body: unknown,
  options: TextRequestOptions = {}
): Promise<T> {
  return fetchJson<T>(input, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}
