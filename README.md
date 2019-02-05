<h1 align="center">skal</h1>
<p align="center">
  <a href="https://travis-ci.org/mrwest808/skal"><img src="https://travis-ci.org/mrwest808/skal.svg?branch=master" alt="Build status"></a>
  <a href="https://david-dm.org/mrwest808/skal"><img src="https://david-dm.org/mrwest808/skal.svg" alt="Dependency status"></a>
  <a href="https://www.npmjs.com/package/skal"><img src="https://img.shields.io/npm/v/skal.svg?colorB=blue&style=flat" alt="npm version"></a>
  <a href="https://github.com/mrwest808/skal/blob/master/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License"></a>
</p>
<p align="center">Manage separate shell configurations with ease.</p>
<p align="center"><em>:sweden: skal&nbsp;&nbsp;&nbsp;&nbsp;:gb: shell</em></p>

## Installation

```sh
npm install --global skal
```

Run `skal` in your terminal to initialize, follow the instructions.

## Usage

Create and manage profiles under `$HOME/.skal/profiles`, use `skal` to switch between them.

[![GIF showing terminal usage](https://user-images.githubusercontent.com/6108538/52310924-673e7580-29a5-11e9-90ae-1ec0ebf2e07b.gif)]

```sh
$ skal --help

  Manage shell profiles.

  Usage
    $ skal [<option>]

  Options
    --new, -n       Create a new profile
    --list, -l      List available profiles
    --config, -c    Edit configuration
    --edit, -e      Select and edit profile

  Examples
    $ skal          Interactive prompt to change active profile
    $ skal --list
```

## Configuration

Configure by editing the `$HOME/.skal/config.json` file, or just run `skal -c`.

### `editor`

Used as a convenience together with the `--config` and `--edit` options. Opens configuration or profiles in your editor of choice.

Put the command name you use in your terminal to open your preferred editor.

Example:

```json
{
  "editor": "vi"
}
```

Format:

```ts
type Editor = string;
```

### `hooks`

Hooks allows you to optionally run commands in response to switching from/to certain profiles.

Example:

```json
{
  "hooks": {
    "onSwitchFrom": {
      "work": ["cp ~/.npmrcs/default ~/.npmrc"]
    },
    "onSwitchTo": {
      "work": ["cp ~/.npmrcs/work ~/.npmrc"]
    }
  }
}
```

Format:

```ts
interface Hooks {
  onSwitchFrom: HookMap;
  onSwitchTo: HookMap;
}

interface HookMap {
  [profileName: string]: string[];
}
```
