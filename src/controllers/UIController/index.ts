// src/controlers/UIController/index.ts
// ------------------------------------
// Controller that manages everything UI related; will be broken up further later

// Imports
// utils & constants
import { safeQuerySelector, safeQuerySelectorAll } from "../../utils/dom";
import { TRANSITION_DURATION, FADE_IN_DELAY } from "../../constants";

// Sub-controllers
import DownloadButton from "./DownloadButton";
import SearchBar from "./SearchBar";
import FilterMenu from "./FilterMenu";
import LogDisplay from "./LogDisplay";

// Third-Party imports
import DOMPurify from "dompurify";
import { createElement, LoaderCircle } from "lucide";

// Types
export type Question = {
  '@_type': 'multichoice' | 'truefalse' | 'shortanswer';
  name: { text: string };
  questiontext: {
      '@_format': 'html';
      text: {
          '#cdata': string;
      };
  };
  answer: any[];
  usecase?: number;
}


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

  private previewContainer: HTMLElement | null;
  private preview: HTMLElement | null;

  private currentFilter = 'filter-all';
  private currentSort = 'sort-az';
  private searchQuery = '';

  
  constructor() {
      this.previewContainer = safeQuerySelector<HTMLElement>('#preview-container');
      this.preview = safeQuerySelector<HTMLElement>('#preview');

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
      const questions = Array.from(safeQuerySelectorAll<HTMLDivElement>('#preview .question-preview-item'));
      
      // Filter
      questions.forEach(question => {
          const type = question.querySelector('span')?.textContent || ''; // type in badge

          const show = 
              this.currentFilter === 'filter-all' ||
              (this.currentFilter === 'filter-multichoice' && type === 'multichoice') ||
              (this.currentFilter === 'filter-truefalse' && type ==='truefalse') ||
              (this.currentFilter === 'filter-shortanswer' && type === 'shortanswer')
          question.classList.toggle('hidden', !show);
      });

      // Sort
      const container = this.preview!;
      const visibleCards = questions.filter(q => !q.classList.contains('hidden'));

      visibleCards.sort((a, b) => {
          const A = a.querySelector('h4')?.textContent?.toLowerCase() || '';
          const B = b.querySelector('h4')?.textContent?.toLowerCase() || '';
          if (this.currentSort === 'sort-az') return A.localeCompare(B);
          return B.localeCompare(A);
      });

      // Rerender
      visibleCards.forEach(question => container.appendChild(question));
  }



  private filterPreview(): void {
      const query = this.searchQuery;

      const questions = Array.from(safeQuerySelectorAll<HTMLDivElement>('#preview .question-preview-item'));

      questions.forEach(question => {
          const type = question.querySelector('span')?.textContent || '';
          const matchesFilter = this.currentFilter === 'filter-all' ||
              (this.currentFilter === 'filter-multichoice' && type === 'multichoice') ||
              (this.currentFilter === 'filter-truefalse' && type === 'truefalse') ||
              (this.currentFilter === 'filter-shortanswer' && type === 'shortanswer');

          const matchesSearch = !query || question.textContent?.toLowerCase().includes(query);
          
          question.classList.toggle('hidden', !(matchesFilter && matchesSearch));
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
  // ----- ENDOF: SEARCH -----

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

  // ----- ENDOF: LOG -----


  // PREVIEW
  showPreview(): void {
      if (!this.previewContainer) return;

      this.previewContainer?.classList.remove('hidden');
      requestAnimationFrame(() => {
          this.previewContainer?.classList.remove('opacity-0');
          this.previewContainer?.classList.add('opacity-100');
      });
  }

  hidePreview(): void {
      if (!this.previewContainer) return;
      this.previewContainer.classList.remove('opacity-100');
      this.previewContainer.classList.add('opacity-0');
      setTimeout(() => {
          this.previewContainer?.classList.add('hidden');
      }, TRANSITION_DURATION);
      this.previewContainer?.classList.add('hidden');
  }

  clearPreview(): void {
      if (this.preview) this.preview.innerHTML = '';
  }

  renderPreview(questions: Question[]): void {
      if (!this.preview) return;
      this.clearPreview();
      if (questions.length > 0) {
          this.showPreview();
      } else {
          this.hidePreview();
          return;
      }

      questions.forEach((question, index) =>  {
          const questionElement = this.createQuestionElement(question, index);
          this.preview?.appendChild(questionElement);
      });

      this.applyFilterAndSort();
      this.filterPreview();
  }

  private createQuestionElement(question: Question, index: number): HTMLDivElement {
      // Header
      const header = document.createElement('div');
      header.className = 'flex justify-between items-center mb-2';

      const title = document.createElement('h4');
      title.className = 'font-bold text-gray-800 dark:text-gray-100';
      title.textContent = `Q${index + 1}: ${question.name.text}`;

      const typeBadge = document.createElement('span');
      typeBadge.className = 'text-xs font-semibold uppercase px-2 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300';
      typeBadge.textContent = question['@_type'];

      header.appendChild(title);
      header.appendChild(typeBadge);

      // Questions
      const questionWrapper = document.createElement('div');
      questionWrapper.className = 'question-preview-item mb-4 p-4 rounded-md bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ease-in-out';

      const questionText = document.createElement('p');
      questionText.className = 'mb-3 text-gray-700 dark:text-gray-300';
      // DOMPurify to sanitize 
      questionText.innerText = DOMPurify.sanitize(
          question.questiontext.text['#cdata'], { ALLOWED_URI_REGEXP: /^(?!javascript:)/i }
      );


      // Answers
      const answersWrapper = document.createElement('div');
      answersWrapper.className = 'answers-preview pt-3';

      const answersHeader = document.createElement('h5');
      answersHeader.className = 'text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2';
      answersHeader.textContent = 'Answers';
      answersWrapper.appendChild(answersHeader);

      const answerList = this.createAnswerList(question);
      answersWrapper.appendChild(answerList);


      questionWrapper.appendChild(header);
      questionWrapper.appendChild(questionText);
      questionWrapper.append(answersWrapper);

      return questionWrapper;

  }

  private createAnswerList(question: Question): HTMLUListElement {
      const list = document.createElement('ul');
      const isMultichoice = question['@_type'] === 'multichoice';
      const isTrueFalse = question['@_type'] === 'truefalse';

      list.className = `${isMultichoice ? 'list-none' : 'list-disc'} pl-5 space-y-1 text-gray-600 dark:text-gray-400`;

      question.answer.forEach((ans, index) => {
          const listItem = document.createElement('li');
          const isCorrect = ans['@_fraction'] === '100';
          let text = ans.text;

          if (isCorrect) {
              if (isTrueFalse) {
                  text = text.toUpperCase();
                  listItem.className = `${text === 'TRUE' ? 'text-green-700 font-semibold' : 'text-rose-700 font-semibold'}`;
              } else {
                  listItem.className = 'text-green-700 font-semibold';
              }
          }
          
          if (isMultichoice) {
              const prefix = String.fromCharCode(65 + index);
              text = `${prefix}. ${text}`;
          }

          listItem.textContent = text;
          list.appendChild(listItem);
      });

      return list;
  }

  // ----- ENDOF: PREVIEW -----

}