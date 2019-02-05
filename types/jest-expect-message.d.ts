declare module 'jest-expect-message/dist/withMessage' {
  function withMessage(
    expect: jest.Expect
  ): (test: any, message: string) => jest.Matchers;
  export default withMessage;
}
