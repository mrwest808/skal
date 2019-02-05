import fs from 'fs-extra';
import withMessage from 'jest-expect-message/dist/withMessage';
import ncp from 'ncp';
import { ErrorCode } from '../src/errors';

export const expectWithMessage = withMessage(expect);

export const re = (str: string | ErrorCode) => new RegExp(str as string);

export const read = (p: string) => fs.readFileSync(p, 'utf8');

export const write = (p: string, s: string) => fs.writeFileSync(p, s, 'utf8');

export const copy = (src: string, target: string, done: () => void) => {
  ncp(src, target, err => {
    if (err) throw err;
    done();
  });
};
