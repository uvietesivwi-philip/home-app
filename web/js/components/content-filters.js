import { CATEGORY_DEFINITIONS, CATEGORY_KEYS } from '../categories/definitions.js';

export class ContentFilters {
  constructor({ root, onChange }) {
    this.root = root;
    this.onChange = onChange;
    this.state = {
      category: 'all',
      subcategory: 'all',
      type: 'all'
    };
  }

  render() {
    this.root.innerHTML = `
      <select data-filter="category"></select>
      <select data-filter="subcategory"></select>
      <select data-filter="type"></select>
    `;

    this.categorySelect = this.root.querySelector('[data-filter="category"]');
    this.subcategorySelect = this.root.querySelector('[data-filter="subcategory"]');
    this.typeSelect = this.root.querySelector('[data-filter="type"]');

    this.categorySelect.addEventListener('change', () => {
      this.state.category = this.categorySelect.value;
      this.state.subcategory = 'all';
      this.state.type = 'all';
      this.fillSubcategoryOptions();
      this.fillTypeOptions();
      this.emitChange();
    });

    this.subcategorySelect.addEventListener('change', () => {
      this.state.subcategory = this.subcategorySelect.value;
      if (this.state.subcategory !== 'all') this.state.type = 'all';
      this.fillTypeOptions();
      this.emitChange();
    });

    this.typeSelect.addEventListener('change', () => {
      this.state.type = this.typeSelect.value;
      if (this.state.type !== 'all') this.state.subcategory = 'all';
      this.fillSubcategoryOptions();
      this.emitChange();
    });

    this.fillCategoryOptions();
    this.fillSubcategoryOptions();
    this.fillTypeOptions();
  }

  fillCategoryOptions() {
    const options = ['all', ...CATEGORY_KEYS];
    this.categorySelect.innerHTML = options
      .map((value) => `<option value="${value}">${value.toUpperCase()}</option>`)
      .join('');
  }

  fillSubcategoryOptions() {
    const subs = this.state.category === 'all'
      ? []
      : CATEGORY_DEFINITIONS[this.state.category].subcategories;
    this.subcategorySelect.innerHTML = ['all', ...subs]
      .map((value) => `<option value="${value}">${value.toUpperCase()}</option>`)
      .join('');
    this.subcategorySelect.value = this.state.subcategory;
  }

  fillTypeOptions() {
    const types = this.state.category === 'all'
      ? []
      : CATEGORY_DEFINITIONS[this.state.category].types;
    this.typeSelect.innerHTML = ['all', ...types]
      .map((value) => `<option value="${value}">${value.toUpperCase()}</option>`)
      .join('');
    this.typeSelect.value = this.state.type;
  }

  emitChange() {
    this.onChange({ ...this.state });
  }

  getValue() {
    return { ...this.state };
  }
}
