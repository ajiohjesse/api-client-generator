import { writeFileSync, mkdirSync, existsSync, accessSync } from 'node:fs';
import { W_OK } from 'node:constants';
import { join, resolve } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { loadSpec } from '../loaders/index.js';
import { generate } from '../codegen/index.js';
import type { GeneratorOptions } from '../types.js';

export async function generateCommand(
  input: string,
  output: string,
  options: { clientName?: string; format?: boolean },
): Promise<void> {
  const outDir = resolve(output);

  if (existsSync(outDir)) {
    try {
      accessSync(outDir, W_OK);
    } catch (err) {
      throw new Error(`Output directory is not writable: ${outDir}`, {
        cause: err,
      });
    }
  } else {
    try {
      mkdirSync(outDir, { recursive: true });
    } catch (err) {
      throw new Error(
        `Cannot create output directory "${outDir}": ${(err as Error).message}`,
        {
          cause: err,
        },
      );
    }
  }

  let loadResult: { data: unknown; source: string };
  try {
    loadResult = await loadSpec(input);
  } catch (err) {
    throw new Error(
      `Failed to load spec from "${input}": ${(err as Error).message}`,
      {
        cause: err,
      },
    );
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
    throw new Error(`Failed to generate client: ${(err as Error).message}`, {
      cause: err,
    });
  }

  try {
    const files = [
      { path: join(outDir, 'types.ts'), code: result.typesCode },
      { path: join(outDir, 'client.ts'), code: result.clientCode },
      { path: join(outDir, 'index.ts'), code: result.indexCode },
    ];

    const formattedFiles =
      options.format === false
        ? files
        : await Promise.all(
            files.map(async file => ({
              ...file,
              code: await formatGeneratedCode(file.code, file.path),
            })),
          );

    for (const file of formattedFiles) {
      writeFileSync(file.path, file.code, 'utf-8');
    }
  } catch (err) {
    throw new Error(
      `Failed to format or write output files: ${(err as Error).message}`,
      { cause: err },
    );
  }
}

async function formatGeneratedCode(
  code: string,
  filepath: string,
): Promise<string> {
  const config = await resolveConfig(filepath);
  return format(code, {
    ...config,
    filepath,
    parser: 'typescript',
  });
}
