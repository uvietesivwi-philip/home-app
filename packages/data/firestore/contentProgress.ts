import { createConverter, ensureRequiredNumber, ensureRequiredString, isRecord } from './shared';

export const CONTENT_PROGRESS_COLLECTION = 'contentProgress';

export interface ContentProgressModel {
  id: string;
  userId: string;
  contentId: string;
  progressSeconds: number;
  updatedAt: string;
}

export function validateContentProgressModel(input: unknown, idFromSnapshot?: string): ContentProgressModel {
  if (!isRecord(input)) {
    throw new Error('Invalid contentProgress payload. Expected object.');
  }

  const id = ensureRequiredString({ id: idFromSnapshot ?? input.id }, 'id');

  return {
    id,
    userId: ensureRequiredString(input, 'userId'),
    contentId: ensureRequiredString(input, 'contentId'),
    progressSeconds: ensureRequiredNumber(input, 'progressSeconds'),
    updatedAt: ensureRequiredString(input, 'updatedAt')
  };
}

export const contentProgressConverter = createConverter<ContentProgressModel>(validateContentProgressModel);
