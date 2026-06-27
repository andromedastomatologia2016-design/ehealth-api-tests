import { APIRequestContext } from '@playwright/test';

export interface Declaration {
  id: string;
  patientId: string;
  doctorId: string;
  status: 'active' | 'pending_verification' | 'terminated';
  createdAt: string;
}

/**
 * Створює декларацію для пацієнта. Доступно тільки ролі DOCTOR.
 */
export async function createDeclaration(
  request: APIRequestContext,
  authHeader: { Authorization: string },
  patientId: string
) {
  return request.post('/api/declarations', {
    headers: authHeader,
    data: { patientId },
  });
}

/**
 * Отримує декларацію за id.
 */
export async function getDeclaration(
  request: APIRequestContext,
  authHeader: { Authorization: string },
  id: string
) {
  return request.get(`/api/declarations/${id}`, {
    headers: authHeader,
  });
}

/**
 * Термінує (закриває) декларацію.
 */
export async function terminateDeclaration(
  request: APIRequestContext,
  authHeader: { Authorization: string },
  id: string
) {
  return request.patch(`/api/declarations/${id}/actions/terminate`, {
    headers: authHeader,
  });
}