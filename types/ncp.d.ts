declare module 'ncp' {
  function ncp(src: string, dest: string, cb: (err?: Error) => void): void;
  export default ncp;
}
