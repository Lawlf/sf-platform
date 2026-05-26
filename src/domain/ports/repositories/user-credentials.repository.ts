export interface UserCredentials {
  userId: string;
  totpSecret: string | null;
  pinHash: string | null;
  appLockEnabled: boolean;
  appLockTimeout: number;
}

export interface WebauthnCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: bigint;
  transports: string | null;
}

export interface UserCredentialsRepository {
  find(userId: string): Promise<UserCredentials | null>;
  setTotpSecret(userId: string, encryptedSecret: string): Promise<void>;
  setPin(userId: string, pinHash: string): Promise<void>;
  clearPin(userId: string): Promise<void>;
  setAppLock(userId: string, enabled: boolean, timeoutSeconds: number): Promise<void>;
  listWebauthn(userId: string): Promise<WebauthnCredential[]>;
  findWebauthnByCredentialId(credentialId: string): Promise<WebauthnCredential | null>;
  addWebauthn(cred: Omit<WebauthnCredential, "id">): Promise<void>;
  updateWebauthnCounter(credentialId: string, counter: bigint): Promise<void>;
  /** True if the user has at least one factor (totp or passkey). */
  hasAnyFactor(userId: string): Promise<boolean>;
}
