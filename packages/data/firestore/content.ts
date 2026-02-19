import {
  Category,
  ContentType,
  Subcategory,
  createConverter,
  ensureCategory,
  ensureContentType,
  ensureOptionalNumber,
  ensureOptionalString,
  ensureOptionalStringArray,
  ensureRequiredString,
  ensureSubcategory,
  isRecord
} from './shared';

export const CONTENT_COLLECTION = 'content';

export interface ContentModel {
  id: string;
  title: string;
  summary: string;
  description?: string;
  category: Category;
  subcategory: Subcategory;
  type: ContentType;
  audience?: string;
  durationMin?: number;
  tags?: string[];
  coverImage?: string;
  bgVideo?: string;
  createdAt: string;
}

export function validateContentModel(input: unknown, idFromSnapshot?: string): ContentModel {
  if (!isRecord(input)) {
    throw new Error('Invalid content payload. Expected object.');
  }

  const id = ensureRequiredString({ id: idFromSnapshot ?? input.id }, 'id');
  const category = ensureCategory(input);

  return {
    id,
    title: ensureRequiredString(input, 'title'),
    summary: ensureRequiredString(input, 'summary'),
    description: ensureOptionalString(input, 'description'),
    category,
    subcategory: ensureSubcategory(input, category),
    type: ensureContentType(input),
    audience: ensureOptionalString(input, 'audience'),
    durationMin: ensureOptionalNumber(input, 'durationMin'),
    tags: ensureOptionalStringArray(input, 'tags'),
    coverImage: ensureOptionalString(input, 'coverImage'),
    bgVideo: ensureOptionalString(input, 'bgVideo'),
    createdAt: ensureRequiredString(input, 'createdAt')
  };
}

export const contentConverter = createConverter<ContentModel>(validateContentModel);
