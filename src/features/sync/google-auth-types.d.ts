declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(overrides?: { prompt?: string }): void;
    callback: (response: TokenResponse) => void;
  }

  interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
    error_description?: string;
    scope: string;
    token_type: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message: string }) => void;
    ux_mode?: 'popup' | 'redirect';
    redirect_uri?: string;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
  function revoke(token: string, callback?: () => void): void;
  function hasGrantedAllScopes(
    tokenResponse: TokenResponse,
    ...scopes: string[]
  ): boolean;
}
