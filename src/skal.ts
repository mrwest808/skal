import fs from 'fs-extra';
import { errors } from './errors';
import { Commands, Hooks, Editor } from './types';
import { __TEST__ } from './utils';
import PersistentStore from './persistent-store';
import Paths from './paths';

enum SkalPath {
  Base,
  Config,
  Profiles,
  Symlink,
}

// TODO Better & more explicit errors
// TODO Recover logic
export default class Skal {
  static Path = SkalPath;

  private paths: Paths;
  private internalOptions: PersistentStore;
  private userConfig: PersistentStore;

  constructor(
    paths: Paths,
    internalOptions: PersistentStore,
    userConfig: PersistentStore
  ) {
    this.paths = paths;
    this.internalOptions = internalOptions;
    this.userConfig = userConfig;
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
    return this.paths.rel('config.json');
  }

  private get oldInternalOptionsPath() {
    return this.paths.rel('internal/_options.json');
  }

  //
  // Public Methods
  // ====================================

  public initialize(editor: Editor = 'vi') {
    const defaultProfilePath = this.paths.profile('default');

    fs.ensureDirSync(this.paths.profiles);
    fs.writeFileSync(defaultProfilePath, '', 'utf-8');

    this.createSymlink(defaultProfilePath);
    this.internalOptions.dump({
      activeProfile: 'default',
      initialized: true,
    });
    this.userConfig.dump({
      editor,
      hooks: {
        onSwitchFrom: {},
        onSwitchTo: {},
      },
    });
  }

  public listAvailableProfiles(): string[] {
    return fs.readdirSync(this.paths.profiles);
  }

  public newProfile(profileName: string): string {
    const newProfilePath = this.paths.profile(profileName);

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

    const profilePath = this.paths.profile(profileName);

    if (!fs.existsSync(profilePath)) {
      const error = new Error(`Could not find profile: ${profileName}`);
      throw errors.missingProfile(error);
    }

    this.internalOptions.set('activeProfile', profileName);
    this.createSymlink(profilePath);

    return this.getHookCommands(currentlyActiveProfile, profileName);
  }

  //
  // Private Methods
  // ====================================

  private createSymlink(srcPath: string) {
    const symlinkPath = this.paths.symlink;

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
    let value = this.userConfig.get<T>(key);

    if (typeof value === 'undefined') {
      value = this.tryMigratingOldConfig<T>(key);
    }

    return value;
  }

  private getInternalOptionValue<T>(key: string): T {
    let value = this.internalOptions.get<T>(key);

    if (typeof value === 'undefined') {
      value = this.tryMigratingOldInternalOptions<T>(key);
    }

    return value;
  }

  private tryMigratingOldConfig<T>(key?: string): T | undefined {
    if (!fs.existsSync(this.oldConfigPath)) {
      return;
    }

    try {
      const jsonString = fs.readFileSync(this.oldConfigPath, 'utf-8');
      const json = JSON.parse(jsonString);
      this.userConfig.dump(json);

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
      this.internalOptions.dump(json);

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
      this.internalOptions.set('initialized', true);
      return true;
    } catch (error) {
      // TODO Maybe throw an error here..
      return false;
    }
  }
}
