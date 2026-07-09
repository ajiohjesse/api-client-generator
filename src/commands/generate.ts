import { writeFileSync, mkdirSync, existsSync, accessSync } from 'node:fs';
import { W_OK } from 'node:constants';
import { join, resolve } from 'node:path';
import { loadSpec } from '../loaders/index.js';
import { generate } from '../codegen/index.js';
import type { GeneratorOptions } from '../types.js';

export async function generateCommand(
  input: string,
  output: string,
  options: { clientName?: string }
): Promise<void> {
  const outDir = resolve(output);

  if (existsSync(outDir)) {
    try {
      accessSync(outDir, W_OK);
    } catch {
      throw new Error(`Output directory is not writable: ${outDir}`);
    }
  } else {
    try {
      mkdirSync(outDir, { recursive: true });
    } catch (err) {
      throw new Error(`Cannot create output directory "${outDir}": ${(err as Error).message}`);
    }
  }

  let loadResult: { data: unknown; source: string };
  try {
    loadResult = await loadSpec(input);
  } catch (err) {
    throw new Error(`Failed to load spec from "${input}": ${(err as Error).message}`);
  }

  const spec = loadResult.data as Record<string, unknown>;

  const genOptions: GeneratorOptions = {
    clientName: options.clientName,
    output: outDir,
  };

  let result: ReturnType<typeof generate>;
  try {
    result = generate(spec, genOptions);
  } catch (err) {
    throw new Error(`Failed to generate client: ${(err as Error).message}`);
  }

  try {
    writeFileSync(join(outDir, 'types.ts'), result.typesCode, 'utf-8');
    writeFileSync(join(outDir, 'client.ts'), result.clientCode, 'utf-8');
    writeFileSync(join(outDir, 'index.ts'), result.indexCode, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to write output files: ${(err as Error).message}`);
  }
}
