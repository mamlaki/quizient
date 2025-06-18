// src/controllers/UIController/SearchBar.ts
// -----------------------------------------
// Handles the preview searchbar functionality and style-changes

import { safeQuerySelector } from "../../utils/dom";
import { TRANSITION_DURATION } from "../../constants";

export interface SearchBarCallbacks {
  onQueryChange: (query: string) => void;
}

export default class SearchBar {
  private searchBtn: HTMLButtonElement | null;
  private clearSearchBtn: HTMLButtonElement | null;
  private searchInput: HTMLInputElement | null;
  private callbacks: SearchBarCallbacks;

  constructor(callbacks: SearchBarCallbacks) {
    this.searchBtn = safeQuerySelector<HTMLButtonElement>('#search-btn');
    this.clearSearchBtn = safeQuerySelector<HTMLButtonElement>('#clear-search-btn');
    this.searchInput = safeQuerySelector<HTMLInputElement>('#search-input');
    this.callbacks = callbacks;

    this.init();
  }

  private init(): void {
    if (!this.searchBtn || !this.searchInput || !this.clearSearchBtn) return;
    this.searchBtn.addEventListener('click', () => this.toggleSearch());

    this.searchInput.addEventListener('input', () => {
      this.notifyChange();
      this.updateClearBtn();
    });

    this.clearSearchBtn.addEventListener('click', () => {
      if (!this.searchInput) return;
      this.searchInput.value = '';
      this.notifyChange();
      this.updateClearBtn();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.toggleSearch(true);
        this.updateClearBtn();
      }
    })
  }

  private toggleSearch(forceClose = false): void {
    if (!this.searchInput) return;

    const shouldClose = forceClose || !this.searchInput.classList.contains('w-0');
    this.searchInput.classList.toggle('w-0', shouldClose);
    this.searchInput.classList.toggle('opacity-0', shouldClose);
    this.searchInput.classList.toggle('w-48', !shouldClose);
    this.searchInput.classList.toggle('opacity-100', !shouldClose);

    if (shouldClose) {
        this.searchInput.value = '';
        this.notifyChange();
    } else {
        this.searchInput.focus();
        this.updateClearBtn();
    }
  }

  private notifyChange(): void {
    if (!this.searchInput) return;
    this.callbacks.onQueryChange(this.searchInput.value.trim().toLowerCase());
  }

  private updateClearBtn(): void {
    if (!this.clearSearchBtn || !this.searchInput) return;

    if (this.searchInput.value.trim()) {
      this.clearSearchBtn.classList.remove('hidden', 'opacity-0');
      this.clearSearchBtn.classList.add('opacity-100');
    } else {
        this.clearSearchBtn.classList.remove('opacity-100')
        this.clearSearchBtn.classList.add('opacity-0');
        setTimeout(() => {
            this.clearSearchBtn?.classList.add('hidden');
        }, TRANSITION_DURATION);
    }
  }
}