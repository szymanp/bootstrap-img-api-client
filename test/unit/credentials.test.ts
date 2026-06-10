import { describe, expect, it } from 'vitest';
import { BrowserCredentialStore, MemoryCookieStore } from '../../src/index.js';

function responseWithSetCookie(...cookies: string[]): Response {
  const headers = new Headers();
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(null, { status: 204, headers });
}

describe('MemoryCookieStore', () => {
  it('captures Set-Cookie and replays it as a Cookie header', () => {
    const store = new MemoryCookieStore();
    store.capture(responseWithSetCookie('session=opaque-value; Path=/; HttpOnly'));

    const headers = new Headers();
    store.decorate(headers);
    expect(headers.get('cookie')).toBe('session=opaque-value');
  });

  it('clears a cookie when Max-Age=0 (logout)', () => {
    const store = new MemoryCookieStore();
    store.capture(responseWithSetCookie('session=v; Path=/'));
    store.capture(responseWithSetCookie('session=; Path=/; Max-Age=0'));

    const headers = new Headers();
    store.decorate(headers);
    expect(headers.has('cookie')).toBe(false);
  });

  it('serializes and restores', () => {
    const store = new MemoryCookieStore();
    store.capture(responseWithSetCookie('session=abc; Path=/'));
    const restored = MemoryCookieStore.fromJSON(store.toJSON());

    const headers = new Headers();
    restored.decorate(headers);
    expect(headers.get('cookie')).toBe('session=abc');
  });

  it('uses no fetch credentials mode', () => {
    expect(new MemoryCookieStore().fetchCredentials()).toBeUndefined();
  });
});

describe('BrowserCredentialStore', () => {
  it('is a no-op that opts into credentialed fetch', () => {
    const store = new BrowserCredentialStore();
    const headers = new Headers();
    store.decorate(headers);
    store.capture(new Response(null, { status: 200 }));
    expect(headers.has('cookie')).toBe(false);
    expect(store.fetchCredentials()).toBe('include');
  });
});
