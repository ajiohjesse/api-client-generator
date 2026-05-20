import { describe, it, expect, vi, beforeAll } from 'vitest';
import { loadFromFile } from '../../src/loaders/file.js';
import { resolve, join } from 'node:path';

const fixtureDir = resolve(import.meta.dirname, '../fixtures');

describe('loadFromFile', () => {
  it('loads a JSON file', () => {
    const result = loadFromFile(join(fixtureDir, 'petstore.json'));
    expect(result.data).toBeTypeOf('object');
    expect((result.data as Record<string, unknown>).openapi).toBe('3.0.3');
    expect(result.source).toContain('petstore.json');
  });

  it('loads a YAML file', () => {
    const result = loadFromFile(join(fixtureDir, 'minimal.yml'));
    expect(result.data).toBeTypeOf('object');
    expect((result.data as Record<string, unknown>).openapi).toBe('3.0.3');
  });

  it('throws on non-existent file', () => {
    expect(() => loadFromFile('/nonexistent/path.yml')).toThrow();
  });

  it('detects JSON by content when extension is ambiguous', () => {
    const result = loadFromFile(join(fixtureDir, 'petstore.json'));
    expect((result.data as Record<string, unknown>).info).toBeTypeOf('object');
  });
});

describe('loadFromUrl', () => {
  it('uses fetch to load spec from URL', async () => {
    const mockData = { openapi: '3.0.3', info: { title: 'Test', version: '1.0' }, paths: {} };
    const mockResponse = {
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(mockData)),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { loadFromUrl } = await import('../../src/loaders/url.js');
    const result = await loadFromUrl('https://example.com/spec.json');
    expect((result.data as Record<string, unknown>).openapi).toBe('3.0.3');
    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/spec.json');

    vi.unstubAllGlobals();
  });

  it('throws on non-ok response', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { loadFromUrl } = await import('../../src/loaders/url.js');
    await expect(loadFromUrl('https://example.com/bad-url')).rejects.toThrow('Failed to fetch');

    vi.unstubAllGlobals();
  });
});
