import path from 'path';

export default class Paths {
  readonly base: string;
  readonly profiles: string;
  readonly symlink: string;

  constructor(basePath: string) {
    this.base = basePath;
    this.profiles = this.rel('profiles');
    this.symlink = this.rel('active');
  }

  public rel(...paths: string[]) {
    return path.join(this.base, ...paths);
  }

  public profile(profileName: string) {
    return path.join(this.profiles, profileName);
  }
}
