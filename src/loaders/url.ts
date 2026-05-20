export async function loadFromUrl(url: string): Promise<{ data: unknown; source: string }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch spec from ${url}: HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('application/json') || contentType.includes('application/yaml') || contentType.includes('text/yaml')) {
    if (contentType.includes('json')) {
      return { data: JSON.parse(text), source: url };
    }
    const { load: parseYaml } = await import('js-yaml');
    return { data: parseYaml(text), source: url };
  }

  try {
    return { data: JSON.parse(text), source: url };
  } catch {
    const { load: parseYaml } = await import('js-yaml');
    return { data: parseYaml(text), source: url };
  }
}
