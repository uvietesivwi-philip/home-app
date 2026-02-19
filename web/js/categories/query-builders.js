export const FIRESTORE_FIELDS = Object.freeze({
  category: 'category',
  subcategory: 'subcategory',
  type: 'type',
  createdAt: 'createdAt'
});

function baseQuery(category) {
  return {
    collection: 'content',
    where: [[FIRESTORE_FIELDS.category, '==', category]],
    orderBy: [FIRESTORE_FIELDS.createdAt, 'desc']
  };
}

export function buildCategoryOnlyQuery(category) {
  return baseQuery(category);
}

export function buildCategoryAndSubcategoryQuery(category, subcategory) {
  const query = baseQuery(category);
  query.where.push([FIRESTORE_FIELDS.subcategory, '==', subcategory]);
  return query;
}

export function buildCategoryAndTypeQuery(category, type) {
  const query = baseQuery(category);
  query.where.push([FIRESTORE_FIELDS.type, '==', type]);
  return query;
}

export function resolveCategoryQuery({ category, subcategory, type }) {
  if (!category || category === 'all') {
    return {
      collection: 'content',
      where: [],
      orderBy: [FIRESTORE_FIELDS.createdAt, 'desc']
    };
  }

  if (subcategory && subcategory !== 'all') {
    return buildCategoryAndSubcategoryQuery(category, subcategory);
  }

  if (type && type !== 'all') {
    return buildCategoryAndTypeQuery(category, type);
  }

  return buildCategoryOnlyQuery(category);
}
