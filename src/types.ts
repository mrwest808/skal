import { Question } from 'inquirer';
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

export type Commands = string[];

export interface HookMap {
  [profileName: string]: Commands;
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
  prompt: (questions: Question<any>[]) => Promise<any>;
}

export interface Reporter {
  runError: (error: CustomError | Error) => void;
  initializeIntro: () => void;
  initializeDone: (profilesPath: string, symlinkPath: string) => void;
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
