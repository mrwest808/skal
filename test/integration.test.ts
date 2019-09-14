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
  exists,
} from './test-utils';

const cliPath = path.resolve(__dirname, '../bin/cli.js');
const basePath = path.join(os.tmpdir(), 'skal-test');
const execute = createExecuter(cliPath, {
  env: {
    SKAL_TEST_BASE_PATH: basePath,
  },
});

test('shows help text with --help flag', async () => {
  const response = await execute(['--help']);
  expect(response).toContain('Manage separate shell configurations');
  expect(response).toContain('Usage');
  expect(response).toContain('Commands');
  expect(response).toContain('Options');
});

describe('first run', () => {
  function cleanup() {
    if (exists(basePath)) {
      fs.removeSync(basePath);
    }
  }

  beforeAll(cleanup);
  afterAll(cleanup);

  test('initialization is triggered on the first run', async () => {
    const response = await execute([], [Keys.ENTER]);
    expect(response).toContain('looks like this is your first time using Skal');
    expect(response).toContain(basePath);
    expect(response).toMatch(/what editor do you use?.*vi/im);
  });

  test('initialization creates expected files', () => {
    expect(exists(basePath)).toBe(true);
    expect(exists(relativeTo(basePath, 'profiles/default'))).toBe(true);
    expect(exists(relativeTo(basePath, 'active'))).toBe(true);
  });

  test('<new> command prompts for profile name', async () => {
    const response = await execute(['new'], ['work', Keys.ENTER]);
    expect(response).toContain('Profile name: work');
    expect(response).toContain('Created new profile here:');
    expect(response).toContain(path.join(basePath, 'profiles/work'));
  });

  test('<new> command creates expected file', () => {
    expect(exists(relativeTo(basePath, 'profiles/work'))).toBe(true);
  });

  test('<new> command prevents duplicate profile names', async () => {
    try {
      await execute(['new'], ['work', Keys.ENTER]);
    } catch (error) {
      expect(error).toContain('Profile already exists: work');
    }
  });

  test('<list> command lists available profiles', async () => {
    const response = await execute(['list']);
    expect(response).toContain('Profiles:');
    expect(response).toContain('default (active)');
    expect(response).toContain('work');
  });

  test('<which> command prints path to currently active profile', async () => {
    const response = await execute(['which']);
    expect(response).toContain('Active profile: default');
    expect(response).toContain(path.join(basePath, 'profiles/default'));
  });

  test('<edit> command opens selected file', async () => {
    const response = await execute(['edit'], [Keys.ENTER]);
    expect(response).toContain('Which file do you want to edit?');
    expect(response).toContain(
      `vi ${path.join(basePath, '__conf__/config.json')}`
    );
  });

  test('<switch> command switches the currently active profile', async () => {
    const activePath = path.join(basePath, 'active');
    const workContent = 'Hello!';
    append(path.join(basePath, 'profiles/work'), workContent);

    expect(read(activePath)).not.toContain(workContent);
    const response = await execute([], [Keys.DOWN, Keys.ENTER]);
    expect(response).toContain('Activated profile: work');
    expect(response).not.toMatch(/Ran \d hook/im);
    expect(read(activePath)).toContain(workContent);
  });

  test('<switch> command noop when selecting currently active profile', async () => {
    try {
      await execute([], [Keys.DOWN, Keys.ENTER]);
    } catch (error) {
      expect(error).toContain('Profile already active.');
    }
  });

  test('<switch> command runs hooks, if applicable', async () => {
    const tmpFilePath = path.join(basePath, '.tmpfile');
    const configPath = path.join(basePath, '__conf__/config.json');
    const configString = read(configPath);
    const config = JSON.parse(configString);
    config.hooks.onSwitchFrom.work = ['echo "From work"'];
    config.hooks.onSwitchTo.default = [`touch ${tmpFilePath}`];
    write(configPath, JSON.stringify(config, null, '  '));

    expect(exists(tmpFilePath)).toBe(false);
    const response = await execute([], [Keys.ENTER]);
    expect(response).toContain('Ran 2 hooks.');
    expect(response).toContain('Activated profile: default');
    expect(exists(tmpFilePath)).toBe(true);
  });
});

describe('upgrading from 0.3 to 0.4', () => {
  function setup() {
    cleanup();
    fs.copySync(path.resolve(__dirname, 'fixtures/v0.3'), basePath);
    fs.ensureSymlinkSync(
      relativeTo(basePath, 'profiles/work'),
      relativeTo(basePath, 'active')
    );
  }

  function cleanup() {
    if (exists(basePath)) {
      fs.removeSync(basePath);
    }
  }

  beforeAll(setup);
  afterAll(cleanup);

  test('should initially have an outdated file structure', () => {
    expect(exists(relativeTo(basePath, '__conf__'))).toBe(false);
  });

  test('should avoid new initialization', async () => {
    const response = await execute(['list']);
    expect(response).not.toContain(
      'looks like this is your first time using Skal'
    );
    expect(response).toContain('default');
    expect(response).toContain('work');
  });

  test('migrates old configuration and internal options', async () => {
    expect(exists(relativeTo(basePath, '__conf__'))).toBe(true);
  });
});

describe('recovery', () => {
  test.skip('recovers from corrupt config.json', async () => {
    // ..
  });
});
