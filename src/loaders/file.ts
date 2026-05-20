import { readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';

export function loadFromFile(filePath: string): { data: unknown; source: string } {
  const content = readFileSync(filePath, 'utf-8');

  if (filePath.endsWith('.json')) {
    return { data: JSON.parse(content), source: filePath };
  }

  if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
    return { data: parseYaml(content), source: filePath };
  }

  try {
    return { data: JSON.parse(content), source: filePath };
  } catch {
    return { data: parseYaml(content) as unknown, source: filePath };
  }
}
