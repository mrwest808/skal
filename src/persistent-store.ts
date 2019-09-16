import path from 'path';
import Conf from 'conf';

enum StoreType {
  InternalOptions,
  UserConfig,
}

export default class PersistentStore {
  static Type = StoreType;

  private type: StoreType;
  private cwd?: string;
  private instance?: Conf;

  constructor(type: StoreType, cwd?: string) {
    this.type = type;
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

  private getStoreInstance(): Conf {
    if (this.instance) {
      return this.instance;
    }

    switch (this.type) {
      case StoreType.InternalOptions:
        this.instance = this.instantiateInternalOptions();

      case StoreType.UserConfig:
        this.instance = this.instantiateUserConfig();
    }

    return this.instance;
  }

  private instantiateInternalOptions(): Conf {
    return new Conf({
      ...this.getExtraInstantiateOptions(),
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

  private instantiateUserConfig(): Conf {
    return new Conf({
      ...this.getExtraInstantiateOptions(),
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

  private getExtraInstantiateOptions(): object {
    let options: { cwd?: string } = {};

    // When running integration tests Conf:s files needs
    // to be stored inside the <Skal base path> folder
    if (this.cwd) {
      options.cwd = path.join(this.cwd, '__conf__');
    }

    return options;
  }
}
