import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import globby from 'globby';
import Joi from 'joi';
import { errors } from './errors';
import schemas from './schemas';
import {
  Config,
  Shell,
  Editor,
  ConstructorOptions,
  InternalOptions,
  Paths,
  HookCmdObject,
  ListProfilesOptions,
} from './types';

const defaultOptions = {
  basePath: path.join(os.homedir(), '.skal'),
};

export default class Skal {
  public initialized = false;
  public config?: Config;
  public paths: Paths;
  public activeShell?: Shell;
  public activeEditor?: Editor;
  public activeProfile?: string;

  private internalOptions?: InternalOptions;

  constructor(options: ConstructorOptions = defaultOptions) {
    const basePath = options.basePath;
    const configPath = path.join(basePath, 'config.json');
    const internalPath = path.join(basePath, 'internal');
    const profilesPath = path.join(basePath, 'profiles');
    const symlinkPath = path.join(basePath, 'active');
    const internalOptionsPath = path.join(internalPath, '_options.json');

    this.paths = {
      base: basePath,
      config: configPath,
      internal: internalPath,
      internalOptions: internalOptionsPath,
      profiles: profilesPath,
      symlink: symlinkPath,
    };

    // Already initialized
    if (fs.existsSync(basePath)) {
      this.validateFileStructure();
      const internalOptions = this.validateInternalOptions();
      const config = this.validateConfig();
      this.populateProperties(config, internalOptions);
    }
  }

  /**
   * Public methods
   */

  public initialize = (shell: Shell, editor: Editor) => {
    if (!shell) {
      throw errors.missingShell();
    }

    if (['fish', 'zsh'].indexOf(shell) === -1) {
      throw errors.unsupportedShell();
    }

    if (!editor) {
      throw errors.missingEditor();
    }

    fs.ensureDirSync(this.paths.internal);
    fs.ensureDirSync(this.paths.profiles);

    const internalOptions = { activeProfile: 'default' };
    const initialConfig = {
      shell,
      editor,
      hooks: { onSwitchFrom: {}, onSwitchTo: {} },
    };

    const defaultProfilePath = path.join(
      this.paths.profiles,
      `default.${shell}`
    );

    this.createDefaultProfile(defaultProfilePath);
    this.createSymlink(defaultProfilePath);
    this.writeInternalOptions(internalOptions);
    this.writeConfig(initialConfig);
    this.populateProperties(initialConfig, internalOptions);
  };

  public async listProfiles(opts: ListProfilesOptions = {}): Promise<string[]> {
    const ext = `.${this.activeShell}`;
    const pattern = `*${ext}`;
    const profiles = await globby(pattern, {
      cwd: this.paths.profiles,
      transform: filename =>
        opts.extension ? filename : path.basename(filename as string, ext),
    });
    profiles.sort();
    return profiles;
  }

  public createProfile(name: string): string {
    const ext = this.activeShell;
    const filePath = path.join(this.paths.profiles, `${name}.${ext}`);

    if (fs.existsSync(filePath)) {
      const error = new Error(`Profile already exists: ${name}`);
      throw errors.duplicateProfile(error);
    }

    try {
      fs.writeFileSync(filePath, '', 'utf8');
    } catch (error) {
      throw errors.badProfileWrite(error);
    }

    return filePath;
  }

  public async activateProfile(profile: string): Promise<string[]> {
    if (profile === this.activeProfile) {
      const error = new Error(`Profile already active (${profile})`);
      throw errors.profileAlreadyActive(error);
    }

    const profiles = await this.listProfiles();

    if (!profiles.includes(profile)) {
      const error = new Error(`Could not find profile: ${profile}`);
      throw errors.missingProfile(error);
    }

    const fileName = `${profile}.${this.activeShell}`;
    const profilePath = path.join(this.paths.profiles, fileName);
    const lastProfile = this.activeProfile;

    this.setInternalOption('activeProfile', profile);
    this.createSymlink(profilePath);
    this.activeProfile = profile;

    return this.getHooksCommands(lastProfile as string, profile);
  }

  /**
   * Private methods
   */

  private populateProperties(config: Config, internalOptions: InternalOptions) {
    this.initialized = true;
    this.config = config;
    this.activeShell = config.shell;
    this.activeEditor = config.editor;
    this.activeProfile = internalOptions.activeProfile;
    this.internalOptions = internalOptions;
  }

  private createSymlink(srcPath: string) {
    if (fs.existsSync(this.paths.symlink)) {
      fs.removeSync(this.paths.symlink);
    }

    fs.ensureSymlinkSync(srcPath, this.paths.symlink, 'file');
  }

  private createDefaultProfile(profilePath: string) {
    try {
      fs.writeFileSync(profilePath, '', 'utf8');
    } catch (error) {
      throw errors.badDefaultProfileWrite(error);
    }
  }

  private writeInternalOptions(opts: InternalOptions) {
    try {
      const jsonString = JSON.stringify(opts, null, '  ');
      fs.ensureFileSync(this.paths.internalOptions);
      fs.writeFileSync(this.paths.internalOptions, jsonString, 'utf8');
    } catch (error) {
      throw errors.badInternalOptionsWrite(error);
    }
  }

  private writeConfig(config: Config) {
    try {
      const jsonString = JSON.stringify(config, null, '  ');
      fs.ensureFileSync(this.paths.config);
      fs.writeFileSync(this.paths.config, jsonString, 'utf8');
    } catch (error) {
      throw errors.badConfigWrite(error);
    }
  }

  private validateFileStructure(): void {
    Object.entries(this.paths).forEach(([_, filePath]) => {
      if (!fs.existsSync(filePath)) {
        const error = new Error(`Missing file: ${filePath}`);
        throw errors.badFileStructure(error);
      }
    });
  }

  private validateConfig(): Config {
    let config;

    try {
      config = require(this.paths.config);
    } catch (error) {
      throw errors.badConfigRead(error);
    }

    const validationResult = Joi.validate(config, schemas.config);

    if (validationResult.error) {
      throw errors.badConfigFormat(validationResult.error);
    }

    return config;
  }

  private validateInternalOptions(): InternalOptions {
    let options;

    try {
      options = require(this.paths.internalOptions);
    } catch (error) {
      throw errors.badInternalOptionsRead(error);
    }

    const validationResult = Joi.validate(options, schemas.internalOptions);

    if (validationResult.error) {
      throw errors.badInternalOptionsFormat(validationResult.error);
    }

    return options;
  }

  private setInternalOption(key: string, value: any) {
    const newInternalOptions = Object.assign({}, this.internalOptions, {
      [key]: value,
    });
    this.writeInternalOptions(newInternalOptions);
    this.internalOptions = newInternalOptions;
  }

  private getHooksCommands(from: string, to: string): string[] {
    if (!this.config) {
      throw errors.hooksNoConfig();
    }

    const { hooks } = this.config;
    const fromHooks = hooks.onSwitchFrom[from] || [];
    const toHooks = hooks.onSwitchTo[to] || [];
    const commands: string[] = [];

    fromHooks.concat(toHooks).forEach(hook => {
      if (typeof hook === 'string') {
        commands.push(hook);
        return;
      }

      if (
        (hook as HookCmdObject).hasOwnProperty('whenInShell') &&
        (hook as HookCmdObject).whenShell !== this.activeShell
      ) {
        commands.push((hook as HookCmdObject).cmd);
      }
    });

    return commands;
  }
}
