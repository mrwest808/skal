import os from 'os';
import fs from 'fs-extra';
import path from 'path';
import Conf from 'conf';
import { errors } from './errors';
import { Commands, Hooks, Editor } from './types';
import { __TEST__ } from './utils';

enum SkalPath {
  Base,
  Config,
  Profiles,
  Symlink,
}

const defaults = {
  basePath: path.join(os.homedir(), '.skal'),
};

// TODO Better & more explicit errors
// TODO Recover logic
export default class Skal {
  static Path = SkalPath;

  readonly basePath: string;

  private config?: Conf;
  private internalOptions?: Conf;

  constructor(basePath: string = defaults.basePath) {
    this.basePath = basePath;
  }

  get initialized(): boolean {
    const initialized = this.getInternalOptionValue<boolean>('initialized');

    if (typeof initialized === 'undefined') {
      return this.tryMigratingFromOldFileStructure();
    }

    return initialized;
  }

  get activeProfile() {
    return this.getInternalOptionValue<string>('activeProfile');
  }

  get editor() {
    return this.getConfigValue<string>('editor');
  }

  private get oldConfigPath() {
    return this.getPath(SkalPath.Base, 'config.json');
  }

  private get oldInternalOptionsPath() {
    return this.getPath(SkalPath.Base, 'internal/_options.json');
  }

  // Public Methods
  // ====================================

  public initialize(editor: Editor = 'vi') {
    const profilesPath = this.getPath(SkalPath.Profiles);
    const defaultProfilePath = path.join(profilesPath, 'default');

    fs.ensureDirSync(profilesPath);
    fs.writeFileSync(defaultProfilePath, '', 'utf-8');

    this.createSymlink(defaultProfilePath);
    this.initializeInternalOptions({
      activeProfile: 'default',
      initialized: true,
    });
    this.initializeConfig({
      editor,
      hooks: {
        onSwitchFrom: {},
        onSwitchTo: {},
      },
    });
  }

  public listAvailableProfiles(): string[] {
    return fs.readdirSync(this.getPath(SkalPath.Profiles));
  }

  public newProfile(profileName: string): string {
    const newProfilePath = this.getPath(SkalPath.Profiles, profileName);

    if (fs.existsSync(newProfilePath)) {
      const error = new Error(`Profile already exists: ${profileName}`);
      throw errors.duplicateProfile(error);
    }

    try {
      fs.writeFileSync(newProfilePath, '', 'utf8');
      return newProfilePath;
    } catch (error) {
      throw error;
    }
  }

  public switchActiveProfile(profileName: string) {
    const currentlyActiveProfile = this.activeProfile;

    if (currentlyActiveProfile === profileName) {
      const error = new Error(`Profile already active (${profileName})`);
      throw errors.profileAlreadyActive(error);
    }

    const profilePath = this.getPath(SkalPath.Profiles, profileName);

    if (!fs.existsSync(profilePath)) {
      const error = new Error(`Could not find profile: ${profileName}`);
      throw errors.missingProfile(error);
    }

    this.setInternalOptionValue('activeProfile', profileName);
    this.createSymlink(profilePath);

    return this.getHookCommands(currentlyActiveProfile, profileName);
  }

  public getPath(location: SkalPath, ...filePaths: string[]): string {
    let filePath;

    switch (location) {
      case SkalPath.Base:
        filePath = this.basePath;
        break;

      case SkalPath.Config:
        if (!this.config) {
          this.initializeConfig();
        }
        filePath = (this.config as Conf).path;
        break;

      case SkalPath.Profiles:
        filePath = path.join(this.basePath, 'profiles');
        break;

      case SkalPath.Symlink:
        filePath = path.join(this.basePath, 'active');
        break;
    }

    if (filePaths && filePaths.length) {
      filePath = path.join(filePath as string, ...filePaths);
    }

    return filePath as string;
  }

  // Private Methods
  // ====================================

  private createSymlink(srcPath: string) {
    const symlinkPath = this.getPath(SkalPath.Symlink);

    if (fs.existsSync(symlinkPath)) {
      fs.removeSync(symlinkPath);
    }

    fs.ensureSymlinkSync(srcPath, symlinkPath, 'file');
  }

  private getHookCommands(fromProfile: string, toProfile: string): Commands {
    const hooks = this.getConfigValue<Hooks>('hooks');
    const fromHooks = hooks.onSwitchFrom[fromProfile] || [];
    const wildcardFromHooks = hooks.onSwitchFrom['*'] || [];
    const toHooks = hooks.onSwitchTo[toProfile] || [];
    const wildcardToHooks = hooks.onSwitchTo['*'] || [];

    return fromHooks.concat(wildcardFromHooks, toHooks, wildcardToHooks);
  }

  private getConfigValue<T>(key: string): T {
    try {
      if (!this.config) {
        this.initializeConfig();
      }

      let value = (this.config as Conf).get(key);

      if (typeof value === 'undefined') {
        value = this.tryMigratingOldConfig<T>(key);
      }

      return value;
    } catch (error) {
      throw error;
    }
  }

  private getInternalOptionValue<T>(key: string): T {
    try {
      if (!this.internalOptions) {
        this.initializeInternalOptions();
      }

      let value = (this.internalOptions as Conf).get(key);

      if (typeof value === 'undefined') {
        value = this.tryMigratingOldInternalOptions<T>(key);
      }

      return value;
    } catch (error) {
      throw error;
    }
  }

  private setInternalOptionValue(key: string, value: any) {
    try {
      if (!this.config) {
        this.initializeInternalOptions();
      }

      (this.internalOptions as Conf).set(key, value);
    } catch (error) {
      throw error;
    }
  }

  private tryMigratingOldConfig<T>(key?: string): T | undefined {
    if (!fs.existsSync(this.oldConfigPath)) {
      return;
    }

    try {
      const jsonString = fs.readFileSync(this.oldConfigPath, 'utf-8');
      const json = JSON.parse(jsonString);
      if (!this.config) this.initializeConfig();
      (this.config as Conf).set(json);

      if (key) {
        return json[key];
      }
    } catch (error) {
      throw error;
    }
  }

  private tryMigratingOldInternalOptions<T>(key?: string): T | undefined {
    if (!fs.existsSync(this.oldInternalOptionsPath)) {
      return;
    }

    try {
      const jsonString = fs.readFileSync(this.oldInternalOptionsPath, 'utf-8');
      const json = JSON.parse(jsonString);
      if (!this.internalOptions) this.initializeInternalOptions();
      (this.internalOptions as Conf).set(json);

      if (key) {
        return json[key];
      }
    } catch (error) {
      throw error;
    }
  }

  private tryMigratingFromOldFileStructure(): boolean {
    if (
      !fs.existsSync(this.oldConfigPath) ||
      !fs.existsSync(this.oldInternalOptionsPath)
    ) {
      return false;
    }

    try {
      this.tryMigratingOldConfig();
      this.tryMigratingOldInternalOptions();
      this.setInternalOptionValue('initialized', true);
      return true;
    } catch (error) {
      // TODO Maybe throw an error here..
      return false;
    }
  }

  private initializeConfig(initialValue?: object) {
    this.config = new Conf({
      ...this.getExtraConfOptions(),
      projectName: 'skal',
      configName: 'config',
      clearInvalidConfig: false,
      schema: {
        editor: {
          type: 'string',
        },
        hooks: {
          type: 'object',
          properties: {
            onSwitchFrom: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
            onSwitchTo: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
          required: ['onSwitchFrom', 'onSwitchTo'],
        },
      },
    });

    if (initialValue) {
      this.config.set(initialValue);
    }
  }

  private initializeInternalOptions(initialValue?: object) {
    this.internalOptions = new Conf({
      ...this.getExtraConfOptions(),
      projectName: 'skal',
      configName: '_internalOptions',
      clearInvalidConfig: false,
      schema: {
        activeProfile: {
          type: 'string',
        },
        isInitialized: {
          type: 'boolean',
        },
      },
    });

    if (initialValue) {
      this.internalOptions.set(initialValue);
    }
  }

  private getExtraConfOptions() {
    let options: { cwd?: string } = {};

    // When running integration tests Conf:s files needs
    // to be stored inside the SkalPath.Base folder
    if (__TEST__) {
      options.cwd = this.getPath(SkalPath.Base, '__conf__');
    }

    return options;
  }
}
