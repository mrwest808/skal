import chalk from 'chalk';
import outdent from 'outdent';
import { ErrorCode, CustomError } from './errors';
import { Reporter } from './types';

// TODO Cleanup and improve general logging quality

const nl = (s: string) => '\n' + s;
const log = (msg: string) => console.log(nl(msg));
const logError = (msg: string) => console.error(nl(msg));

const messages: { [key: string]: string } = {
  [ErrorCode.ProfileAlreadyActive]: 'Profile already active.',
};

const reporter: Reporter = {
  runError(error) {
    const err = error as CustomError;

    if (messages[err.errorCode]) {
      logError(messages[err.errorCode]);
      return;
    }

    const message = outdent.string(chalk`
      {red.bold Uh oh!}
      Looks like something went wrong! :(

      ${err.stack || ''}
    `);
    logError(message);
  },
  initializeIntro() {
    const message =
      "It looks like this is your first time using Skal, let's set things up!\n";
    log(message);
  },
  initializeDone(paths) {
    const message = outdent.string(`
      Created a default profile here:
        ${paths.profiles}

      Include this file in your shell config file:
        ${paths.symlink}
      
      (example how this could look in a .zshrc file)
        source "$HOME/.skal/active"
      
      The "active" file is a symbolic link towards the currently active profile.
    `);
    log(message);
  },
  listProfilesDone(profiles, active) {
    const profileList = profiles
      .map(profile => {
        const indent = '        '; // ¯\_(ツ)_/¯
        const suffix = profile === active ? ' (active)' : '';
        return `${indent}${profile}${suffix}\n`;
      })
      .join('')
      .trim();
    const message = outdent.string(chalk`
      {bold Profiles:}
        ${profileList}
    `);
    log(message);
  },
  newProfileDone(filePath) {
    const message = outdent.string(chalk`
      {bold Created new profile here:}
        ${filePath}
    `);
    log(message);
  },
  selectProfileDone(profile, commands) {
    let message = '';

    if (commands.length) {
      const count = commands.length;
      const label = count > 1 ? 'hooks' : 'hook';
      message += chalk`{gray Ran ${count.toString()} ${label}.}\n`;
    }

    message += chalk`{bold Activated profile:} ${profile}`;
    log(message);
  },
  whichProfileDone(profile) {
    const message = chalk`{bold Active profile:} ${profile}`;
    log(message);
  },
};

export default reporter;
