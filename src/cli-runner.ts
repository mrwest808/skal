import path from 'path';
import Skal from './skal';
import { errors } from './errors';
import {
  CliRunnerAction as Action,
  CliRunnerEffects as Effects,
  CliRunnerOptions,
  Reporter,
  Editor,
} from './types';

export default class CliRunner {
  public readonly action: Action;

  private skal: Skal;
  private effects: Effects;
  private reporter: Reporter;

  constructor(opts: CliRunnerOptions) {
    const skalOpts = opts.basePath ? { basePath: opts.basePath } : undefined;
    const skal = new Skal(skalOpts);
    const action = !skal.initialized ? Action.Initialize : opts.action;

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

    let answers: { editor: Editor };
    answers = await this.effects.prompt(questions);
    this.skal.initialize(answers.editor);
    this.reporter.initializeDone(this.skal.paths);
  }

  private async listProfiles() {
    const profiles = await this.skal.listProfiles();

    if (!profiles.length) {
      throw errors.noProfiles();
    }

    this.reporter.listProfilesDone(profiles, this.skal.activeProfile);
  }

  private whichProfile() {
    const activeProfile = this.skal.activeProfile as string;
    const activeProfilePath = path.join(
      this.skal.paths.profiles,
      activeProfile
    );
    this.reporter.whichProfileDone(activeProfile, activeProfilePath);
  }

  private async edit() {
    const configPath = this.skal.paths.config;
    const profiles = await this.skal.listProfiles();
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
            value: path.join(this.skal.paths.profiles, profile),
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
    const filePath = this.skal.createProfile(answers.name);
    this.reporter.newProfileDone(filePath);
  }

  private async selectProfile() {
    const profiles = await this.skal.listProfiles();
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
    const commands = await this.skal.activateProfile(answers.selected);

    for (let i = 0; i < commands.length; i++) {
      await this.effects.execCommand(commands[i]);
    }

    this.reporter.selectProfileDone(answers.selected, commands);
  }

  private openEditor(filePath: string) {
    if (!this.skal.activeEditor) {
      throw errors.noActiveEditor();
    }

    this.effects.openEditor(this.skal.activeEditor, filePath);
  }
}
