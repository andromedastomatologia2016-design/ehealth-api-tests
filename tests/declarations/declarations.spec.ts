import { test, expect } from '@playwright/test';
import { authHeader } from '../../src/api/auth.client';
import { createPatient, buildValidPatientPayload } from '../../src/api/patients.client';
import { createDeclaration, getDeclaration, terminateDeclaration } from '../../src/api/declarations.client';

test.describe('Declarations API', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/__test__/reset');
  });

  /**
   * Допоміжна функція: створює пацієнта лікарем і повертає його id.
   * Використовується в кількох тестах, тож винесена окремо.
   */
  async function createTestPatient(request: any) {
    const doctorHeaders = await authHeader(request, 'doctor');
    const response = await createPatient(request, doctorHeaders, buildValidPatientPayload());
    const body = await response.json();
    return body.data.id as string;
  }

  test.describe('POST /api/declarations', () => {
    test('лікар успішно створює декларацію для існуючого пацієнта', async ({ request }) => {
      const patientId = await createTestPatient(request);
      const doctorHeaders = await authHeader(request, 'doctor');

      const response = await createDeclaration(request, doctorHeaders, patientId);

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.data.id).toBeTruthy();
      expect(body.data.patientId).toBe(patientId);
      expect(body.data.status).toBe('active');
    });

    test('відмовляє, якщо пацієнт не існує', async ({ request }) => {
      const doctorHeaders = await authHeader(request, 'doctor');

      const response = await createDeclaration(request, doctorHeaders, 'non-existent-patient-id');

      expect(response.status()).toBe(404);
    });

    test('відмовляє, якщо роль не DOCTOR (ADMIN не може створювати декларації)', async ({ request }) => {
      const patientId = await createTestPatient(request);
      const adminHeaders = await authHeader(request, 'admin');

      const response = await createDeclaration(request, adminHeaders, patientId);

      expect(response.status()).toBe(403);

      const body = await response.json();
      expect(body.error.type).toBe('forbidden');
    });

    test('відмовляє без access_token', async ({ request }) => {
      const patientId = await createTestPatient(request);

      const response = await request.post('/api/declarations', {
        data: { patientId },
      });

      expect(response.status()).toBe(401);
    });

    test('відмовляє, якщо відсутній patientId', async ({ request }) => {
      const doctorHeaders = await authHeader(request, 'doctor');

      const response = await request.post('/api/declarations', {
        headers: doctorHeaders,
        data: {},
      });

      expect(response.status()).toBe(422);
    });
  });

  test.describe('GET /api/declarations/:id', () => {
    test('лікар може переглянути декларацію', async ({ request }) => {
      const patientId = await createTestPatient(request);
      const doctorHeaders = await authHeader(request, 'doctor');

      const createResponse = await createDeclaration(request, doctorHeaders, patientId);
      const created = (await createResponse.json()).data;

      const getResponse = await getDeclaration(request, doctorHeaders, created.id);

      expect(getResponse.status()).toBe(200);

      const body = await getResponse.json();
      expect(body.data.id).toBe(created.id);
    });

    test('ADMIN також може переглянути декларацію', async ({ request }) => {
      const patientId = await createTestPatient(request);
      const doctorHeaders = await authHeader(request, 'doctor');
      const adminHeaders = await authHeader(request, 'admin');

      const createResponse = await createDeclaration(request, doctorHeaders, patientId);
      const created = (await createResponse.json()).data;

      const getResponse = await getDeclaration(request, adminHeaders, created.id);

      expect(getResponse.status()).toBe(200);
    });

    test('MIS_USER не має доступу до декларацій (немає в списку дозволених ролей)', async ({ request }) => {
      const patientId = await createTestPatient(request);
      const doctorHeaders = await authHeader(request, 'doctor');
      const misHeaders = await authHeader(request, 'mis');

      const createResponse = await createDeclaration(request, doctorHeaders, patientId);
      const created = (await createResponse.json()).data;

      const getResponse = await getDeclaration(request, misHeaders, created.id);

      expect(getResponse.status()).toBe(403);
    });

    test('повертає 404 для неіснуючої декларації', async ({ request }) => {
      const doctorHeaders = await authHeader(request, 'doctor');

      const response = await getDeclaration(request, doctorHeaders, 'non-existent-id');

      expect(response.status()).toBe(404);
    });
  });

  test.describe('PATCH /api/declarations/:id/actions/terminate', () => {
    test('лікар може термінувати декларацію', async ({ request }) => {
      const patientId = await createTestPatient(request);
      const doctorHeaders = await authHeader(request, 'doctor');

      const createResponse = await createDeclaration(request, doctorHeaders, patientId);
      const created = (await createResponse.json()).data;

      const terminateResponse = await terminateDeclaration(request, doctorHeaders, created.id);

      expect(terminateResponse.status()).toBe(200);

      const body = await terminateResponse.json();
      expect(body.data.status).toBe('terminated');
    });

    test('MIS_USER не може термінувати декларацію', async ({ request }) => {
      const patientId = await createTestPatient(request);
      const doctorHeaders = await authHeader(request, 'doctor');
      const misHeaders = await authHeader(request, 'mis');

      const createResponse = await createDeclaration(request, doctorHeaders, patientId);
      const created = (await createResponse.json()).data;

      const terminateResponse = await terminateDeclaration(request, misHeaders, created.id);

      expect(terminateResponse.status()).toBe(403);
    });
  });
});