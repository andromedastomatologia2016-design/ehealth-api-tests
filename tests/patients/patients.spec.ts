import { test, expect } from '@playwright/test';
import { authHeader } from '../../src/api/auth.client';
import { createPatient, getPatient, buildValidPatientPayload } from '../../src/api/patients.client';

test.describe('Patients API', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/__test__/reset');
  });

  test.describe('POST /api/patients', () => {
    test('лікар успішно створює пацієнта з валідними даними', async ({ request }) => {
      const headers = await authHeader(request, 'doctor');
      const payload = buildValidPatientPayload();

      const response = await createPatient(request, headers, payload);

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.data.id).toBeTruthy();
      expect(body.data.firstName).toBe(payload.firstName);
      expect(body.data.lastName).toBe(payload.lastName);
      expect(body.data.taxId).toBe(payload.taxId);
    });

    test('відмовляє без access_token', async ({ request }) => {
      const payload = buildValidPatientPayload();

      const response = await request.post('/api/patients', { data: payload });

      expect(response.status()).toBe(401);
    });

    test('відмовляє при відсутньому firstName', async ({ request }) => {
      const headers = await authHeader(request, 'doctor');
      const payload = buildValidPatientPayload({ firstName: '' });

      const response = await createPatient(request, headers, payload);

      expect(response.status()).toBe(422);

      const body = await response.json();
      expect(body.error.invalid.firstName).toBeTruthy();
    });

    test('відмовляє при невалідному taxId (не 10 цифр)', async ({ request }) => {
      const headers = await authHeader(request, 'doctor');
      const payload = buildValidPatientPayload({ taxId: '123' });

      const response = await createPatient(request, headers, payload);

      expect(response.status()).toBe(422);

      const body = await response.json();
      expect(body.error.invalid.taxId).toBeTruthy();
    });

    test('MIS_USER також може створити пацієнта', async ({ request }) => {
      const headers = await authHeader(request, 'mis');
      const payload = buildValidPatientPayload();

      const response = await createPatient(request, headers, payload);

      expect(response.status()).toBe(201);
    });
  });

  test.describe('GET /api/patients/:id', () => {
    test('повертає створеного пацієнта за id', async ({ request }) => {
      const headers = await authHeader(request, 'doctor');
      const payload = buildValidPatientPayload();

      const createResponse = await createPatient(request, headers, payload);
      const created = (await createResponse.json()).data;

      const getResponse = await getPatient(request, headers, created.id);

      expect(getResponse.status()).toBe(200);

      const body = await getResponse.json();
      expect(body.data.id).toBe(created.id);
      expect(body.data.firstName).toBe(payload.firstName);
    });

    test('повертає 404 для неіснуючого пацієнта', async ({ request }) => {
      const headers = await authHeader(request, 'doctor');

      const response = await getPatient(request, headers, 'non-existent-id');

      expect(response.status()).toBe(404);

      const body = await response.json();
      expect(body.error.type).toBe('not_found');
    });

    test('відмовляє без access_token', async ({ request }) => {
      const response = await request.get('/api/patients/some-id');

      expect(response.status()).toBe(401);
    });
  });
});