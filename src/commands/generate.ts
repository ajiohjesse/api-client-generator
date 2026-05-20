import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
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

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const { data } = await loadSpec(input);

  const genOptions: GeneratorOptions = {
    clientName: options.clientName,
    output: outDir,
  };

  const result = generate(data, genOptions);

  writeFileSync(join(outDir, 'types.ts'), result.typesCode, 'utf-8');
  writeFileSync(join(outDir, 'client.ts'), result.clientCode, 'utf-8');
  writeFileSync(join(outDir, 'index.ts'), result.indexCode, 'utf-8');
}
