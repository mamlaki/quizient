// src/controllers/UIController/FilterMenu.ts
// ------------------------------------------
// Manages the filter/sort dropdown menus and user selections

import { safeQuerySelector } from "../../utils/dom";

export interface FilterMenuCallbacks {
  onChange: (filter: string, sort: string) => void;
}

export default class FilterMenu {
  private filterBtn: HTMLButtonElement | null;
  private filterMenu: HTMLUListElement | null;
  private currentFilter: string;
  private currentSort: string;

  private callbacks: FilterMenuCallbacks;

  constructor(callbacks: FilterMenuCallbacks, initial = { filter: 'filter-all', sort: 'sort-az'}) {
    this.filterBtn = safeQuerySelector<HTMLButtonElement>('#filter-dropdown-btn');
    this.filterMenu = safeQuerySelector<HTMLUListElement>('#filter-dropdown-menu');
    this.currentFilter = initial.filter;
    this.currentSort = initial.sort;

    this.callbacks = callbacks;

    this.init();
  }


  // Getters
  getFilter() { return this.currentFilter; }
  getSort() { return this.currentSort; }

  // Setters
  setFilter(value: string) { this.currentFilter = value; }
  setSort(value: string) { this.currentSort = value; }


  private init(): void {
    if (!this.filterBtn || !this.filterMenu) return;

    this.filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = this.filterMenu!.dataset.state === 'open';
        this.setMenuState(!open);
    });

    this.filterMenu.addEventListener('click', (e) => {
        const option = (e.target as HTMLElement).closest('.filter-option') as HTMLLIElement | null;
        if (!option) return;

        const action = option.dataset.action!;
        if (action.startsWith('filter-')) this.currentFilter = action;
        if (action.startsWith('sort-')) this.currentSort = action;

        this.callbacks.onChange(this.currentFilter, this.currentSort);
        this.setMenuState(false);
    });

    document.addEventListener('click', (e) => {
        if (this.filterBtn && this.filterMenu && !this.filterBtn.contains(e.target as Node) && !this.filterMenu.contains(e.target as Node)) {
            this.setMenuState(false);
        }
    })
  }

  private setMenuState(open: boolean): void {
    if (!this.filterMenu || !this.filterBtn) return;
    this.filterMenu.setAttribute('data-state', open ? 'open' : 'closed');
    this.filterBtn.setAttribute('aria-expanded', String(open));
  }
}