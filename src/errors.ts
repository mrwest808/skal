// TODO Better error messages

export enum ErrorCode {
  // ./skal.ts
  BadFileStructure = 100,
  BadConfigRead = 101,
  BadConfigFormat = 102,
  BadConfigWrite = 103,
  BadInternalOptionsRead = 104,
  BadInternalOptionsFormat = 105,
  BadInternalOptionsWrite = 106,
  MissingEditor = 107,
  DuplicateProfile = 108,
  BadProfileWrite = 109,
  ProfileAlreadyActive = 110,
  MissingProfile = 111,
  BadActiveFileWrite = 112,
  HooksNoConfig = 113,
  BadDefaultProfileWrite = 114,

  // ./cli-runner.ts
  NoActiveEditor = 200,
  NoProfiles = 201,
}

export const errors = {
  badFileStructure: createError(
    ErrorCode.BadFileStructure,
    'Bad file structure.'
  ),
  badConfigRead: createError(ErrorCode.BadConfigRead, 'Could not read config.'),
  badConfigFormat: createError(ErrorCode.BadConfigFormat, 'Bad config format.'),
  badConfigWrite: createError(
    ErrorCode.BadConfigWrite,
    'Could not write config.'
  ),
  badInternalOptionsRead: createError(
    ErrorCode.BadInternalOptionsRead,
    'Could not read internal options.'
  ),
  badInternalOptionsFormat: createError(
    ErrorCode.BadInternalOptionsFormat,
    'Bad internal options format.'
  ),
  badInternalOptionsWrite: createError(
    ErrorCode.BadInternalOptionsWrite,
    'Could not write internal options.'
  ),
  missingEditor: createError(
    ErrorCode.MissingEditor,
    'Missing `editor` argument.'
  ),
  duplicateProfile: createError(
    ErrorCode.DuplicateProfile,
    'Duplicate profile.'
  ),
  badProfileWrite: createError(
    ErrorCode.BadProfileWrite,
    'Could not write profile.'
  ),
  profileAlreadyActive: createError(
    ErrorCode.ProfileAlreadyActive,
    'Selected profile is already active.'
  ),
  missingProfile: createError(ErrorCode.MissingProfile, 'Missing profile.'),
  badActiveFileWrite: createError(
    ErrorCode.BadActiveFileWrite,
    'Could not write _active file.'
  ),
  hooksNoConfig: createError(
    ErrorCode.HooksNoConfig,
    'Attempting to run hooks without a config.'
  ),
  badDefaultProfileWrite: createError(
    ErrorCode.BadDefaultProfileWrite,
    'Could not write default profile file.'
  ),
  noActiveEditor: createError(ErrorCode.NoActiveEditor, 'No active editor.'),
  noProfiles: createError(ErrorCode.NoProfiles, 'No available profiles.'),
};

export class CustomError extends Error {
  errorCode: ErrorCode;
  originalError: Error;

  constructor(errorCode: ErrorCode, originalError: Error) {
    super();

    this.errorCode = errorCode;
    this.originalError = originalError;
    this.message = originalError.message + ` [${errorCode}]`;
  }
}

function createError(errorCode: ErrorCode, fallbackErrorMessage?: string) {
  return (triggeringError?: Error) => {
    const originalError = triggeringError || new Error(fallbackErrorMessage);
    return new CustomError(errorCode, originalError);
  };
}
