export interface RandomGenerator {
  bytes(length: number): Uint8Array;
  urlToken(): string;
  sixDigitCode(): string;
}
