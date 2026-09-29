/** `Repr-Digest` and upload-claim possession proofs, via Web Crypto. */

import type { BinaryBody } from '../types/media';
import type { PossessionProofRequiredProblem } from './errors';

/**
 * A SHA-256 hash of a whole file: 32 raw bytes, or a string holding them as
 * hex (64 characters) or base64.
 */
export type Sha256Input = Uint8Array | ArrayBuffer | string;

/** A {@link BinaryBody} whose bytes can be read more than once. */
export type RereadableBody = Exclude<BinaryBody, ReadableStream<Uint8Array>>;

/** The Web Crypto `SubtleCrypto`, or `undefined` (e.g. insecure browser context, Node 18). */
export function subtleCrypto(): SubtleCrypto | undefined {
  return globalThis.crypto?.subtle;
}

/** Format a SHA-256 hash as an RFC 9530 `Repr-Digest` value: `sha-256=:<base64>:`. */
export function formatReprDigest(sha256: Sha256Input): string {
  return `sha-256=:${toBase64(sha256Bytes(sha256))}:`;
}

/** Format a `Possession-Proof` header value. */
export function formatPossessionProof(challenge: string, response: string): string {
  return `challenge="${challenge}", response="${response}"`;
}

/**
 * Answer a possession-proof challenge: `hex(HMAC-SHA256(hex-decode(nonce),
 * SHA-256(chunk[c1]) ‖ SHA-256(chunk[c2]) ‖ …))` over the listed chunks, in
 * the order given. Only the listed chunks are read from `body`.
 */
export async function computePossessionProof(
  body: RereadableBody,
  challenge: Pick<PossessionProofRequiredProblem, 'nonce' | 'chunkSize' | 'chunks'>,
): Promise<string> {
  const subtle = subtleCrypto();
  if (!subtle) throw new Error('Web Crypto (crypto.subtle) is not available.');
  const { chunkSize, chunks } = challenge;

  const hashes = new Uint8Array(chunks.length * 32);
  for (const [i, index] of chunks.entries()) {
    const chunk = await readRange(body, index * chunkSize, chunkSize);
    hashes.set(new Uint8Array(await subtle.digest('SHA-256', chunk as BufferSource)), i * 32);
  }

  const key = await subtle.importKey('raw', fromHex(challenge.nonce), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  return toHex(new Uint8Array(await subtle.sign('HMAC', key, hashes)));
}

/** Read up to `length` bytes starting at `start`; shorter (or empty) past the end. */
async function readRange(body: RereadableBody, start: number, length: number): Promise<Uint8Array> {
  if (body instanceof Blob) {
    return new Uint8Array(await body.slice(start, start + length).arrayBuffer());
  }
  const bytes = ArrayBuffer.isView(body)
    ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
    : new Uint8Array(body);
  return bytes.subarray(start, start + length);
}

function sha256Bytes(sha256: Sha256Input): Uint8Array {
  const bytes =
    typeof sha256 !== 'string'
      ? new Uint8Array(sha256)
      : /^[0-9a-f]{64}$/i.test(sha256)
        ? fromHex(sha256)
        : fromBase64(sha256);
  if (bytes.length !== 32) throw new TypeError(`A SHA-256 hash is 32 bytes, got ${bytes.length}.`);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) throw new TypeError('Invalid hex string.');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
