import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { rmSync } from 'node:fs';
import { generate } from '../../src/codegen/index.js';
import { loadFromFile } from '../../src/loaders/file.js';
import { execSync } from 'node:child_process';

const fixtureDir = resolve(import.meta.dirname, '../fixtures');

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'api-client-gen-test-'));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeGenerated(specFile: string, clientName?: string): { typesPath: string; clientPath: string; indexPath: string } {
  const data = loadFromFile(join(fixtureDir, specFile)).data;
  const outDir = join(tmpDir, specFile.replace(/\.\w+$/, ''));
  mkdirSync(outDir, { recursive: true });
  const result = generate(data, { output: outDir, clientName });

  writeFileSync(join(outDir, 'types.ts'), result.typesCode, 'utf-8');
  writeFileSync(join(outDir, 'client.ts'), result.clientCode, 'utf-8');
  writeFileSync(join(outDir, 'index.ts'), result.indexCode, 'utf-8');

  return {
    typesPath: join(outDir, 'types.ts'),
    clientPath: join(outDir, 'client.ts'),
    indexPath: join(outDir, 'index.ts'),
  };
}

describe('full generate pipeline', () => {
  it('generates valid TypeScript from minimal spec', () => {
    const { typesPath, clientPath, indexPath } = writeGenerated('minimal.yml');
    expect(existsSync(typesPath)).toBe(true);
    expect(existsSync(clientPath)).toBe(true);
    expect(existsSync(indexPath)).toBe(true);

    const types = readFileSync(typesPath, 'utf-8');
    const client = readFileSync(clientPath, 'utf-8');
    const index = readFileSync(indexPath, 'utf-8');

    expect(types).toBeDefined();
    expect(client).toContain('export class ApiClient');
    expect(client).toContain('async getHealth');
    expect(index).toContain("export { ApiClient } from './client.js'");
  });

  it('generates valid TypeScript from params spec', () => {
    const { typesPath, clientPath } = writeGenerated('params.yml');
    expect(existsSync(typesPath)).toBe(true);
    expect(existsSync(clientPath)).toBe(true);

    const client = readFileSync(clientPath, 'utf-8');
    expect(client).toContain('async getUserById');
    expect(client).toContain('async getUserPost');
    expect(client).toContain('async createUser');
    expect(client).toContain('async deleteUser');
    expect(client).toContain('encodeURIComponent(userId)');
    expect(client).toContain('URLSearchParams');
  });

  it('generates valid TypeScript from schemas spec', () => {
    const { typesPath, clientPath } = writeGenerated('schemas.yml');
    expect(existsSync(typesPath)).toBe(true);
    expect(existsSync(clientPath)).toBe(true);

    const types = readFileSync(typesPath, 'utf-8');
    expect(types).toContain('export interface Item');
    expect(types).toContain('export type _Error');
    expect(types).toContain('export interface Pet extends');
  });

  it('generates valid TypeScript from petstore spec', () => {
    const { typesPath, clientPath } = writeGenerated('petstore.json');
    expect(existsSync(typesPath)).toBe(true);
    expect(existsSync(clientPath)).toBe(true);

    const types = readFileSync(typesPath, 'utf-8');
    const client = readFileSync(clientPath, 'utf-8');

    expect(types).toContain('export interface Pet');
    expect(types).toContain('export interface Order');
    expect(types).toContain('export interface User');

    expect(client).toContain('async getPetById');
    expect(client).toContain('async findPetsByStatus');
    expect(client).toContain("import type { Pet");
  });

  it('generates types with proper nullable handling', () => {
    const { typesPath } = writeGenerated('schemas.yml');
    const types = readFileSync(typesPath, 'utf-8');
    expect(types).toContain('| null');
  });

  it('generates types with enum literals', () => {
    const { typesPath } = writeGenerated('schemas.yml');
    const types = readFileSync(typesPath, 'utf-8');
    expect(types).toContain("'active'");
    expect(types).toContain("'inactive'");
    expect(types).toContain("'archived'");
  });

  it('supports custom client class name', () => {
    const { clientPath } = writeGenerated('minimal.yml', 'PetStoreClient');
    const client = readFileSync(clientPath, 'utf-8');
    expect(client).toContain('export class PetStoreClient');
    expect(client).not.toContain('export class ApiClient');
  });

  it('generates all query param types in client file', () => {
    const { clientPath } = writeGenerated('params.yml');
    const client = readFileSync(clientPath, 'utf-8');
    expect(client).toContain('export interface GetUserByIdParams');
  });
});

describe('generated output compiles', () => {
  it('minimal spec output compiles with tsc', () => {
    const { typesPath, clientPath } = writeGenerated('minimal.yml');
    const outDir = resolve(typesPath, '..');
    const tsconfigPath = join(outDir, 'tsconfig.json');

    const tsconfig = JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ['*.ts'],
    }, null, 2);
    writeFileSync(tsconfigPath, tsconfig, 'utf-8');

    try {
      execSync('bun x tsc --noEmit', { cwd: outDir, stdio: 'pipe' });
    } catch (e) {
      const stderr = (e as { stderr?: Buffer }).stderr?.toString() || '';
      expect(stderr).toBe('');
    }
  }, 30000);

  it('schemas spec output compiles with tsc', () => {
    const { typesPath, clientPath } = writeGenerated('schemas.yml');
    const outDir = resolve(typesPath, '..');

    const tsconfigPath = join(outDir, 'tsconfig.json');
    const tsconfig = JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ['*.ts'],
    }, null, 2);
    writeFileSync(tsconfigPath, tsconfig, 'utf-8');

    try {
      execSync('bun x tsc --noEmit', { cwd: outDir, stdio: 'pipe' });
    } catch (e) {
      const stderr = (e as { stderr?: Buffer }).stderr?.toString() || '';
      expect(stderr).toBe('');
    }
  }, 30000);

  it('petstore spec output compiles with tsc', () => {
    const { typesPath } = writeGenerated('petstore.json');
    const outDir = resolve(typesPath, '..');

    const tsconfigPath = join(outDir, 'tsconfig.json');
    const tsconfig = JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ['*.ts'],
    }, null, 2);
    writeFileSync(tsconfigPath, tsconfig, 'utf-8');

    try {
      execSync('bun x tsc --noEmit', { cwd: outDir, stdio: 'pipe' });
    } catch (e) {
      const stderr = (e as { stderr?: Buffer }).stderr?.toString() || '';
      expect(stderr).toBe('');
    }
  }, 30000);
});
