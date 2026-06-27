import { APIRequestContext } from '@playwright/test';

export interface CreatePatientPayload {
  firstName: string;
  lastName: string;
  taxId: string;
  birthDate: string;
}

export interface Patient extends CreatePatientPayload {
  id: string;
}

/**
 * Створює пацієнта. Повертає сирий response, щоб тест сам міг
 * перевірити статус-код та тіло відповіді (включно з помилками валідації).
 */
export async function createPatient(
  request: APIRequestContext,
  authHeader: { Authorization: string },
  payload: Partial<CreatePatientPayload>
) {
  return request.post('/api/patients', {
    headers: authHeader,
    data: payload,
  });
}

/**
 * Отримує пацієнта за id.
 */
export async function getPatient(request: APIRequestContext, authHeader: { Authorization: string }, id: string) {
  return request.get(`/api/patients/${id}`, {
    headers: authHeader,
  });
}

/**
 * Допоміжна фабрика валідних тестових даних пацієнта.
 * Дозволяє точково перезаписати окремі поля через overrides.
 */
export function buildValidPatientPayload(overrides: Partial<CreatePatientPayload> = {}): CreatePatientPayload {
  return {
    firstName: 'Тестовий',
    lastName: 'Пацієнт',
    taxId: '1234567890',
    birthDate: '1990-01-01',
    ...overrides,
  };
}