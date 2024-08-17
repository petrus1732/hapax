declare module 'bcrypt' {
  export function genSaltSync(rounds?: number): string;
  export function genSalt(rounds: number, callback: (err: Error, salt: string) => void): void;
  export function genSalt(callback: (err: Error, salt: string) => void): void;

  export function hashSync(data: string | Buffer, saltOrRounds: string | number): string;
  export function hash(data: string | Buffer, saltOrRounds: string | number, callback: (err: Error, encrypted: string) => void): void;
  export function hash(data: string | Buffer, salt: string, callback: (err: Error, encrypted: string) => void): void;

  export function compareSync(data: string | Buffer, encrypted: string): boolean;
  export function compare(data: string | Buffer, encrypted: string): Promise<boolean>;
  export function compare(data: string | Buffer, encrypted: string, callback: (err: Error, same: boolean) => void): void;

  export function getRounds(encrypted: string): number;
}
