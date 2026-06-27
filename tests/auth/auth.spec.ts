import { test, expect } from '@playwright/test';

test.describe('POST /auth/token', () => {
  test.beforeEach(async ({ request }) => {
    // Скидаємо стан мок-сервера перед кожним тестом, щоб тести не впливали один на одного
    await request.post('/__test__/reset');
  });

  test('успішно видає access_token для валідних client_id/client_secret', async ({ request }) => {
    const response = await request.post('/auth/token', {
      data: {
        grant_type: 'client_credentials',
        client_id: 'test-doctor-client',
        client_secret: 'doctor-secret',
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.access_token).toBeTruthy();
    expect(body.token_type).toBe('bearer');
    expect(body.expires_in).toBe(3600);
  });

  test('відмовляє при невірному client_secret', async ({ request }) => {
    const response = await request.post('/auth/token', {
      data: {
        grant_type: 'client_credentials',
        client_id: 'test-doctor-client',
        client_secret: 'wrong-secret',
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error.type).toBe('invalid_client');
  });

  test('відмовляє при невідомому client_id', async ({ request }) => {
    const response = await request.post('/auth/token', {
      data: {
        grant_type: 'client_credentials',
        client_id: 'unknown-client',
        client_secret: 'anything',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('відмовляє, якщо відсутній client_id', async ({ request }) => {
    const response = await request.post('/auth/token', {
      data: {
        grant_type: 'client_credentials',
        client_secret: 'doctor-secret',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error.type).toBe('invalid_request');
  });

  test('відмовляє при непідтримуваному grant_type', async ({ request }) => {
    const response = await request.post('/auth/token', {
      data: {
        grant_type: 'password',
        client_id: 'test-doctor-client',
        client_secret: 'doctor-secret',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error.type).toBe('invalid_grant_type');
  });
});