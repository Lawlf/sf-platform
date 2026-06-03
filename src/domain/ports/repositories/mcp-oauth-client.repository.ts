export interface McpOauthClient {
  id: string;
  clientId: string;
  clientSecretHash: string | null;
  redirectUris: string[];
  name: string;
  createdAt: Date;
}

export interface McpOauthClientRepository {
  create(input: {
    clientId: string;
    clientSecretHash: string | null;
    redirectUris: string[];
    name: string;
  }): Promise<McpOauthClient>;
  findByClientId(clientId: string): Promise<McpOauthClient | null>;
}
