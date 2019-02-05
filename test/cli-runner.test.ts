import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { parallel } from 'async';
import CliRunner from '../src/cli-runner';
import {
  CliRunnerAction as Action,
  CliRunnerEffects as Effects,
  Reporter,
} from '../src/types';
import { copy, read } from './test-utils';

const tmpPath = path.join(os.tmpdir(), 'cli-runner');
const fixturesPath = path.resolve(__dirname, 'fixtures');

const testPaths = {
  instantiationNotInitialized: path.join(tmpPath, 'not-instantiation'),
  instantiationInitialized: path.join(tmpPath, 'initialized'),
  editConfig: path.join(tmpPath, 'edit-config'),
  editProfile: path.join(tmpPath, 'edit-profile'),
  listProfiles: path.join(tmpPath, 'list-profiles'),
  newProfile: path.join(tmpPath, 'new-profile'),
  selectProfile: path.join(tmpPath, 'select-profile'),
  selectProfileWithHooks: path.join(tmpPath, 'select-profile-hooks'),
};

function createMockEffects(promptAnswers: object = {}): Effects {
  return {
    execCommand: jest.fn(x => Promise.resolve(x)),
    openEditor: jest.fn(x => x),
    prompt: jest.fn(() => Promise.resolve(promptAnswers)),
  };
}

function createMockReporter(): Reporter {
  return {
    runError: jest.fn(x => x),
    initializeIntro: jest.fn(x => x),
    initializeDone: jest.fn(x => x),
    listProfilesDone: jest.fn(x => x),
    newProfileDone: jest.fn(x => x),
    selectProfileDone: jest.fn(x => x),
  };
}

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
  const fixture = path.join(fixturesPath, 'simple');

  beforeAll(done => copy(fixture, testPaths.instantiationInitialized, done));

  test('instantiation (not initialized)', async () => {
    const basePath = testPaths.instantiationNotInitialized;
    const answers = { shell: 'fish', editor: 'vi' };
    const opts = {
      action: Action.SelectProfile,
      basePath,
      effects: createMockEffects(answers),
      reporter: createMockReporter(),
    };
    const runner = new CliRunner(opts);

    expect(runner.action).toBe(Action.Initialize);
    expect(fs.existsSync(basePath)).toBe(false);
    await runner.run();
    expect(runner.run()).resolves.toBeUndefined();
    expect(fs.existsSync(basePath)).toBe(true);
    expect(opts.reporter.initializeIntro).toBeCalled();
    expect(opts.reporter.initializeDone).toBeCalled();
  });

  test('instantiation (initialized)', async () => {
    const basePath = testPaths.instantiationInitialized;
    const opts = {
      action: Action.ListProfiles,
      basePath,
      effects: createMockEffects(),
      reporter: createMockReporter(),
    };
    const runner = new CliRunner(opts);

    expect(runner.action).toBe(Action.ListProfiles);
    await runner.run();
  });
});

describe('actions', () => {
  const fixture = path.join(fixturesPath, 'simple');
  const fixtureWithHooks = path.join(fixturesPath, 'hooks');

  beforeAll(done =>
    parallel(
      [
        cb => copy(fixture, testPaths.editConfig, cb),
        cb => copy(fixture, testPaths.editProfile, cb),
        cb => copy(fixture, testPaths.listProfiles, cb),
        cb => copy(fixture, testPaths.newProfile, cb),
        cb => copy(fixture, testPaths.selectProfile, cb),
        cb => copy(fixtureWithHooks, testPaths.selectProfileWithHooks, cb),
      ],
      done
    )
  );

  test('listProfiles', async () => {
    const basePath = testPaths.listProfiles;
    const profiles = ['one', 'two'];
    const opts = {
      action: Action.ListProfiles,
      basePath,
      effects: createMockEffects(),
      reporter: createMockReporter(),
    };
    const runner = new CliRunner(opts);

    expect(runner.action).toBe(Action.ListProfiles);
    await runner.run();
    expect(opts.reporter.listProfilesDone).toBeCalledWith(profiles, 'one');
  });

  test('editConfig', async () => {
    const basePath = testPaths.editConfig;
    const configPath = path.join(basePath, 'config.json');
    const opts = {
      action: Action.EditConfig,
      basePath,
      effects: createMockEffects(),
      reporter: createMockReporter(),
    };
    const runner = new CliRunner(opts);

    expect(runner.action).toBe(Action.EditConfig);
    await runner.run();
    expect(opts.effects.openEditor).toBeCalledWith('vi', configPath);
  });

  test('editProfile', async () => {
    const basePath = testPaths.editProfile;
    const profilePath = path.join(basePath, 'profiles/one.fish');
    const opts = {
      action: Action.EditProfile,
      basePath,
      effects: createMockEffects({ selected: 'one.fish' }),
      reporter: createMockReporter(),
    };
    const runner = new CliRunner(opts);

    expect(runner.action).toBe(Action.EditProfile);
    await runner.run();
    expect(opts.effects.openEditor).toBeCalledWith('vi', profilePath);
  });

  test('newProfile', async () => {
    const basePath = testPaths.newProfile;
    const profilePath = path.join(basePath, 'profiles/three.fish');
    const opts = {
      action: Action.NewProfile,
      basePath,
      effects: createMockEffects({ name: 'three' }),
      reporter: createMockReporter(),
    };
    const runner = new CliRunner(opts);

    expect(runner.action).toBe(Action.NewProfile);
    await runner.run();
    expect(fs.existsSync(profilePath)).toBe(true);
    expect(opts.reporter.newProfileDone).toBeCalledWith(profilePath);
  });

  test('selectProfile', async () => {
    const basePath = testPaths.selectProfile;
    const paths = {
      symlink: path.join(basePath, 'active'),
      profileOne: path.join(basePath, 'profiles/one.fish'),
      profileTwo: path.join(basePath, 'profiles/two.fish'),
    };
    const opts = {
      action: Action.SelectProfile,
      basePath,
      effects: createMockEffects({ selected: 'two' }),
      reporter: createMockReporter(),
    };
    const runner = new CliRunner(opts);

    expect(runner.action).toBe(Action.SelectProfile);
    expect(read(paths.symlink)).toBe(read(paths.profileOne));
    await runner.run();
    expect(read(paths.symlink)).toBe(read(paths.profileTwo));
    expect(opts.reporter.selectProfileDone).toBeCalledWith('two', []);
  });

  test('selectProfile with hooks', async () => {
    const basePath = testPaths.selectProfileWithHooks;
    const paths = {
      symlink: path.join(basePath, 'active'),
      profileOne: path.join(basePath, 'profiles/one.fish'),
      profileTwo: path.join(basePath, 'profiles/two.fish'),
    };
    const opts = {
      action: Action.SelectProfile,
      basePath,
      effects: createMockEffects({ selected: 'two' }),
      reporter: createMockReporter(),
    };
    const runner = new CliRunner(opts);

    expect(runner.action).toBe(Action.SelectProfile);
    expect(read(paths.symlink)).toBe(read(paths.profileOne));
    await runner.run();
    const commands = ["echo 'Switching to two'"];
    expect(read(paths.symlink)).toBe(read(paths.profileTwo));
    expect(opts.effects.execCommand).toBeCalledTimes(1);
    expect(opts.effects.execCommand).toBeCalledWith(commands[0]);
    expect(opts.reporter.selectProfileDone).toBeCalledWith('two', commands);
  });
});
