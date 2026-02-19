import { createConverter, ensureRequiredString, isRecord } from './shared';

export const SAVED_CONTENT_COLLECTION = 'savedContent';

export interface SavedContentModel {
  id: string;
  userId: string;
  contentId: string;
  savedAt: string;
}

export function validateSavedContentModel(input: unknown, idFromSnapshot?: string): SavedContentModel {
  if (!isRecord(input)) {
    throw new Error('Invalid savedContent payload. Expected object.');
  }

  const id = ensureRequiredString({ id: idFromSnapshot ?? input.id }, 'id');

  return {
    id,
    userId: ensureRequiredString(input, 'userId'),
    contentId: ensureRequiredString(input, 'contentId'),
    savedAt: ensureRequiredString(input, 'savedAt')
  };
}

export const savedContentConverter = createConverter<SavedContentModel>(validateSavedContentModel);
