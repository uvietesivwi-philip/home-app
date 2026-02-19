export type Category = 'cook' | 'care' | 'diy' | 'family';

export type Subcategory =
  | 'african'
  | 'continental'
  | 'bathing'
  | 'dressing'
  | 'hairstyling'
  | 'decor'
  | 'maintenance'
  | 'parents'
  | 'kids';

export type ContentType = 'video' | 'guide' | 'activity' | 'story';

export type RequestType = 'cook' | 'care' | 'diy' | 'family' | 'other';

export type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export const CATEGORY_VALUES: readonly Category[] = ['cook', 'care', 'diy', 'family'];
export const SUBCATEGORY_VALUES: readonly Subcategory[] = [
  'african',
  'continental',
  'bathing',
  'dressing',
  'hairstyling',
  'decor',
  'maintenance',
  'parents',
  'kids'
];
export const CONTENT_TYPE_VALUES: readonly ContentType[] = ['video', 'guide', 'activity', 'story'];
export const REQUEST_TYPE_VALUES: readonly RequestType[] = ['cook', 'care', 'diy', 'family', 'other'];
export const REQUEST_STATUS_VALUES: readonly RequestStatus[] = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];

const SUBCATEGORY_TO_CATEGORY: Record<Subcategory, Category> = {
  african: 'cook',
  continental: 'cook',
  bathing: 'care',
  dressing: 'care',
  hairstyling: 'care',
  decor: 'diy',
  maintenance: 'diy',
  parents: 'family',
  kids: 'family'
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ensureRequiredString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid or missing "${key}". Expected non-empty string.`);
  }
  return value;
}

export function ensureOptionalString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`Invalid "${key}". Expected string when provided.`);
  }
  return value;
}

export function ensureRequiredNumber(data: Record<string, unknown>, key: string): number {
  const value = data[key];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid or missing "${key}". Expected number.`);
  }
  return value;
}

export function ensureOptionalNumber(data: Record<string, unknown>, key: string): number | undefined {
  const value = data[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid "${key}". Expected number when provided.`);
  }
  return value;
}

export function ensureOptionalStringArray(data: Record<string, unknown>, key: string): string[] | undefined {
  const value = data[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Invalid "${key}". Expected string array when provided.`);
  }
  return value;
}

export function ensureEnumValue<T extends string>(
  raw: unknown,
  key: string,
  allowed: readonly T[]
): T {
  if (typeof raw !== 'string' || !allowed.includes(raw as T)) {
    throw new Error(`Invalid "${key}" value "${String(raw)}". Allowed: ${allowed.join(', ')}`);
  }
  return raw as T;
}

export function ensureCategory(data: Record<string, unknown>, key = 'category'): Category {
  return ensureEnumValue(data[key], key, CATEGORY_VALUES);
}

export function ensureSubcategory(data: Record<string, unknown>, category: Category, key = 'subcategory'): Subcategory {
  const subcategory = ensureEnumValue(data[key], key, SUBCATEGORY_VALUES);
  if (SUBCATEGORY_TO_CATEGORY[subcategory] !== category) {
    throw new Error(`Invalid "${key}" value "${subcategory}" for category "${category}".`);
  }
  return subcategory;
}

export function ensureContentType(data: Record<string, unknown>, key = 'type'): ContentType {
  return ensureEnumValue(data[key], key, CONTENT_TYPE_VALUES);
}

export function ensureRequestType(data: Record<string, unknown>, key = 'type'): RequestType {
  return ensureEnumValue(data[key], key, REQUEST_TYPE_VALUES);
}

export function ensureRequestStatus(data: Record<string, unknown>, key = 'status'): RequestStatus {
  return ensureEnumValue(data[key], key, REQUEST_STATUS_VALUES);
}

export interface FirestoreSnapshot {
  id: string;
  data(): unknown;
}

export interface FirestoreDataConverter<T> {
  toFirestore(model: T): Record<string, unknown>;
  fromFirestore(snapshot: FirestoreSnapshot): T;
}

export function createConverter<T>(validate: (input: unknown, id?: string) => T): FirestoreDataConverter<T> {
  return {
    toFirestore(model: T): Record<string, unknown> {
      return validate(model) as Record<string, unknown>;
    },
    fromFirestore(snapshot: FirestoreSnapshot): T {
      return validate(snapshot.data(), snapshot.id);
    }
  };
}
