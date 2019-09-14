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
import { __TEST__, __SKAL_TEST_BASE_PATH__ } from './utils';

const cli = meow(
  `
  Usage
    $ skal [<command>]

  Commands
    new         Create a new profile
    list        List available profiles
    which       Print path to active profile
    edit        Edit profile or configuration

    Run without arguments for an interactive prompt to switch active profile.

  Options
    --help      Show help
    --version   Print version
`
);

const { input } = cli;
const [command] = input;
let action: Action;

switch (command) {
  case 'new':
    action = Action.NewProfile;
    break;
  case 'list':
    action = Action.ListProfiles;
    break;
  case 'which':
    action = Action.WhichProfile;
    break;
  case 'edit':
    action = Action.Edit;
    break;
  default:
    action = Action.SelectProfile;
    break;
}

const effects: Effects = {
  async execCommand(cmd) {
    return execa.command(cmd, { shell: true });
  },
  openEditor(editor: Editor, filePath: string) {
    if (__TEST__) {
      console.log('%s %s', editor, filePath);
      return;
    }

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
  basePath: __TEST__ ? __SKAL_TEST_BASE_PATH__ : undefined,
  effects,
  reporter: consoleReporter,
});

cliRunner.run();
