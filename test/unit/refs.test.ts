import { describe, expect, it } from 'vitest';
import { FolderRef, MediaRef } from '../../src/index';

describe('FolderRef', () => {
  it('renders id path segments', () => {
    expect(FolderRef.id('abc').toPathSegment()).toBe('id;abc');
    expect(FolderRef.id('abc').toReference()).toEqual({ id: 'abc' });
  });

  it('renders path segments joined by semicolons', () => {
    expect(FolderRef.path('/albums/vacation').toPathSegment()).toBe('path;albums;vacation');
    expect(FolderRef.path('/albums/vacation').toReference()).toEqual({ path: '/albums/vacation' });
  });

  it('accepts arrays and bare paths', () => {
    expect(FolderRef.path(['albums', 'vacation']).toPathSegment()).toBe('path;albums;vacation');
    expect(FolderRef.path('albums/vacation').toPathSegment()).toBe('path;albums;vacation');
  });

  it('coerces from references, strings, and segments', () => {
    expect(FolderRef.from({ id: 'x' }).toPathSegment()).toBe('id;x');
    expect(FolderRef.from({ path: '/a/b' }).toPathSegment()).toBe('path;a;b');
    expect(FolderRef.from('id;x').toPathSegment()).toBe('id;x');
    expect(FolderRef.from('path;a;b').toPathSegment()).toBe('path;a;b');
    expect(FolderRef.from('/a/b').toPathSegment()).toBe('path;a;b');
  });

  it('encodes segments', () => {
    expect(FolderRef.path(['a b', 'c/d']).toPathSegment()).toBe('path;a%20b;c%2Fd');
  });
});

describe('MediaRef', () => {
  it('renders mid suffix', () => {
    expect(MediaRef.id('uuid').toPathSuffix()).toBe('mid;uuid');
  });

  it('renders folder + filename suffix', () => {
    expect(MediaRef.file({ path: '/albums/vacation' }, 'a.JPG').toPathSuffix()).toBe('path;albums;vacation/a.JPG');
    expect(MediaRef.file(FolderRef.id('fid'), 'a b.JPG').toPathSuffix()).toBe('id;fid/a%20b.JPG');
  });

  it('renders sha256 suffix', () => {
    expect(MediaRef.sha256('abc123').toPathSuffix()).toBe('sha256;abc123');
  });
});
