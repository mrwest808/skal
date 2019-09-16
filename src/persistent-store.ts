import path from 'path';
import Conf from 'conf';

abstract class PersistentStore {
  protected cwd?: string;

  constructor(cwd?: string) {
    this.cwd = cwd;
  }

  public get<T>(key: string): T {
    const instance = this.getStoreInstance();
    return instance.get(key);
  }

  public set<T>(key: string, value: T) {
    const instance = this.getStoreInstance();
    instance.set(key, value);
  }

  public dump(value: object) {
    const instance = this.getStoreInstance();
    instance.set(value);
  }

  public getPath() {
    const instance = this.getStoreInstance();
    return instance.path;
  }

  abstract getStoreInstance(): Conf;

  protected getExtraInstantiationOptions(): object {
    let options: { cwd?: string } = {};

    // When running integration tests Conf:s files needs
    // to be stored inside the <Skal base path> folder
    if (this.cwd) {
      options.cwd = path.join(this.cwd, '__conf__');
    }

    return options;
  }
}

export class InternalOptionsStore extends PersistentStore {
  private instance: Conf;

  getStoreInstance(): Conf {
    if (this.instance) {
      return this.instance;
    }

    return new Conf({
      ...this.getExtraInstantiationOptions(),
      projectName: 'skal',
      configName: '_internalOptions',
      clearInvalidConfig: false,
      schema: {
        activeProfile: {
          type: 'string',
        },
        initialized: {
          type: 'boolean',
        },
      },
    });
  }
}

export class UserConfigStore extends PersistentStore {
  private instance: Conf;

  getStoreInstance(): Conf {
    if (this.instance) {
      return this.instance;
    }

    return new Conf({
      ...this.getExtraInstantiationOptions(),
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
  }
}
