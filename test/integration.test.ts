import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import {
  Keys,
  createExecuter,
  relativeTo,
  read,
  write,
  append,
} from './test-utils';

const cliPath = path.resolve(__dirname, '../bin/cli.js');
const basePath = path.join(os.tmpdir(), 'skal-test');
const execute = createExecuter(cliPath, {
  env: {
    SKAL_TEST_BASE_PATH: basePath,
  },
});

function cleanup() {
  if (fs.existsSync(basePath)) {
    fs.removeSync(basePath);
  }
}

beforeAll(cleanup);
afterAll(cleanup);

test('shows help text with --help flag', async () => {
  const response = await execute(['--help']);
  expect(response).toContain('Manage separate shell configurations');
  expect(response).toContain('Usage');
  expect(response).toContain('Commands');
  expect(response).toContain('Options');
});

describe('initialization', () => {
  test('is triggered on the first run', async () => {
    const response = await execute([], [Keys.ENTER]);
    expect(response).toContain('looks like this is your first time using Skal');
    expect(response).toContain(basePath);
    expect(response).toMatch(/what editor do you use?.*vi/im);
  });

  test('creates expected files', () => {
    expect(fs.existsSync(basePath)).toBe(true);
    expect(fs.existsSync(relativeTo(basePath, 'config.json'))).toBe(true);
    expect(fs.existsSync(relativeTo(basePath, 'profiles/default'))).toBe(true);
    expect(fs.existsSync(relativeTo(basePath, 'active'))).toBe(true);
  });
});

describe('new command', () => {
  test('prompts for profile name', async () => {
    const response = await execute(['new'], ['work', Keys.ENTER]);
    expect(response).toContain('Profile name: work');
    expect(response).toContain('Created new profile here:');
    expect(response).toContain(path.join(basePath, 'profiles/work'));
  });

  test('created expected file', () => {
    expect(fs.existsSync(relativeTo(basePath, 'profiles/work'))).toBe(true);
  });

  test('prevents duplicate profile names', async () => {
    try {
      await execute(['new'], ['work', Keys.ENTER]);
    } catch (error) {
      expect(error).toContain('Profile already exists: work');
    }
  });
});

describe('list command', () => {
  test('lists available profiles', async () => {
    const response = await execute(['list']);
    expect(response).toContain('Profiles:');
    expect(response).toContain('default (active)');
    expect(response).toContain('work');
  });
});

describe('which command', () => {
  test('prints path to currently active profile', async () => {
    const response = await execute(['which']);
    expect(response).toContain('Active profile: default');
    expect(response).toContain(path.join(basePath, 'profiles/default'));
  });
});

describe('edit command', () => {
  test('opens selected file', async () => {
    const response = await execute(['edit'], [Keys.ENTER]);
    expect(response).toContain('Which file do you want to edit?');
    expect(response).toContain(`vi ${path.join(basePath, 'config.json')}`);
  });
});

describe('switch command', () => {
  test('switches the currently active profile', async () => {
    const activePath = path.join(basePath, 'active');
    const workContent = 'Hello!';
    append(path.join(basePath, 'profiles/work'), workContent);

    expect(read(activePath)).not.toContain(workContent);
    const response = await execute([], [Keys.DOWN, Keys.ENTER]);
    expect(response).toContain('Activated profile: work');
    expect(response).not.toMatch(/Ran \d hook/im);
    expect(read(activePath)).toContain(workContent);
  });

  test('noop when selecting currently active profile', async () => {
    try {
      await execute([], [Keys.DOWN, Keys.ENTER]);
    } catch (error) {
      expect(error).toContain('Profile already active.');
    }
  });

  test('runs hooks, if applicable', async () => {
    const configPath = path.join(basePath, 'config.json');
    const configString = read(configPath);
    const config = JSON.parse(configString);
    config.hooks.onSwitchFrom.work = ['echo "From work"'];
    config.hooks.onSwitchTo.default = ['echo "To default"'];
    write(configPath, JSON.stringify(config, null, '  '));

    const response = await execute([], [Keys.ENTER]);
    expect(response).toContain('Ran 2 hooks.');
    expect(response).toContain('Activated profile: default');
  });
});

describe('recovery', () => {
  test.skip('recovers from corrupt config.json', async () => {
    // ..
  });
});
