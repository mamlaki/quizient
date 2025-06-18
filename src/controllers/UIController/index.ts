// src/controlers/UIController/index.ts
// ------------------------------------
// Controller that manages everything UI related; will be broken up further later

// Imports
// utils & constants
import { safeQuerySelector } from "../../utils/dom";

// Sub-controllers
import DownloadButton from "./DownloadButton";
import SearchBar from "./SearchBar";
import FilterMenu from "./FilterMenu";
import LogDisplay from "./LogDisplay";
import PreviewPane from "./PreviewPane";

import { Question } from "../../types/quiz";

export default class UIController {
  private downloadButton = new DownloadButton();
  private searchBar = new SearchBar({
    onQueryChange: (q) =>  {
      this.searchQuery = q;
      this.filterPreview();
    }
  });
  private filterMenu: FilterMenu;
  private logDisplay = new LogDisplay();  
  private previewPane = new PreviewPane();


  private currentFilter = 'filter-all';
  private currentSort = 'sort-az';
  private searchQuery = '';

  
  constructor() {
      this.filterMenu = new FilterMenu(
        {
          onChange: (filter, sort) => {
            this.currentFilter = filter;
            this.currentSort = sort;
            this.applyFilterAndSort();
            this.filterPreview();
            this.updateActiveFiltersBadge();
          }
        },
        {
          filter: this.currentFilter,
          sort: this.currentSort
        }
      );
  }

  private applyFilterAndSort(): void {
      const cards = this.previewPane.getCards();
      
      // Filter
      cards.forEach(card => {
          const type = card.querySelector('span')?.textContent || ''; // type in badge

          const show = 
              this.currentFilter === 'filter-all' ||
              (this.currentFilter === 'filter-multichoice' && type === 'multichoice') ||
              (this.currentFilter === 'filter-truefalse' && type ==='truefalse') ||
              (this.currentFilter === 'filter-shortanswer' && type === 'shortanswer')
          card.classList.toggle('hidden', !show);
      });

      // Sort
      const container = this.previewPane.getRoot();
      const visibleCards = cards.filter(card => !card.classList.contains('hidden'));

      visibleCards.sort((a, b) => {
          const A = a.querySelector('h4')?.textContent?.toLowerCase() || '';
          const B = b.querySelector('h4')?.textContent?.toLowerCase() || '';
          if (this.currentSort === 'sort-az') return A.localeCompare(B);
          return B.localeCompare(A);
      });

      // Rerender
      visibleCards.forEach(question => container?.appendChild(question));
  }

  private filterPreview(): void {
      const query = this.searchQuery;

      const cards = this.previewPane.getCards();

      cards.forEach(card => {
          const type = card.querySelector('span')?.textContent || '';
          const matchesFilter = this.currentFilter === 'filter-all' ||
              (this.currentFilter === 'filter-multichoice' && type === 'multichoice') ||
              (this.currentFilter === 'filter-truefalse' && type === 'truefalse') ||
              (this.currentFilter === 'filter-shortanswer' && type === 'shortanswer');

          const matchesSearch = !query || card.textContent?.toLowerCase().includes(query);
          
          card.classList.toggle('hidden', !(matchesFilter && matchesSearch));
      });

      this.updateActiveFiltersBadge();
  }

  private updateActiveFiltersBadge(): void {
      const badgeContainer = safeQuerySelector<HTMLElement>('#active-filters');
      if (!badgeContainer) return;
      badgeContainer.innerHTML = '';


      // Filter Bdage
      if (this.currentFilter !== 'filter-all') {
          const filterBadge = document.createElement('span');
          filterBadge.className = 'inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700';

          let filterLabel = '';
          if (this.currentFilter === 'filter-multichoice') filterLabel = 'Multiple-choice';
          else if (this.currentFilter === 'filter-truefalse') filterLabel = 'True / False';
          else if (this.currentFilter === 'filter-shortanswer') filterLabel = 'Short answer';
          filterBadge.innerHTML = `
              <span>Filter: ${filterLabel}</span>
              <button
                  class="filter-clear-btn mt-0.3 ml-1 hover:text-amber-900 cursor-pointer" 
                  aria-label="Clear ${filterLabel} filter"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
          `;
          
          const clearBtn = filterBadge.querySelector('.filter-clear-btn');
          if (clearBtn) {
              clearBtn.addEventListener('click', () => {
                  this.currentFilter = 'filter-all';
                  this.filterMenu.setFilter('filter-all');
                  this.applyFilterAndSort();
                  this.filterPreview();
              });
          }

          badgeContainer.appendChild(filterBadge);
      }

      // Sort Badge
      if  (this.currentSort !== 'sort-az') {
          const sortBadge = document.createElement('span');
          sortBadge.className = 'inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-sky-100 text-sky-700';
          const sortLabel = this.currentSort === 'sort-az' ? 'A-Z' : 'Z-A';
          
          sortBadge.innerHTML = `
              <span>Sort: ${sortLabel}</span>
              <button
                  class="sort-clear-btn mt-0.3 ml-1 hover:text-sky-900 cursor-pointer" aria-label="Clear ${sortLabel} sort"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
          `;

          const clearBtn = sortBadge.querySelector('.sort-clear-btn');
          if (clearBtn) {
              clearBtn.addEventListener('click', () => {
                  this.currentSort = 'sort-az';
                  this.filterMenu.setSort('sort-az');
                  this.applyFilterAndSort();
                  this.filterPreview();
              });
          }

          badgeContainer.appendChild(sortBadge);
      }
  }
  
  // DOWNLOAD BTN
  showDownloadBtn(): void {
    this.downloadButton.show();
  }

  hideDownloadBtn(): void {
    this.downloadButton.hide();
  }


  // LOG
  showLog(): void {
      this.logDisplay.show();
  }

  hideLog(): void {
      this.logDisplay.hide();
  }

  clearLog(): void {
      this.logDisplay.clear();
  }

  appendLog(message: string): HTMLDivElement | null {
    return this.logDisplay.append(message);
  }

  // PREVIEW
  showPreview(): void {
      this.previewPane.show();
  }

  hidePreview(): void {
      this.previewPane.hide();
  }

  clearPreview(): void {
      this.previewPane.clear();
  }

  renderPreview(questions: Question[]): void {
    this.previewPane.render(questions);

      this.applyFilterAndSort();
      this.filterPreview();
  }
}