import { Questions } from 'inquirer';
import { CustomError } from './errors';

export type Shell = 'fish' | 'zsh';
export type Editor = string;

export interface Config {
  shell: Shell;
  editor: Editor;
  hooks: Hooks;
}

export interface Hooks {
  onSwitchFrom: HookMap;
  onSwitchTo: HookMap;
}

export interface HookMap {
  [profileName: string]: HookCmd[];
}

export type HookCmd = string | HookCmdObject;

export interface HookCmdObject {
  cmd: string;
  whenShell?: string;
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

export interface ListProfilesOptions {
  extension?: boolean;
}

export enum CliRunnerAction {
  Initialize,
  EditConfig,
  EditProfile,
  ListProfiles,
  NewProfile,
  SelectProfile,
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
}

export interface CliRunnerOptions {
  action: CliRunnerAction;
  basePath?: string;
  effects: CliRunnerEffects;
  reporter: Reporter;
}
