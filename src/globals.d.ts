declare module 'regexgen' {
  const regexgen: (inputs: string[]) => RegExp;
  export default regexgen;
}

declare module 'process' {
  const process: any;
  export default process;
}

interface Window {
  Buffer: any;
  process: any;
}
