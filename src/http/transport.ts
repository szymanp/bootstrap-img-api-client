import type { ResolvedConfig } from '../config';
import type { BinaryBody } from '../types/media';
import { ApiError, problemFromResponse } from './errors';

/** Query parameter values; `undefined` entries are omitted. */
export type QueryParams = Record<string, string | number | boolean | undefined>;

/** Request body, tagged so the transport can set the right `Content-Type`. */
export type RequestBody =
  | { kind: 'json'; value: unknown }
  | { kind: 'markdown'; value: string }
  | { kind: 'binary'; value: BinaryBody; contentType: string };

export interface RequestSpec<T> {
  method: string;
  /** Path relative to `baseUrl`, e.g. `/repos`. Must be pre-encoded. */
  path: string;
  query?: QueryParams;
  headers?: Record<string, string | undefined>;
  /** `Accept-Language` for this call; `null` suppresses the default. */
  acceptLanguage?: string | null;
  /** `Content-Language` for this call; `null` suppresses the default. */
  contentLanguage?: string | null;
  body?: RequestBody;
  /** Non-2xx statuses that should NOT throw (e.g. `[304]`). */
  allowStatuses?: number[];
  /** Turns the (ok) response into the resolved value. */
  parse: (response: Response) => Promise<T> | T;
}

/** Low-level fetch wrapper: URL building, headers, cookies, error mapping. */
export class Transport {
  constructor(private readonly config: ResolvedConfig) {}

  /** The configured default locale, used to default `Content-Language` on writes. */
  get defaultLanguage(): string {
    return this.config.defaultLanguage;
  }

  async request<T>(spec: RequestSpec<T>): Promise<T> {
    const url = this.buildUrl(spec.path, spec.query);
    const headers = this.buildHeaders(spec);
    const body = encodeBody(spec.body, headers);

    const init: RequestInit = { method: spec.method, headers };
    if (body !== undefined) init.body = body;
    const credentialsMode = this.config.credentials.fetchCredentials();
    if (credentialsMode) init.credentials = credentialsMode;
    // Required for streaming request bodies on some runtimes.
    if (spec.body?.kind === 'binary' && spec.body.value instanceof ReadableStream) {
      (init as RequestInit & { duplex?: string }).duplex = 'half';
    }

    const response = await this.config.fetch(url, init);
    this.config.credentials.capture(response);

    const allowed = spec.allowStatuses ?? [];
    if (!response.ok && !allowed.includes(response.status)) {
      throw new ApiError(await problemFromResponse(response), response);
    }
    return spec.parse(response);
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const url = new URL(this.config.baseUrl + path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private buildHeaders(spec: RequestSpec<unknown>): Headers {
    const headers = new Headers();
    headers.set('accept', 'application/json');
    for (const [k, v] of Object.entries(this.config.defaultHeaders)) headers.set(k, v);

    const acceptLang = spec.acceptLanguage === undefined ? this.config.defaultLanguage : spec.acceptLanguage;
    if (acceptLang) headers.set('accept-language', acceptLang);

    if (spec.contentLanguage !== undefined && spec.contentLanguage !== null) {
      headers.set('content-language', spec.contentLanguage);
    }

    if (spec.headers) {
      for (const [k, v] of Object.entries(spec.headers)) {
        if (v !== undefined) headers.set(k, v);
      }
    }

    this.config.credentials.decorate(headers);
    return headers;
  }
}

function encodeBody(body: RequestBody | undefined, headers: Headers): BodyInit | undefined {
  if (!body) return undefined;
  switch (body.kind) {
    case 'json':
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
      return JSON.stringify(body.value);
    case 'markdown':
      if (!headers.has('content-type')) headers.set('content-type', 'text/markdown');
      return body.value;
    case 'binary':
      headers.set('content-type', body.contentType);
      return toBodyInit(body.value);
  }
}

function toBodyInit(value: BinaryBody): BodyInit {
  if (value instanceof ReadableStream) return value as unknown as BodyInit;
  // Blob, ArrayBuffer, and ArrayBufferView are all valid BodyInit values.
  return value as BodyInit;
}

/* ------------------------------- parse helpers ------------------------------ */

/** Parse a JSON response body as `T`. */
export function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

/** Discard the body (204 / no-content endpoints). */
export function parseVoid(): void {
  /* nothing to read */
}

/** Read the response body as text. */
export function parseText(response: Response): Promise<string> {
  return response.text();
}
