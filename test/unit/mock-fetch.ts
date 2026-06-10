import type { FetchLike } from "../../src/index.js";

export interface RecordedRequest {
  method: string;
  url: string;
  headers: Headers;
  body: string | null;
}

export interface MockResponseSpec {
  status?: number;
  /** JSON value (sets `content-type: application/json` unless overridden). */
  json?: unknown;
  /** Raw text/binary body. */
  body?: BodyInit;
  headers?: Record<string, string>;
}

/** A scripted `fetch` that records calls and returns queued responses. */
export class MockFetch {
  readonly requests: RecordedRequest[] = [];
  private queue: MockResponseSpec[] = [];

  /** Queue one or more responses, returned in order across calls. */
  enqueue(...specs: MockResponseSpec[]): this {
    this.queue.push(...specs);
    return this;
  }

  get fetch(): FetchLike {
    return (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const headers = new Headers(init?.headers);
      this.requests.push({
        method: init?.method ?? "GET",
        url,
        headers,
        body: typeof init?.body === "string" ? init.body : null,
      });

      const spec = this.queue.shift() ?? { status: 204 };
      const respHeaders = new Headers(spec.headers);
      let body: BodyInit | null = null;
      if (spec.json !== undefined) {
        if (!respHeaders.has("content-type")) respHeaders.set("content-type", "application/json");
        body = JSON.stringify(spec.json);
      } else if (spec.body !== undefined) {
        body = spec.body;
      }
      const status = spec.status ?? 200;
      // 204/304 must not carry a body.
      const init2: ResponseInit = { status, headers: respHeaders };
      return new Response(status === 204 || status === 304 ? null : body, init2);
    }) as FetchLike;
  }

  /** The last recorded request. */
  get last(): RecordedRequest {
    const req = this.requests.at(-1);
    if (!req) throw new Error("No requests recorded");
    return req;
  }
}
