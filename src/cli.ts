#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execSync } from 'child_process';
import { CursorAPIClient } from './api-client.js';
import { logger } from './utils/logger.js';
import { ApiError } from './types/index.js';
import { startMcpServer } from './mcp/server.js';

interface Arguments {
  token?: string;
  composerId?: string;
  taskDescription?: string;
  repositoryUrl?: string;
  message?: string;
  format: 'json' | 'table' | 'raw';
  verbose: boolean;
  port?: number;
  _: (string | number)[];
}

function getRepositoryUrl(): string {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    return remoteUrl;
  } catch (error) {
    return 'https://github.com/mjdierkes/cursor-background-agent-api.git';
  }
}

function printParsedResponse(response: any, format: string) {
  if (format === 'json') {
    console.log(JSON.stringify(response, null, 2));
    return;
  }
  
  if (format === 'raw') {
    console.log(response);
    return;
  }
  
  // Table format (default)
  if (response.summary) {
    console.log(`\n${response.summary}`);
    if (response.details && response.details.length > 0) {
      response.details.forEach((detail: string) => console.log(detail));
    }
  } else {
    console.log(JSON.stringify(response, null, 2));
  }
}

async function runCommand(args: Arguments) {
  try {
    const client = new CursorAPIClient(args.token);
    const command = args._[0] as string;
    
    switch (command) {
      case 'list': {
        const composers = await client.listComposersParsed();
        printParsedResponse(composers, args.format);
        break;
      }
        
      case 'web-access': {
        const webAccess = await client.checkWebAccessParsed();
        printParsedResponse(webAccess, args.format);
        break;
      }
        
      case 'privacy': {
        const privacy = await client.getPrivacyModeParsed();
        printParsedResponse(privacy, args.format);
        break;
      }
        
      case 'settings': {
        const settings = await client.getUserSettingsParsed();
        printParsedResponse(settings, args.format);
        break;
      }
        
      case 'test': {
        const testResult = await client.testAllEndpoints();
        if (args.format === 'json') {
          console.log(JSON.stringify(testResult, null, 2));
        } else {
          console.log('\n=== Test Results ===');
          if (testResult.success) {
            console.log('✓ API test completed successfully');
            console.log('✓ Create Background Composer - Success');
            console.log('✓ List Background Composers - Success');
            console.log('✓ Check Web Access - Success');
          } else {
            console.log('✗ API test failed');
            if (testResult.error) {
              console.log(`  Error: ${testResult.error}`);
            }
          }
          
          console.log('\n=== Summary ===');
          if (testResult.success) {
            console.log('✓ All core endpoints working correctly');
          } else {
            console.log('✗ Test failed - check your authentication and repository access');
          }
        }
        break;
      }
        
      case 'create': {
        if (!args.taskDescription) {
          throw new Error('Task description is required for create command');
        }
        
        const repositoryUrl = args.repositoryUrl || getRepositoryUrl();
        logger.info(`Using repository URL: ${repositoryUrl}`);
        
        const options = {
          taskDescription: args.taskDescription,
          repositoryUrl,
          branch: 'main',
          model: 'claude-4-sonnet-thinking'
        };
        
        const result = await client.createBackgroundComposer(options);
        printParsedResponse(result, args.format);
        break;
      }
        
      case 'details': {
        if (!args.composerId) {
          throw new Error('Composer ID is required for details command');
        }
        
        const details = await client.getDetailedComposer(args.composerId);
        printParsedResponse(details, args.format);
        break;
      }
        
      case 'followup': {
        if (!args.composerId) {
          throw new Error('Composer ID is required for followup command');
        }
        if (!args.message) {
          throw new Error('Message is required for followup command');
        }
        
        const result = await client.addFollowupMessage(args.composerId, args.message);
        printParsedResponse(result, args.format);
        break;
      }
        
      case 'mcp-server': {
        const port = args.port || 3001;
        logger.info(`Starting MCP server on port ${port}...`);
        await startMcpServer(port);
        break;
      }
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error(`API Error (${error.status}): ${error.message}`);
      if (args.verbose && error.response) {
        console.error('Response:', JSON.stringify(error.response, null, 2));
      }
    } else if (error instanceof Error) {
      logger.error(`Error: ${error.message}`);
    } else {
      logger.error('Unknown error occurred');
    }
    process.exit(1);
  }
}

const argv = yargs(hideBin(process.argv))
  .scriptName('cursor-api')
  .usage('Usage: $0 <command> [options]')
  .command('list', 'List background composers')
  .command('web-access', 'Check agent web access')
  .command('privacy', 'Get privacy mode settings')
  .command('settings', 'Get user settings')
  .command('test', 'Test all API endpoints')
  .command('create', 'Create a new background composer task', (yargs) => {
    return yargs
      .option('task-description', {
        alias: 'd',
        describe: 'Task description (prompt)',
        type: 'string',
        demandOption: true
      })
      .option('repository-url', {
        alias: 'r',
        describe: 'Repository URL (defaults to current git remote)',
        type: 'string'
      });
  })
  .command('details', 'Get detailed composer information', (yargs) => {
    return yargs
      .option('composer-id', {
        alias: 'id',
        describe: 'Composer ID',
        type: 'string',
        demandOption: true
      });
  })
  .command('followup', 'Send a followup message to an existing background composer', (yargs) => {
    return yargs
      .option('composer-id', {
        alias: 'id',
        describe: 'Background Composer ID',
        type: 'string',
        demandOption: true
      })
      .option('message', {
        alias: 'm',
        describe: 'Followup message text',
        type: 'string',
        demandOption: true
      });
  })
  .command('mcp-server', 'Start MCP server', (yargs) => {
    return yargs
      .option('port', {
        alias: 'p',
        describe: 'Port to run MCP server on',
        type: 'number',
        default: 3001
      });
  })
  .option('token', {
    alias: 'T',
    describe: 'Session token (overrides environment variable)',
    type: 'string'
  })
  .option('format', {
    alias: 'f',
    describe: 'Output format',
    choices: ['json', 'table', 'raw'] as const,
    default: 'table' as const
  })
  .option('verbose', {
    alias: 'v',
    describe: 'Verbose output',
    type: 'boolean',
    default: false
  })
  .demandCommand(1, 'You must specify a command')
  .help()
  .alias('help', 'h')
  .parseSync() as Arguments;

// Set log level based on verbose flag
if (argv.verbose) {
  process.env.LOG_LEVEL = 'debug';
}

// Run the command
runCommand(argv);  