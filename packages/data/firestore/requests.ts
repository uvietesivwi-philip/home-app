import {
  RequestStatus,
  RequestType,
  createConverter,
  ensureOptionalString,
  ensureRequestStatus,
  ensureRequestType,
  ensureRequiredString,
  isRecord
} from './shared';

export const REQUESTS_COLLECTION = 'requests';

export interface RequestModel {
  id: string;
  userId: string;
  type: RequestType;
  phone?: string;
  location?: string;
  notes: string;
  preferredTime?: string;
  status: RequestStatus;
  createdAt: string;
}

export function validateRequestModel(input: unknown, idFromSnapshot?: string): RequestModel {
  if (!isRecord(input)) {
    throw new Error('Invalid request payload. Expected object.');
  }

  const id = ensureRequiredString({ id: idFromSnapshot ?? input.id }, 'id');

  return {
    id,
    userId: ensureRequiredString(input, 'userId'),
    type: ensureRequestType(input),
    phone: ensureOptionalString(input, 'phone'),
    location: ensureOptionalString(input, 'location'),
    notes: ensureRequiredString(input, 'notes'),
    preferredTime: ensureOptionalString(input, 'preferredTime'),
    status: ensureRequestStatus(input),
    createdAt: ensureRequiredString(input, 'createdAt')
  };
}

export const requestsConverter = createConverter<RequestModel>(validateRequestModel);
