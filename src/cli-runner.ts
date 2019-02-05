import path from 'path';
import Skal from './skal';
import { errors } from './errors';
import {
  CliRunnerAction as Action,
  CliRunnerEffects as Effects,
  CliRunnerOptions,
  Reporter,
  Shell,
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
      case Action.EditConfig:
        fn = this.editConfig;
        break;
      case Action.EditProfile:
        fn = this.editProfile;
        break;
      case Action.ListProfiles:
        fn = this.listProfiles;
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
        name: 'shell',
        message: 'What shell are you using?',
        default: 'fish',
      },
      {
        type: 'input',
        name: 'editor',
        message:
          'What editor do you use? (provide the command name you use to edit files in your terminal)',
        default: 'vi',
      },
    ];

    let answers: { shell: Shell; editor: Editor };
    answers = await this.effects.prompt(questions);
    this.skal.initialize(answers.shell, answers.editor);
    this.reporter.initializeDone(this.skal.paths);
  }

  private editConfig() {
    this.openEditor(this.skal.paths.config);
  }

  private async editProfile() {
    const profiles = await this.skal.listProfiles({ extension: true });
    const questions = [
      {
        type: 'list',
        name: 'selected',
        message: 'Which profile do you want to edit?',
        choices: profiles.map(profile => {
          const withoutExt = path.basename(profile, path.extname(profile));

          return {
            name:
              withoutExt === this.skal.activeProfile
                ? `${withoutExt} (active)`
                : withoutExt,
            value: profile,
          };
        }),
      },
    ];

    let answers: { selected: string };
    answers = await this.effects.prompt(questions);
    const profilePath = path.join(this.skal.paths.profiles, answers.selected);
    this.openEditor(profilePath);
  }

  private async listProfiles() {
    const profiles = await this.skal.listProfiles();

    if (!profiles.length) {
      throw errors.noProfiles();
    }

    this.reporter.listProfilesDone(profiles, this.skal.activeProfile);
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
