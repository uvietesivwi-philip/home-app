import { createConverter, ensureOptionalString, ensureRequiredString, isRecord } from './shared';

export const USERS_COLLECTION = 'users';

export interface UserModel {
  id: string;
  name: string;
  phone?: string;
  location?: string;
  createdAt: string;
}

export function validateUserModel(input: unknown, idFromSnapshot?: string): UserModel {
  if (!isRecord(input)) {
    throw new Error('Invalid user payload. Expected object.');
  }

  const id = ensureRequiredString({ id: idFromSnapshot ?? input.id }, 'id');
  const name = ensureRequiredString(input, 'name');
  const phone = ensureOptionalString(input, 'phone');
  const location = ensureOptionalString(input, 'location');
  const createdAt = ensureRequiredString(input, 'createdAt');

  return {
    id,
    name,
    phone,
    location,
    createdAt
  };
}

export const usersConverter = createConverter<UserModel>(validateUserModel);
