declare module 'bcryptjs' {
  export function compare(value: string, encrypted: string): Promise<boolean>;
  export function hash(value: string, rounds: number): Promise<string>;
}
