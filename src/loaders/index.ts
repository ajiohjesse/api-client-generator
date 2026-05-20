import { loadFromFile } from './file.js';
import { loadFromUrl } from './url.js';

export type LoadResult = {
  data: unknown;
  source: string;
};

export async function loadSpec(input: string): Promise<LoadResult> {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return loadFromUrl(input);
  }
  return loadFromFile(input);
}
