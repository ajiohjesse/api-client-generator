#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { generateCommand } from './commands/generate.js';

const program = new Command();

program
  .name('@rehx/api-client-generator')
  .description('Generate a typesafe fetch-based API client from an OpenAPI 3.x spec')
  .version('0.1.0');

program
  .command('generate')
  .alias('gen')
  .description('Generate an API client from an OpenAPI spec')
  .requiredOption('-i, --input <path>', 'Path or URL to the OpenAPI spec (JSON or YAML)')
  .requiredOption('-o, --output <directory>', 'Output directory for the generated client')
  .option('-n, --name <name>', 'Name for the generated client class', 'ApiClient')
  .action(async (options: { input: string; output: string; name: string }) => {
    try {
      await generateCommand(options.input, options.output, {
        clientName: options.name,
      });
      console.log(chalk.green('✓ API client generated successfully'));
      console.log(chalk.dim(`  Output: ${options.output}/`));
      console.log(chalk.dim('  Files: types.ts, client.ts, index.ts'));
    } catch (error) {
      console.error(chalk.red('✗ Error:'), (error as Error).message);
      process.exit(1);
    }
  });

program.parse(process.argv);
