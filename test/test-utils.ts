import { EOL } from 'os';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import concat from 'concat-stream';

export const read = (p: string) => fs.readFileSync(p, 'utf8');
export const write = (p: string, s: string) => fs.writeFileSync(p, s, 'utf8');
export const append = (p: string, s: string) => fs.appendFileSync(p, s, 'utf8');

interface EnvironmentVariables {
  [key: string]: string;
}

export function createProcess(
  processPath: string,
  args: string[] = [],
  env: EnvironmentVariables = {}
) {
  args = [processPath].concat(args);
  return spawn('node', args, {
    env: Object.assign(
      {
        NODE_ENV: 'test',
        PATH: process.env.PATH,
      },
      env
    ),
  });
}

interface ExecuteOptions {
  env?: EnvironmentVariables;
  timeout?: number;
}

/**
 * https://gist.github.com/zorrodg/c349cf54a3f6d0a9ba62e0f4066f31cb
 */
export function executeWithInput(
  processPath: string,
  args: string[] = [],
  inputs: string[] = [],
  opts: ExecuteOptions = {}
): Promise<string> {
  const { env, timeout = 100 } = opts;
  const childProcess = createProcess(processPath, args, env);
  childProcess.stdin.setDefaultEncoding('utf8');

  let currentInputTimeout: NodeJS.Timeout;

  const loop = (inputs: string[]) => {
    if (!inputs.length) {
      childProcess.stdin.end();
      return;
    }

    currentInputTimeout = setTimeout(() => {
      childProcess.stdin.write(inputs[0]);
      loop(inputs.slice(1));
    }, timeout);
  };

  const promise = new Promise<string>((resolve, reject) => {
    childProcess.stderr.once('data', err => {
      childProcess.stdin.end();

      if (currentInputTimeout) {
        clearTimeout(currentInputTimeout);
        inputs = [];
      }

      reject(err.toString());
    });

    childProcess.on('error', reject);

    loop(inputs);

    childProcess.stdout.pipe(
      concat(result => {
        resolve(result.toString());
      })
    );
  });

  return promise;
}

export enum Keys {
  DOWN = '\x1B\x5B\x42',
  UP = '\x1B\x5B\x41',
  ENTER = '\x0D',
  SPACE = '\x20',
}

export function splitByEOL(str: string) {
  return str.trim().split(EOL);
}

export function createRelativeExistsCheck(filePath: string) {
  return (...paths: string[]) => {
    return fs.existsSync(path.join(filePath, ...paths));
  };
}
