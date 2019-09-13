import { Questions } from 'inquirer';
import { CustomError } from './errors';

export type Editor = string;

export interface Config {
  editor: Editor;
  hooks: Hooks;
}

export interface Hooks {
  onSwitchFrom: HookMap;
  onSwitchTo: HookMap;
}

export interface HookMap {
  [profileName: string]: string[];
}

export interface HookCmdObject {
  cmd: string;
}

export interface InternalOptions {
  activeProfile: string;
}

export interface ConstructorOptions {
  basePath: string;
}

export interface Paths {
  base: string;
  config: string;
  internal: string;
  internalOptions: string;
  profiles: string;
  symlink: string;
  [key: string]: string;
}

export enum CliRunnerAction {
  Initialize,
  ListProfiles,
  NewProfile,
  SelectProfile,
  WhichProfile,
  Edit,
}

export interface CliRunnerEffects {
  execCommand: (cmd: string) => Promise<any>;
  openEditor: (editor: Editor, filePath: string) => void;
  prompt: (questions: Questions<any>) => Promise<any>;
}

export interface Reporter {
  runError: (error: CustomError | Error) => void;
  initializeIntro: () => void;
  initializeDone: (paths: Paths) => void;
  listProfilesDone: (profiles: string[], active?: string) => void;
  newProfileDone: (filePath: string) => void;
  selectProfileDone: (profile: string, commands: string[]) => void;
  whichProfileDone: (profile: string, profilePath: string) => void;
}

export interface CliRunnerOptions {
  action: CliRunnerAction;
  basePath?: string;
  effects: CliRunnerEffects;
  reporter: Reporter;
}
