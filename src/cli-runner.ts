import os from 'os';
import path from 'path';
import Skal from './skal';
import { errors } from './errors';
import Paths from './paths';
import PersistentStore from './persistent-store';
import {
  CliRunnerAction as Action,
  CliRunnerEffects as Effects,
  CliRunnerOptions,
  Reporter,
} from './types';
import { __TEST__ } from './utils';

const defaults = {
  basePath: path.join(os.homedir(), '.skal'),
};

export default class CliRunner {
  public readonly action: Action;

  private paths: Paths;
  private userConfig: PersistentStore;
  private skal: Skal;
  private effects: Effects;
  private reporter: Reporter;

  constructor(opts: CliRunnerOptions) {
    const basePath = opts.basePath || defaults.basePath;
    const paths = new Paths(basePath);
    const internalOptionsStore = new PersistentStore(
      PersistentStore.Type.InternalOptions,
      __TEST__ ? basePath : undefined
    );
    const userConfigStore = new PersistentStore(
      PersistentStore.Type.UserConfig,
      __TEST__ ? basePath : undefined
    );
    const skal = new Skal(paths, internalOptionsStore, userConfigStore);
    const action = !skal.initialized ? Action.Initialize : opts.action;

    this.paths = paths;
    this.userConfig = userConfigStore;
    this.skal = skal;
    this.action = action;
    this.effects = opts.effects;
    this.reporter = opts.reporter;
  }

  public async run() {
    let fn;

    switch (this.action) {
      case Action.Initialize:
        fn = this.initialize;
        break;
      case Action.ListProfiles:
        fn = this.listProfiles;
        break;
      case Action.WhichProfile:
        fn = this.whichProfile;
        break;
      case Action.Edit:
        fn = this.edit;
        break;
      case Action.NewProfile:
        fn = this.newProfile;
        break;
      case Action.SelectProfile:
      default:
        fn = this.selectProfile;
        break;
    }

    try {
      fn = fn.bind(this);
      await fn();
    } catch (error) {
      this.reporter.runError(error);
      return;
    }
  }

  private async initialize() {
    this.reporter.initializeIntro();
    const questions = [
      {
        type: 'input',
        name: 'editor',
        message:
          'What editor do you use? (provide the command name you use to edit files in your terminal)',
        default: 'vi',
      },
    ];

    const answers = await this.effects.prompt(questions);
    this.skal.initialize(answers.editor);
    this.reporter.initializeDone(this.paths.profiles, this.paths.symlink);
  }

  private listProfiles() {
    const profiles = this.skal.listAvailableProfiles();

    if (!profiles.length) {
      throw errors.noProfiles();
    }

    this.reporter.listProfilesDone(profiles, this.skal.activeProfile);
  }

  private whichProfile() {
    const activeProfile = this.skal.activeProfile;
    const activeProfilePath = this.paths.profile(activeProfile);
    this.reporter.whichProfileDone(activeProfile, activeProfilePath);
  }

  private async edit() {
    const configPath = this.userConfig.getPath();
    const profiles = this.skal.listAvailableProfiles();
    const questions = [
      {
        type: 'list',
        name: 'filePath',
        message: 'Which file do you want to edit?',
        choices: [
          { name: 'config.json', value: configPath },
          ...profiles.map(profile => ({
            name:
              profile === this.skal.activeProfile
                ? `profiles/${profile} (active)`
                : `profiles/${profile}`,
            value: this.paths.profile(profile),
          })),
        ],
      },
    ];

    const { filePath } = await this.effects.prompt(questions);
    this.openEditor(filePath);
  }

  private async newProfile() {
    const questions = [
      {
        type: 'input',
        name: 'name',
        message: 'Profile name:',
        filter: (val: string) => val.toLowerCase(),
      },
    ];

    let answers: { name: string };
    answers = await this.effects.prompt(questions);
    const filePath = this.skal.newProfile(answers.name);
    this.reporter.newProfileDone(filePath);
  }

  private async selectProfile() {
    const profiles = this.skal.listAvailableProfiles();
    const questions = [
      {
        type: 'list',
        name: 'selected',
        message: 'Which profile do you want to switch to?',
        choices: profiles.map(profile => ({
          name:
            profile === this.skal.activeProfile
              ? `${profile} (active)`
              : profile,
          value: profile,
        })),
      },
    ];

    let answers: { selected: string };
    answers = await this.effects.prompt(questions);
    const commands = this.skal.switchActiveProfile(answers.selected);

    for (let i = 0; i < commands.length; i++) {
      await this.effects.execCommand(commands[i]);
    }

    this.reporter.selectProfileDone(answers.selected, commands);
  }

  private openEditor(filePath: string) {
    if (!this.skal.editor) {
      throw errors.noActiveEditor();
    }

    this.effects.openEditor(this.skal.editor, filePath);
  }
}
