import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import Skal from '../src/skal';
import { ErrorCode } from '../src/errors';
import { expectWithMessage, re, read, write, copy } from './test-utils';

const tmpPath = path.join(os.tmpdir(), 'skal');
const fixturesPath = path.resolve(__dirname, 'fixtures');

const testPaths = {
  instantiation: path.join(tmpPath, 'instantiation'),
  initialize: path.join(tmpPath, 'initialize'),
  createProfile: path.join(tmpPath, 'createProfile'),
  activateProfile: path.join(tmpPath, 'activateProfile'),
  internalOptionsValidation: path.join(tmpPath, 'internalOptionsValidation'),
  configValidation: path.join(tmpPath, 'configValidation'),
  hooks: path.join(tmpPath, 'hooks'),
};

function cleanup() {
  Object.entries(testPaths).forEach(([_, filePath]) => {
    if (fs.existsSync(filePath)) {
      fs.removeSync(filePath);
    }
  });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('instantiation', () => {
  const basePath = testPaths.instantiation;
  const instance = new Skal({ basePath });

  test('no files are created', () => {
    Object.entries(instance.paths).forEach(([_, filePath]) => {
      const actual = fs.existsSync(filePath);
      const message = `Didn't expect file to exist: ${filePath}`;
      expectWithMessage(actual, message).toBe(false);
    });
  });

  test('.initialized is false', () => {
    expect(instance.initialized).toBe(false);
  });

  test('.config is undefined', () => {
    expect(instance.config).toBeUndefined();
  });
});

describe('.initialize()', () => {
  const basePath = testPaths.initialize;
  const instance = new Skal({ basePath });
  const editorArg = 'vi';

  test('throws when invoked with invalid args', () => {
    const noArgs = () => (instance.initialize as any)();
    const goodArgs = () => instance.initialize(editorArg);

    expect(noArgs).toThrow(re(ErrorCode.MissingEditor));
    expect(goodArgs).not.toThrow();
  });

  test('creates files', () => {
    Object.entries(instance.paths).forEach(([_, filePath]) => {
      const actual = fs.existsSync(filePath);
      const message = `Expected file to exist: ${filePath}`;
      expectWithMessage(actual, message).toBe(true);
    });

    const defaultProfilePath = path.join(instance.paths.profiles, 'default');
    expect(fs.existsSync(defaultProfilePath)).toBe(true);
  });

  test('sets public properties', () => {
    expect(instance.initialized).toBe(true);
    expect(instance.config).toBeDefined();
    expect(instance.config).toHaveProperty('hooks');
    expect(instance.activeEditor).toBe(editorArg);
    expect(instance.activeProfile).toBe('default');
    const pathRegex = new RegExp(`^${basePath}`);
    expect(instance.paths).toMatchObject({
      base: pathRegex,
      config: pathRegex,
      internal: pathRegex,
      internalOptions: pathRegex,
      profiles: pathRegex,
      symlink: pathRegex,
    });
  });
});

describe('.listProfiles()', () => {
  const basePath = path.join(fixturesPath, 'simple');
  const instance = new Skal({ basePath });

  test('lists available profiles (without extension)', async () => {
    const profiles = await instance.listProfiles();
    expect(profiles).toEqual(['one.fish', 'two.fish']);
  });
});

describe('.createProfile()', () => {
  const copyPath = path.join(fixturesPath, 'simple');
  const basePath = testPaths.createProfile;
  let instance: Skal;

  beforeAll(done => {
    copy(copyPath, basePath, () => {
      instance = new Skal({ basePath });
      done();
    });
  });

  test('throws on duplication', () => {
    const fn = () => instance.createProfile('two.fish');
    expect(fn).toThrow(re(ErrorCode.DuplicateProfile));
  });

  test('creates new profile file', async done => {
    const newProfilePath = instance.createProfile('three');
    const profiles = await instance.listProfiles();
    expect(fs.existsSync(newProfilePath)).toBe(true);
    expect(profiles).toContain('three');
    done();
  });
});

describe('.activateProfile()', () => {
  const copyPath = path.join(fixturesPath, 'simple');
  const basePath = testPaths.activateProfile;
  let instance: Skal;
  let initialOptions: string;

  beforeAll(done => {
    copy(copyPath, basePath, () => {
      instance = new Skal({ basePath });
      initialOptions = read(instance.paths.internalOptions);
      done();
    });
  });

  test('throws on already active', async () => {
    const promise = instance.activateProfile('one.fish');
    await expect(promise).rejects.toThrow(re(ErrorCode.ProfileAlreadyActive));
  });

  test('throws on missing profile', async () => {
    const promise = instance.activateProfile('four.fish');
    await expect(promise).rejects.toThrow(re(ErrorCode.MissingProfile));
  });

  test('updates active profile', async () => {
    await instance.activateProfile('two.fish');
    expect(instance.activeProfile).toBe('two.fish');
  });

  test('updates _active file', () => {
    const currentActive = read(instance.paths.symlink);
    const profile = read(path.join(instance.paths.profiles, 'two.fish'));
    expect(currentActive).toBe(profile);
  });

  test('updates _options.json file', () => {
    expect(read(instance.paths.internalOptions)).not.toBe(initialOptions);
  });
});

describe('internal options validation', () => {
  const copyPath = path.join(fixturesPath, 'simple');
  const basePath = testPaths.internalOptionsValidation;
  const internalOptionsPath = path.join(basePath, 'internal/_options.json');

  beforeAll(done => copy(copyPath, basePath, done));

  test('throws on invalid format', () => {
    const jsonString = JSON.stringify({}, null, '  ');
    write(internalOptionsPath, jsonString);
    const fn = () => new Skal({ basePath });
    expect(fn).toThrow(re(ErrorCode.BadInternalOptionsFormat));
  });
});

describe('config validation', () => {
  const copyPath = path.join(fixturesPath, 'simple');
  const basePath = testPaths.configValidation;
  const configPath = path.join(basePath, 'config.json');

  beforeAll(done => copy(copyPath, basePath, done));

  test('throws on invalid format', () => {
    const jsonString = JSON.stringify({ hooks: {} }, null, '  ');
    write(configPath, jsonString);
    const fn = () => new Skal({ basePath });
    expect(fn).toThrow(re(ErrorCode.BadConfigFormat));
  });
});

describe('hooks', () => {
  const copyPath = path.join(fixturesPath, 'hooks');
  const basePath = testPaths.hooks;
  let instance: Skal;

  beforeAll(done => {
    copy(copyPath, basePath, () => {
      instance = new Skal({ basePath });
      done();
    });
  });

  test('.activateProfile() returns a list of hook commands', async () => {
    expect(instance.activeProfile).toBe('one.fish');
    const commands = await instance.activateProfile('two.fish');
    expect(instance.activeProfile).toBe('two.fish');
    expect(commands).toEqual([
      "echo 'Switching profile...'",
      "echo 'Switching to two'",
    ]);
    const newCommands = await instance.activateProfile('one.fish');
    expect(instance.activeProfile).toBe('one.fish');
    expect(newCommands).toEqual([
      "echo 'Switching profile...'",
      "echo 'Switching from two'",
      "echo 'Switching to one'",
    ]);
  });
});
