// -------- Imports --------
// File processing
import { XMLBuilder } from 'fast-xml-parser';
import { read, utils } from 'xlsx';
// UI/UX
import { createElement, CircleCheck, CircleX, LoaderCircle } from 'lucide';

// Web Components
import './components/SiteHeader';
import './components/SiteFooter';

// Constants
const TRANSITION_DURATION = 300;
const TAILWIND_LG_BREAKPOINT = 1024;
const LOG_QUEUE_DELAY = 400;
const FADE_IN_DELAY = 10;

// -------- Utilities --------
// Type-safe Queries
const safeQuerySelector = <T extends HTMLElement>(selector: string): T | null => document.querySelector(selector) as T | null;
const safeQuerySelectorAll = <T extends HTMLElement>(selector: string): NodeListOf<T> => document.querySelectorAll(selector) as NodeListOf<T>;

// -------- Types --------
type LogEntry = {
    message: string;
    callback?: () => void;
    logType?: 'info' | 'error';
}

// Row type declaration
type Row = {
    Type: string;
    Title: string;
    Question: string;
    OptionA?: string;
    OptionB?: string;
    OptionC?: string;
    OptionD?: string;
    Correct?: string;
    UseCase?: string;
};

type Question = {
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

// ---------------- Table of Contents Class ----------------
class TableOfContents {
    private tocToggle: HTMLButtonElement | null;
    private tocClose: HTMLButtonElement | null;
    private pageNav: HTMLElement | null;
    private tocLinks: NodeListOf<HTMLAnchorElement>;

    constructor() {
        this.tocToggle = safeQuerySelector<HTMLButtonElement>('#toc-toggle');
        this.tocClose = safeQuerySelector<HTMLButtonElement>('#toc-close');
        this.pageNav = safeQuerySelector<HTMLElement>('#page-nav');
        this.tocLinks = safeQuerySelectorAll<HTMLAnchorElement>('.toc-link');
    }

    init(): void {
        if (!this.pageNav || !this.tocToggle || !this.tocClose) return;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        if (!this.tocToggle || !this.tocClose) return;
        this.tocToggle.addEventListener('click', this.handleToggleClick.bind(this));
        this.tocClose.addEventListener('click', this.closeToc.bind(this));

        this.tocLinks.forEach(link => {
            link.addEventListener('click', this.handleLinkClick.bind(this));
        });
    }

    private handleToggleClick(e: Event): void {
        e.stopPropagation();
        if (this.pageNav?.classList.contains('-translate-x-full')) {
            this.openToc();
        } else {
            this.closeToc();
        }
    }

    private handleLinkClick(): void {
        if (window.innerWidth < TAILWIND_LG_BREAKPOINT) {
            this.closeToc();
        }
    }

    private openToc(): void {
        if (!this.pageNav || !this.tocToggle) return;

        this.pageNav.classList.remove('-translate-x-full');
        this.pageNav.classList.add('translate-x-0');
        this.tocToggle.setAttribute('aria-expanded', 'true');

        this.showOverlay();
        document.body.style.overflow = 'hidden';
    }

    private closeToc(): void {
        if (!this.pageNav || !this.tocToggle) return;

        this.pageNav.classList.add('-translate-x-full');
        this.pageNav.classList.remove('translate-x-0');
        this.tocToggle.setAttribute('aria-expanded', 'false');

        this.hideOverlay();
        document.body.style.overflow = '';
    }

    private showOverlay(): void {
        let overlay = safeQuerySelector<HTMLDivElement>('#toc-overlay');

        if (!overlay) {
            overlay = this.createOverlay();
        }

        overlay!.classList.remove('hidden');
        requestAnimationFrame(() => {
            overlay!.classList.remove('opacity-0');
            overlay!.classList.add('opacity-50');
        });
    }

    private hideOverlay(): void {
        const overlay = safeQuerySelector<HTMLDivElement>('#toc-overlay');
        if (!overlay) return;

        overlay.classList.remove('opacity-50');
        overlay.classList.add('opacity-0');

        setTimeout(() => {
            overlay.classList.add('hidden');
        }, TRANSITION_DURATION);
    }

    private createOverlay(): HTMLDivElement {
        const overlay = document.createElement('div');
        overlay.id = 'toc-overlay';
        overlay.className = 'fixed inset-0 z-30 bg-black opacity-0 transition-opacity duration-300 lg:hidden';
        overlay.addEventListener('click', this.closeToc.bind(this));
        document.body.appendChild(overlay);
        return overlay;
    }
}
// ---------------- END OF: Table of Contents Class ----------------



// ---------------- UI Controller Class ----------------
class UIController {
    private btn: HTMLButtonElement | null;
    private log: HTMLElement | null;
    private previewContainer: HTMLElement | null;
    private preview: HTMLElement | null;
    private searchBtn: HTMLButtonElement | null;
    private clearSearchBtn: HTMLButtonElement | null;
    private searchInput: HTMLInputElement | null;
    private filterBtn: HTMLButtonElement | null;
    private filterMenu: HTMLUListElement | null;
    private currentFilter: string = 'filter-all';
    private currentSort: string = 'sort-az';
    
    constructor() {
        this.btn = safeQuerySelector<HTMLButtonElement>('#convert-btn');
        this.log = safeQuerySelector<HTMLElement>('#log');


        this.previewContainer = safeQuerySelector<HTMLElement>('#preview-container');
        this.preview = safeQuerySelector<HTMLElement>('#preview');

        this.searchBtn = safeQuerySelector<HTMLButtonElement>('#search-btn');
        this.clearSearchBtn = safeQuerySelector<HTMLButtonElement>('#clear-search-btn');
        this.searchInput = safeQuerySelector<HTMLInputElement>('#search-input');

        this.filterBtn = safeQuerySelector<HTMLButtonElement>('#filter-dropdown-btn');
        this.filterMenu = safeQuerySelector<HTMLUListElement>('#filter-dropdown-menu');

        this.initSearch();
        this.initfilterMenu();
    }

    // FILTER
    private initfilterMenu(): void {
        if (!this.filterBtn || !this.filterMenu) return;

        this.filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = this.filterMenu!.getAttribute('data-state') === 'open';
            this.setDropdownState(!open);
        });

        this.filterMenu.addEventListener('click', (e) => {
            const option = (e.target as HTMLElement).closest('.filter-option') as HTMLLIElement | null;
            if (!option) return;

            const action = option.dataset.action!;
            if (action.startsWith('filter-')) this.currentFilter = action;
            if (action.startsWith('sort-')) this.currentSort = action;

            this.applyFilterAndSort();
            this.filterPreview();
            this.setDropdownState(false);
        });

        document.addEventListener('click', (e) => {
            if (this.filterBtn && this.filterMenu && !this.filterBtn.contains(e.target as Node) && !this.filterMenu.contains(e.target as Node)) {
                this.setDropdownState(false);
            }
        })
    }

    private setDropdownState(open: boolean): void {
        if (!this.filterMenu || !this.filterBtn) return;
        this.filterMenu.setAttribute('data-state', open ? 'open' : 'closed');
        this.filterBtn.setAttribute('aria-expanded', String(open));
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

    // ----- ENDOF: FILTER -----

    // SEARCH
    private initSearch(): void {
        if (!this.searchBtn || !this.searchInput || !this.clearSearchBtn) return;

        this.searchBtn.addEventListener('click', () => this.toggleSearch());
        this.searchInput.addEventListener('input', () =>  {
            this.filterPreview();
            this.toggleClearButton();
        });

        this.clearSearchBtn.addEventListener('click', () => {
            if (!this.searchInput) return;
            this.searchInput.value = '';
            this.filterPreview();
            this.toggleClearButton();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleSearch(true);
                this.toggleClearButton();
            }
        });
    }   

    private toggleClearButton(): void {
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

    private toggleSearch(forceClose = false): void {
        if (!this.searchInput) return;

        const shouldClose = forceClose || !this.searchInput.classList.contains('w-0');
        this.searchInput.classList.toggle('w-0', shouldClose);
        this.searchInput.classList.toggle('opacity-0', shouldClose);
        this.searchInput.classList.toggle('w-48', !shouldClose);
        this.searchInput.classList.toggle('opacity-100', !shouldClose);

        if (shouldClose) {
            this.searchInput.value = '';
            this.filterPreview();
        } else {
            this.searchInput.focus();
            this.toggleClearButton();
        }
    }

    private filterPreview(): void {
        if (!this.searchInput) return;

        const query = this.searchInput.value.trim().toLowerCase();
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
                    this.applyFilterAndSort();
                    this.filterPreview();
                });
            }

            badgeContainer.appendChild(sortBadge);
        }
    }
    // ----- ENDOF: SEARCH -----


    // DOWNLOAD BUTTON
    showDownloadBtn(): void {
        if (!this.btn) return;
        
        this.btn.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.btn!.classList.remove('opacity-0');
            this.btn!.classList.add('opacity-100');
        }); 
    }

    hideDownloadBtn(): void {
        if (!this.btn) return;

        this.btn.classList.remove('opacity-100');
        this.btn.classList.add('opacity-0');
        setTimeout(() => {
            this.btn!.classList.add('hidden');
        }, TRANSITION_DURATION);
    }
    // ----- ENDOF: DOWNLOAD BUTTON -----


    // LOG
    showLog(): void {
        this.log?.classList.remove('hidden');
    }

    clearLog(): void {
        if (this.log) {
            this.log.innerHTML = '';
        }
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
        title.className = 'font-bold text-gray-800';
        title.textContent = `Q${index + 1}: ${question.name.text}`;

        const typeBadge = document.createElement('span');
        typeBadge.className = 'text-xs font-semibold uppercase px-2 py-1 rounded-full bg-sky-100 text-sky-700';
        typeBadge.textContent = question['@_type'];

        header.appendChild(title);
        header.appendChild(typeBadge);

        // Questions
        const questionWrapper = document.createElement('div');
        questionWrapper.className = 'question-preview-item mb-4 p-4 rounded-md bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ease-in-out';

        const questionText = document.createElement('p');
        questionText.className = 'mb-3 text-gray-700';
        questionText.innerHTML = question.questiontext.text['#cdata'];

        // Answers
        const answersWrapper = document.createElement('div');
        answersWrapper.className = 'answers-preview pt-3';

        const answersHeader = document.createElement('h5');
        answersHeader.className = 'text-xs font-semibold text-gray-500 mb-2';
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

        list.className = `${isMultichoice ? 'list-none' : 'list-disc'} pl-5 space-y-1 text-gray-600`;

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

    appendLog(message: string): HTMLDivElement | null {
        if (!this.log) return null;
        
        this.showLog();
        const entry = document.createElement('div');
        entry.className = 'log-entry flex flex-row-reverse justify-end items-center gap-2 opacity-0 transition-opacity duration-500 mb-2';

        setTimeout(() => {
            entry.classList.add('opacity-100');
        }, FADE_IN_DELAY);

        const loadingIcon = createElement(LoaderCircle, { size: 18, class: 'log-loading-icon' });
        loadingIcon.classList.add('animate-spin', 'text-sky-400');

        const logText = document.createElement('span');
        logText.textContent = message;

        entry.appendChild(loadingIcon);
        entry.append(logText);
        this.log.appendChild(entry);

        return entry;
    }

}
// ---------------- END OF: UI Controller Class ----------------



// ---------------- Log Queue Class ----------------
class LogQueue {
    private queue: LogEntry[] = [];
    private isProcessing = false;
    private ui: UIController;

    constructor(ui: UIController) {
        this.ui = ui;
    }

    add(message: string, callback?: () => void, logType: 'info' | 'error' = 'info'): void {
        this.queue.push({ message, callback, logType });
        this.process();
    }

    clear(): void {
        this.queue = [];
        this.isProcessing = false;
    }

    private process(): void {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const { message, callback, logType = 'info' } = this.queue.shift()!;
        const entry = this.ui.appendLog(message);

        if (!entry) {
            this.isProcessing = false;
            callback?.();
            this.process();
            return;
        }

        setTimeout(() => {
            this.updateLogIcon(entry, logType);
            this.isProcessing = false;
            callback?.();
            this.process();
        }, LOG_QUEUE_DELAY);
    }

    private updateLogIcon(entry: HTMLDivElement, logType: 'info' | 'error'): void {
        const loadingIcon = entry.querySelector('.log-loading-icon');
        if (!loadingIcon) return;

        const icon = logType === 'error'
            ? createElement(CircleX, { size: 18, class: 'log-icon-updated text-rose-600' })
            : createElement(CircleCheck, { size: 18, class: 'log-icon-updated text-green-600' });

        loadingIcon.replaceWith(icon);
    }
}
// ---------------- END OF: Log Queue Class ----------------



// ---------------- File Processor Class ----------------
class FileProcessor {
    private ui: UIController;
    private logQueue: LogQueue;
    private xmlString = ""; // Final XML output container
    private questions: Question[] = [];

    // File types
    private readonly supportedFileTypes: Record<string, string> = {
        'text/csv': 'CSV',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
        'application/vnd.ms-excel': 'XLS',
        'application/vnd.oasis.opendocument.spreadsheet': 'ODS'
    };

    constructor(ui: UIController, logQueue: LogQueue) {
        this.ui = ui;
        this.logQueue = logQueue;
    }

    async processFiles(files: File[]): Promise<void> {
        this.resetUI();

        const allQuestions: Question[] = [];
        let totalRows = 0;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            this.logQueue.add(`Loading (${i + 1}/${files.length}): ${file.name}`);
            
            const fileTypeInfo = this.validateFileType(file);
            if (!fileTypeInfo.isValid) {
                this.logQueue.add(fileTypeInfo.errorMessage!, undefined, 'error');
                this.ui.hideDownloadBtn();
                continue;
            }

            this.logQueue.add(`Processing ${fileTypeInfo.description} file: ${file.name}...`);

            try {
                const { questions, totalRows: rows } = await this.parseFile(file);
                totalRows += rows;
                allQuestions.push(...questions);
            } catch (error) {
                console.error(`Error processing ${file.name}: `, error);
                this.logQueue.add(`Error processing ${file.name} (${fileTypeInfo.description}). Open the console for more information.`);
            }
        }

        this.questions = allQuestions;
        this.generateXML({ questions: allQuestions, totalRows }, files.map(f => f.name).join(', '));
    }

    getXMLString(): string {
        return this.xmlString;
    }

    private resetUI(): void {
        this.ui.clearLog();
        this.logQueue.clear();
        this.ui.hideDownloadBtn();
        this.ui.clearPreview();
        this.ui.hidePreview();
    }

    private validateFileType(file: File): { isValid: boolean; description?: string; errorMessage?: string } {
        const fileTypeDesc = this.supportedFileTypes[file.type];

        if (fileTypeDesc) {
            return { isValid: true, description: fileTypeDesc};
        }

        if (file.type === '' || file.type === 'application/octet-stream') { // Unknown file
            return { isValid: true, description: 'Unknown' };
        }

        return {
            isValid: false,
            errorMessage: `Unsupported file type: ${file.type}. Supported file types: Excel (.xlsx, .xls), .ods, or .csv.`
        };
    }

    private async parseFile(file: File): Promise<{ questions: any[]; totalRows: number }> {
        const buffer = await file.arrayBuffer();
        const wb = read(buffer, { type: 'array' });

        let allQuestions: Question[] = [];
        let totalRowsProcessed = 0;

        for (const sheetName of wb.SheetNames) {
            console.log(`Processing sheet: ${sheetName}`);

            const sheet = wb.Sheets[sheetName];
            const rows = utils.sheet_to_json<Row>(sheet, { raw: false });
            totalRowsProcessed += rows.length;

            const questionsFromSheet = rows.map(row => this.rowToQuestion(row)).filter((question): question is Question => question !== null);

            allQuestions = allQuestions.concat(questionsFromSheet);

            if (rows.length > 0) {
                console.log(`Found ${rows.length} rows in sheet "${sheetName}", generated ${questionsFromSheet.length} questions.`);
            }
        }

        return { questions: allQuestions, totalRows: totalRowsProcessed };
    }

    private generateXML(result: { questions: any[]; totalRows: number}, fileName: string): void {
        const { questions: allQuestions, totalRows: totalRowsProcessed } = result;

        // Validation checks
        if (totalRowsProcessed === 0) { // No data in rows
            this.logQueue.add(`No data found in any sheets of ${fileName}. Make sure sheets have headers and content.`, undefined, 'error');
            this.ui.hideDownloadBtn();
            return;
        }

        if (allQuestions.length === 0 && totalRowsProcessed > 0) { // No valid questions found within rows
            this.logQueue.add(`No valid questions could be generated from ${fileName}.`, undefined, 'error');
            this.ui.hideDownloadBtn();
            return;
        }

        // Build XML
        const builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            format: true,
            cdataPropName: '#cdata'
        });

        this.xmlString = builder.build({ quiz: {question: allQuestions } });

        this.logQueue.add(`Generated ${allQuestions.length} questions`, () => {
            if (totalRowsProcessed > allQuestions.length) {
                this.logQueue.add(`(${totalRowsProcessed - allQuestions.length} rows skipped across all files).`);
            } 
            this.ui.renderPreview(this.questions);
            this.ui.showDownloadBtn();
        });
    }

    private rowToQuestion(row: Row) {
        const sharedElements = {
            name: { text: row.Title },
            questiontext: { '@_format': 'html', text: { '#cdata': row.Question } }
        };

        const questionType = row.Type?.toLowerCase(); // what is the question type/does it exist?

        if (questionType === 'truefalse') { // True/false question type
            const isCorrectTrue = row.Correct?.toLowerCase() === 'true';
            return {
                ...sharedElements,
                '@_type': 'truefalse',
                answer: [
                    {
                        '@_fraction': isCorrectTrue? '100' : '0',
                        '@_format': 'moodle_auto_format',
                        text: 'true'
                    },
                    {
                        '@_fraction': !isCorrectTrue? '100' : '0',
                        '@_format': 'moodle_auto_format',
                        text: 'false'
                    }
                ]
            };
        } else if (questionType === 'shortanswer') {
             // Short answer question type
            const useCase = row.UseCase === '1' ? 1 : 0;
            // Allow several correct answers
            const altKeys = Object.keys(row).filter(key => /^Correct\d+$/.test(key)); 
            const alternativeAnswers = altKeys.map(key => (row as any)[key]?.trim()).filter(val => val);

            const answers = alternativeAnswers.map(answer => ({
                '@_fraction': '100',
                '@_format': 'moodle_auto_format',
                text: answer
            }));

            return {
                ...sharedElements,
                '@_type': 'shortanswer',
                usecase: useCase,
                answer: answers
            };
        } else {
            // Default to multiplechoice 
            // Build answers list
            const answers = ['A', 'B', 'C', 'D'].flatMap(label => {
                const text = (row as any)[`Option${label}`];
                if (!text) {
                    return [];
                }
                return [{
                    '@_fraction': row.Correct?.toUpperCase().includes(label) ? '100' : '0',
                    text
                }]
            });
            
            // Return a Moodle XML question object
            return {
                ...sharedElements,
                '@_type': 'multichoice',
                answer: answers
            };
        }
    }

}
// ---------------- END OF: File Processor Class ----------------



// ---------------- Main App Init ----------------
document.addEventListener('DOMContentLoaded', () => {
    // Initialize ccomponents using classes
    const toc = new TableOfContents(); // Table of Contents class instance
    toc.init();
    const ui = new UIController(); // UI Controller class instance
    const logQueue = new LogQueue(ui); // Log queue class instance
    const fileProcessor = new FileProcessor(ui, logQueue);

    // DOM declarations
    const $file = safeQuerySelector<HTMLInputElement>('#file-input');
    const $btn = safeQuerySelector<HTMLButtonElement>('#convert-btn');
    const $dropZone = safeQuerySelector<HTMLElement>('#drop-zone');
    const $downloadTemplateTriggers = safeQuerySelectorAll<HTMLElement>('.download-template');
    const $templateDropdown = safeQuerySelector<HTMLDivElement>('#template-dropdown');

    const triggerTemplateDownload = (format: string) => {
        const fileName = `quizient_template.${format}`;
        const templateUrl = `${import.meta.env.BASE_URL}${fileName}`;
        Object.assign(document.createElement('a'), {
            href: templateUrl,
            download: fileName
        }).click();
    };
   

    // Template download link handler
    $downloadTemplateTriggers.forEach(trigger => {
        trigger.addEventListener('click', e => {
            e.preventDefault();
            const format = (e.currentTarget as HTMLElement).dataset.format || 'xlsx';
            triggerTemplateDownload(format);
        });
    });

    // Template home page dropdown handler
    if ($templateDropdown) {
        const btn = safeQuerySelector<HTMLButtonElement>('#template-dropdown-btn');
        const menu = safeQuerySelector<HTMLUListElement>('#template-dropdown-menu');

        if (btn && menu) {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const state = menu.getAttribute('data-state');
                if (state === 'closed') {
                    menu.setAttribute('data-state', 'open');
                    btn.setAttribute('aria-expanded', 'true');
                } else {
                    menu.setAttribute('data-state', 'closed');
                    btn.setAttribute('aria-expanded', 'false');
                }

            });

            menu.addEventListener('click', e => {
                const option = (e.target as HTMLElement).closest('.template-option');
                if (option instanceof HTMLLIElement) {
                    const format = option.dataset.format;
                    if (format) {
                        triggerTemplateDownload(format);
                        menu.setAttribute('data-state', 'closed');
                        btn.setAttribute('aria-expanded', 'false');
                    }
                }
            });

            document.addEventListener('click', e => {
                if (btn && menu && !btn.contains(e.target as Node) && !menu.contains(e.target as Node)) {
                    menu.setAttribute('data-state', 'closed');
                    btn.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }


    if ($file && $dropZone && $btn) {
        // -------- When a user adds a file --------
        $file.addEventListener('change', () => {
            if (!$file.files?.length) return;
            fileProcessor.processFiles(Array.from($file.files));
        });

        // -------- Drop zone functionality --------
        // Highlight style when a file is hovering above
        $dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            $dropZone.classList.add('bg-sky-50');
        });
    
        // Remove hovering above styles
        $dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            $dropZone.classList.remove('bg-sky-50');
        }); 
    
        // Actual functionality
        $dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            $dropZone.classList.remove('bg-sky-50');
            const files = e.dataTransfer?.files;
            if (!files || !files.length) return;

            fileProcessor.processFiles(Array.from(files));
        });
    
        $dropZone.addEventListener('click', () => {
            $file.click();
        })
        
        // -------- Download button click functionality --------
        $btn.addEventListener('click', () => {
            const blob = new Blob([fileProcessor.getXMLString()], { type: 'text/xml' }); // create blob 
            const url = URL.createObjectURL(blob); // temp blob url
        
            // Create hidden link that is auto clicked which downloads the file}
            Object.assign(document.createElement('a'), {
                href: url,
                download: 'questions.xml'
            }).click();
        
            URL.revokeObjectURL(url); // revokes the temp blob url
        });
    }
})