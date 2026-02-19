export const CATEGORY_DEFINITIONS = {
  cook: {
    label: 'Cook',
    subcategories: ['african', 'continental'],
    types: ['video', 'guide']
  },
  care: {
    label: 'Care',
    subcategories: ['bathing', 'dressing', 'hairstyling'],
    types: ['video', 'guide']
  },
  diy: {
    label: 'DIY',
    subcategories: ['decor', 'maintenance'],
    types: ['guide', 'checklist']
  },
  family: {
    label: 'Family',
    subcategories: ['parents', 'kids'],
    types: ['activity', 'story', 'video']
  }
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_DEFINITIONS);
