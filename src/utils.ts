export const __SKAL_TEST_BASE_PATH__ = process.env.SKAL_TEST_BASE_PATH;

export const __TEST__ =
  process.env.NODE_ENV === 'test' && __SKAL_TEST_BASE_PATH__;
