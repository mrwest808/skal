import child_process from 'child_process';
import meow from 'meow';
import inquirer from 'inquirer';
import execa from 'execa';
import CliRunner from './cli-runner';
import consoleReporter from './console-reporter';
import {
  CliRunnerAction as Action,
  CliRunnerEffects as Effects,
  Editor,
} from './types';

const cli = meow(
  `
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
`,
  {
    flags: {
      new: { type: 'boolean', alias: 'n' },
      list: { type: 'boolean', alias: 'l' },
      config: { type: 'boolean', alias: 'c' },
      edit: { type: 'boolean', alias: 'e' },
    },
  }
);

const { flags } = cli;
let action = Action.SelectProfile;

if (flags.config) {
  action = Action.EditConfig;
}
if (flags.edit) {
  action = Action.EditProfile;
}
if (flags.list) {
  action = Action.ListProfiles;
}
if (flags.new) {
  action = Action.NewProfile;
}

const effects: Effects = {
  async execCommand(cmd) {
    const [command, ...args] = cmd.trim().split(/\s+/);
    return execa(command, args);
  },
  openEditor(editor: Editor, filePath: string) {
    const spawn = child_process.spawn(editor, [filePath], {
      stdio: 'inherit',
    });

    spawn.on('error', err => {
      consoleReporter.runError(err);
    });
  },
  prompt: inquirer.prompt.bind(inquirer),
};

const cliRunner = new CliRunner({
  action,
  effects,
  reporter: consoleReporter,
});

cliRunner.run();
