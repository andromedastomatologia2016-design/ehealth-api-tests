import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.MOCK_PORT || 4000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = 'DOCTOR' | 'ADMIN' | 'MIS_USER' | 'NHS_ADMIN';

interface Token {
  accessToken: string;
  clientId: string;
  role: Role;
  expiresAt: number;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  taxId: string; // РНОКПП
  birthDate: string;
}

interface Declaration {
  id: string;
  patientId: string;
  doctorId: string;
  status: 'active' | 'pending_verification' | 'terminated';
  createdAt: string;
}

interface AuthedRequest extends Request {
  token?: Token;
}

// ---------------------------------------------------------------------------
// In-memory "база даних"
// ---------------------------------------------------------------------------

const tokens = new Map<string, Token>();
const patients = new Map<string, Patient>();
const declarations = new Map<string, Declaration>();

// Тестові клієнти (імітація client_id / client_secret з документації eHealth)
const KNOWN_CLIENTS: Record<string, { secret: string; role: Role }> = {
  'test-doctor-client': { secret: 'doctor-secret', role: 'DOCTOR' },
  'test-admin-client': { secret: 'admin-secret', role: 'ADMIN' },
  'test-mis-client': { secret: 'mis-secret', role: 'MIS_USER' },
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Express 5: req.params[key] типізований як `string | string[]`.
// Цей хелпер гарантує, що ми завжди отримуємо саме string,
// тож решта коду лишається чистою — без `as string` на кожному кроці.
function paramId(req: Request, key = 'id'): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

// ---------------------------------------------------------------------------
// Middleware авторизації
// ---------------------------------------------------------------------------

function requireAuth(allowedRoles?: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { type: 'unauthorized', message: 'Access token is missing' },
      });
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const token = tokens.get(accessToken);

    if (!token) {
      return res.status(401).json({
        error: { type: 'unauthorized', message: 'Invalid access token' },
      });
    }

    if (Date.now() > token.expiresAt) {
      return res.status(401).json({
        error: { type: 'unauthorized', message: 'Access token expired' },
      });
    }

    if (allowedRoles && !allowedRoles.includes(token.role)) {
      return res.status(403).json({
        error: { type: 'forbidden', message: `Role ${token.role} is not allowed to access this resource` },
      });
    }

    req.token = token;
    next();
  };
}

// ---------------------------------------------------------------------------
// AUTH endpoints
// ---------------------------------------------------------------------------

// Імітація OAuth2 client_credentials flow
app.post('/auth/token', (req: Request, res: Response) => {
  const { client_id, client_secret, grant_type } = req.body;

  if (grant_type !== 'client_credentials') {
    return res.status(400).json({
      error: { type: 'invalid_grant_type', message: 'Only client_credentials is supported' },
    });
  }

  if (!client_id || !client_secret) {
    return res.status(400).json({
      error: { type: 'invalid_request', message: 'client_id and client_secret are required' },
    });
  }

  const client = KNOWN_CLIENTS[client_id];

  if (!client || client.secret !== client_secret) {
    return res.status(401).json({
      error: { type: 'invalid_client', message: 'Invalid client_id or client_secret' },
    });
  }

  const accessToken = generateId();
  const expiresInSeconds = 3600;

  tokens.set(accessToken, {
    accessToken,
    clientId: client_id,
    role: client.role,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });

  return res.status(200).json({
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: expiresInSeconds,
  });
});

// ---------------------------------------------------------------------------
// PATIENTS endpoints
// ---------------------------------------------------------------------------

app.post('/api/patients', requireAuth(['DOCTOR', 'ADMIN', 'MIS_USER']), (req: Request, res: Response) => {
  const { firstName, lastName, taxId, birthDate } = req.body;

  const errors: Record<string, string> = {};
  if (!firstName) errors.firstName = 'is required';
  if (!lastName) errors.lastName = 'is required';
  if (!taxId) errors.taxId = 'is required';
  else if (!/^\d{10}$/.test(taxId)) errors.taxId = 'must be a 10-digit number';
  if (!birthDate) errors.birthDate = 'is required';

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      error: { type: 'validation_failed', invalid: errors },
    });
  }

  const patient: Patient = {
    id: generateId(),
    firstName,
    lastName,
    taxId,
    birthDate,
  };

  patients.set(patient.id, patient);
  return res.status(201).json({ data: patient });
});

app.get('/api/patients/:id', requireAuth(['DOCTOR', 'ADMIN', 'MIS_USER']), (req: Request, res: Response) => {
  const id = paramId(req);
  const patient = patients.get(id);

  if (!patient) {
    return res.status(404).json({
      error: { type: 'not_found', message: `Patient ${id} not found` },
    });
  }

  return res.status(200).json({ data: patient });
});

app.get('/api/patients', requireAuth(['DOCTOR', 'ADMIN', 'MIS_USER']), (_req: Request, res: Response) => {
  return res.status(200).json({ data: Array.from(patients.values()) });
});

// ---------------------------------------------------------------------------
// DECLARATIONS endpoints
// ---------------------------------------------------------------------------

app.post('/api/declarations', requireAuth(['DOCTOR']), (req: AuthedRequest, res: Response) => {
  const { patientId } = req.body;

  if (!patientId) {
    return res.status(422).json({
      error: { type: 'validation_failed', invalid: { patientId: 'is required' } },
    });
  }

  if (!patients.has(patientId)) {
    return res.status(404).json({
      error: { type: 'not_found', message: `Patient ${patientId} not found` },
    });
  }

  const declaration: Declaration = {
    id: generateId(),
    patientId,
    doctorId: req.token!.clientId,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  declarations.set(declaration.id, declaration);
  return res.status(201).json({ data: declaration });
});

app.get('/api/declarations/:id', requireAuth(['DOCTOR', 'ADMIN', 'NHS_ADMIN']), (req: Request, res: Response) => {
  const id = paramId(req);
  const declaration = declarations.get(id);

  if (!declaration) {
    return res.status(404).json({
      error: { type: 'not_found', message: `Declaration ${id} not found` },
    });
  }

  return res.status(200).json({ data: declaration });
});

app.patch(
  '/api/declarations/:id/actions/terminate',
  requireAuth(['DOCTOR', 'ADMIN']),
  (req: Request, res: Response) => {
    const id = paramId(req);
    const declaration = declarations.get(id);

    if (!declaration) {
      return res.status(404).json({
        error: { type: 'not_found', message: `Declaration ${id} not found` },
      });
    }

    declaration.status = 'terminated';
    declarations.set(declaration.id, declaration);

    return res.status(200).json({ data: declaration });
  }
);

// ---------------------------------------------------------------------------
// Health-check + утиліта очищення для тестів
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Дозволяє тестам очищати стан між прогонами (тільки для мок-сервера!)
app.post('/__test__/reset', (_req: Request, res: Response) => {
  tokens.clear();
  patients.clear();
  declarations.clear();
  res.status(200).json({ status: 'reset' });
});

app.listen(PORT, () => {
  console.log(`Mock eHealth API running on http://localhost:${PORT}`);
});