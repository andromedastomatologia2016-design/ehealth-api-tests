import { APIRequestContext } from '@playwright/test';

export type ClientRole = 'doctor' | 'admin' | 'mis';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

const CLIENT_CREDENTIALS: Record<ClientRole, { client_id: string; client_secret: string }> = {
  doctor: { client_id: 'test-doctor-client', client_secret: 'doctor-secret' },
  admin: { client_id: 'test-admin-client', client_secret: 'admin-secret' },
  mis: { client_id: 'test-mis-client', client_secret: 'mis-secret' },
};

/**
 * Отримує access_token для вказаної ролі через client_credentials flow.
 * Використовується на початку тестів, де потрібна авторизація.
 */
export async function getAccessToken(request: APIRequestContext, role: ClientRole): Promise<string> {
  const credentials = CLIENT_CREDENTIALS[role];

  const response = await request.post('/auth/token', {
    data: {
      grant_type: 'client_credentials',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to get access token for role "${role}": ${response.status()} ${await response.text()}`);
  }

  const body: TokenResponse = await response.json();
  return body.access_token;
}

/**
 * Повертає готовий заголовок Authorization для підстановки в запити.
 */
export async function authHeader(request: APIRequestContext, role: ClientRole): Promise<{ Authorization: string }> {
  const token = await getAccessToken(request, role);
  return { Authorization: `Bearer ${token}` };
}