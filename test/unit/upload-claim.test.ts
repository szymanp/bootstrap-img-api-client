import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ApiError,
  BootstrapClient,
  ErrorType,
  MemoryCookieStore,
  computePossessionProof,
  formatPossessionProof,
  formatReprDigest,
} from '../../src/index';
import { MockFetch } from './mock-fetch';
import { serviceRootFixture } from './service-root.fixture';

function makeClient(mock: MockFetch) {
  return new BootstrapClient({
    baseUrl: 'http://localhost:8080',
    defaultLanguage: 'en-US',
    fetch: mock.fetch,
    credentials: new MemoryCookieStore(),
    serviceRoot: serviceRootFixture,
  });
}

// 10 bytes in 4-byte chunks: [0..3], [4..7], [8..9] (short last chunk).
const file = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const fileSha256 = createHash('sha256').update(file).digest();
const reprDigest = `sha-256=:${fileSha256.toString('base64')}:`;
const nonce = '00112233445566778899aabbccddeeff';

/** Reference implementation of the proof, using node:crypto. */
function expectedProof(bytes: Uint8Array, chunkSize: number, chunks: number[]): string {
  const hmac = createHmac('sha256', Buffer.from(nonce, 'hex'));
  for (const c of chunks)
    hmac.update(
      createHash('sha256')
        .update(bytes.subarray(c * chunkSize, (c + 1) * chunkSize))
        .digest(),
    );
  return hmac.digest('hex');
}

const challenge = {
  type: ErrorType.PossessionProofRequired,
  status: 428,
  title: 'Possession Proof Required',
  challenge: 'tok.en/==',
  nonce,
  chunkSize: 4,
  chunks: [2, 0],
  expiresAt: '2026-09-29T12:05:00Z',
};

function problem(type: string, status: number) {
  return { status, json: { type, status }, headers: { 'content-type': 'application/problem+json' } };
}

describe('digest helpers', () => {
  it('formats Repr-Digest from raw bytes, hex, or base64', () => {
    expect(formatReprDigest(new Uint8Array(fileSha256))).toBe(reprDigest);
    expect(formatReprDigest(fileSha256.toString('hex'))).toBe(reprDigest);
    expect(formatReprDigest(fileSha256.toString('base64'))).toBe(reprDigest);
  });

  it('rejects a hash that is not 32 bytes', () => {
    expect(() => formatReprDigest(new Uint8Array(31))).toThrow(TypeError);
  });

  it('formats Possession-Proof', () => {
    expect(formatPossessionProof('abc', 'ff00')).toBe('challenge="abc", response="ff00"');
  });

  it('computes the proof over the listed chunks in order, including a short last chunk', async () => {
    const expected = expectedProof(file, 4, [2, 0]);
    expect(await computePossessionProof(file, challenge)).toBe(expected);
    expect(await computePossessionProof(file.buffer, challenge)).toBe(expected);
    expect(await computePossessionProof(new Blob([file]), challenge)).toBe(expected);
  });

  it('honours the byte offset of an ArrayBufferView', async () => {
    const padded = new Uint8Array([99, 99, ...file, 99]);
    const view = padded.subarray(2, 12);
    expect(await computePossessionProof(view, challenge)).toBe(expectedProof(file, 4, [2, 0]));
  });

  it('reads only the challenged chunks from a Blob', async () => {
    const blob = new Blob([file]);
    const ranges: Array<[number | undefined, number | undefined]> = [];
    const original = blob.slice.bind(blob);
    blob.slice = (start?: number, end?: number, type?: string) => {
      ranges.push([start, end]);
      return original(start, end, type);
    };
    await computePossessionProof(blob, challenge);
    expect(ranges).toEqual([
      [8, 12],
      [0, 4],
    ]);
  });
});

describe('uploadById with Repr-Digest and upload claims', () => {
  const url = 'http://localhost:8080/media/repo1/mid;m1';

  it('sends Repr-Digest on a full upload when sha256 is given', async () => {
    const mock = new MockFetch().enqueue({ status: 204, headers: { 'media-item-id': 'm1' } });
    const result = await makeClient(mock)
      .media('repo1')
      .uploadById('m1', file, 'image/jpeg', {
        sha256: fileSha256.toString('hex'),
      });
    expect(mock.requests).toHaveLength(1);
    expect(mock.last.headers.get('repr-digest')).toBe(reprDigest);
    expect(mock.last.headers.get('content-type')).toBe('image/jpeg');
    expect(result).toEqual({ mediaItemId: 'm1', transferred: true });
  });

  it('omits Repr-Digest without sha256', async () => {
    const mock = new MockFetch().enqueue({ status: 204, headers: { 'media-item-id': 'm1' } });
    await makeClient(mock).media('repo1').uploadById('m1', file, 'image/jpeg');
    expect(mock.last.headers.has('repr-digest')).toBe(false);
  });

  it('surfaces a digest mismatch as an ApiError', async () => {
    const mock = new MockFetch().enqueue(problem(ErrorType.DigestMismatch, 400));
    const err = await makeClient(mock)
      .media('repo1')
      .uploadById('m1', file, 'image/jpeg', { sha256: fileSha256 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).type).toBe(ErrorType.DigestMismatch);
  });

  it('finishes on the claim alone when the item already exists with this hash', async () => {
    const mock = new MockFetch().enqueue({ status: 204 });
    const result = await makeClient(mock)
      .media('repo1')
      .uploadById('m1', file, 'image/jpeg', { sha256: fileSha256, claim: true });
    expect(mock.requests).toHaveLength(1);
    expect(mock.last.method).toBe('PUT');
    expect(mock.last.url).toBe(url);
    expect(mock.last.body).toBeNull();
    expect(mock.last.headers.get('repr-digest')).toBe(reprDigest);
    expect(mock.last.headers.has('content-type')).toBe(false);
    expect(mock.last.headers.has('possession-proof')).toBe(false);
    expect(result).toEqual({ mediaItemId: 'm1', transferred: false });
  });

  it('answers a 428 challenge and creates the item without transferring it', async () => {
    const mock = new MockFetch().enqueue(
      { status: 428, json: challenge, headers: { 'content-type': 'application/problem+json' } },
      { status: 204, headers: { 'media-item-id': 'm1' } },
    );
    const result = await makeClient(mock)
      .media('repo1')
      .uploadById('m1', new Blob([file]), 'image/jpeg', { sha256: fileSha256, claim: true });

    expect(mock.requests).toHaveLength(2);
    const proofReq = mock.requests[1]!;
    expect(proofReq.method).toBe('PUT');
    expect(proofReq.url).toBe(url);
    expect(proofReq.body).toBeNull();
    expect(proofReq.headers.get('repr-digest')).toBe(reprDigest);
    expect(proofReq.headers.has('content-type')).toBe(false);
    expect(proofReq.headers.get('possession-proof')).toBe(
      `challenge="tok.en/==", response="${expectedProof(file, 4, [2, 0])}"`,
    );
    expect(result).toEqual({ mediaItemId: 'm1', transferred: false });
  });

  it('falls back to a full upload when the server requires one (422)', async () => {
    const mock = new MockFetch().enqueue(problem(ErrorType.UploadRequired, 422), {
      status: 204,
      headers: { 'media-item-id': 'm1' },
    });
    const result = await makeClient(mock)
      .media('repo1')
      .uploadById('m1', file, 'image/jpeg', { sha256: fileSha256, claim: true });
    expect(mock.requests).toHaveLength(2);
    expect(mock.last.headers.get('content-type')).toBe('image/jpeg');
    expect(mock.last.headers.get('repr-digest')).toBe(reprDigest);
    expect(mock.last.headers.has('possession-proof')).toBe(false);
    expect(result).toEqual({ mediaItemId: 'm1', transferred: true });
  });

  it('falls back to a full upload when the proof is rejected (403)', async () => {
    const mock = new MockFetch().enqueue(
      { status: 428, json: challenge, headers: { 'content-type': 'application/problem+json' } },
      problem(ErrorType.PossessionProofInvalid, 403),
      { status: 204, headers: { 'media-item-id': 'm1' } },
    );
    const result = await makeClient(mock)
      .media('repo1')
      .uploadById('m1', file, 'image/jpeg', { sha256: fileSha256, claim: true });
    expect(mock.requests).toHaveLength(3);
    expect(mock.last.headers.get('content-type')).toBe('image/jpeg');
    expect(result.transferred).toBe(true);
  });

  it('rethrows a 409 from the claim without uploading', async () => {
    const mock = new MockFetch().enqueue(problem(ErrorType.MediaItemAlreadyExists, 409));
    const err = await makeClient(mock)
      .media('repo1')
      .uploadById('m1', file, 'image/jpeg', { sha256: fileSha256, claim: true })
      .catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(409);
    expect(mock.requests).toHaveLength(1);
  });

  it('rejects a claim without sha256 or with a ReadableStream body', async () => {
    const mock = new MockFetch();
    const media = makeClient(mock).media('repo1');
    await expect(media.uploadById('m1', file, 'image/jpeg', { claim: true })).rejects.toThrow(TypeError);
    await expect(
      media.uploadById('m1', new Blob([file]).stream(), 'image/jpeg', { sha256: fileSha256, claim: true }),
    ).rejects.toThrow(TypeError);
    expect(mock.requests).toHaveLength(0);
  });

  it('claimById sends the proof when given one', async () => {
    const mock = new MockFetch().enqueue({ status: 204 });
    const result = await makeClient(mock)
      .media('repo1')
      .claimById('m1', fileSha256, { challenge: 'c', response: 'ab' });
    expect(mock.last.headers.get('possession-proof')).toBe('challenge="c", response="ab"');
    expect(result).toEqual({ mediaItemId: 'm1', transferred: false });
  });
});
