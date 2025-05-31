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
    
    constructor() {
        this.btn = safeQuerySelector<HTMLButtonElement>('#convert-btn');
        this.log = safeQuerySelector<HTMLElement>('#log');
    }

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

    showLog(): void {
        this.log?.classList.remove('hidden');
    }

    clearLog(): void {
        if (this.log) {
            this.log.innerHTML = '';
        }
    }

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


// Final XML output container
let xmlString = "";

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


// -------- Create Moodle XML question object from a row --------
function rowToQuestion(row: Row) {
    // Shared between multiplechoice and truefalse questions
    const sharedElements = {
        name: { text: row.Title },
        questiontext: { '@_format': 'html', text: { '#cdata': row.Question } },
    };

    const questionType = row.Type?.toLowerCase(); // what is the question type/does it exist

    if (questionType === 'truefalse') {
        // True/false question type
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
        // Default to multiplechoice for now if truefalse isn't being used
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
// -------- END OF: rowToQuestion --------



// ---------------- Main App Init ----------------
document.addEventListener('DOMContentLoaded', () => {
    // Initialize ccomponents using classes
    const toc = new TableOfContents(); // Table of Contents class instance
    toc.init();
    const ui = new UIController(); // UI Controller class instance
    const logQueue = new LogQueue(ui); // Log queue class instance

    // DOM declarations
    const $file = safeQuerySelector<HTMLInputElement>('#file-input');
    const $btn = safeQuerySelector<HTMLButtonElement>('#convert-btn');
    const $dropZone = safeQuerySelector<HTMLElement>('#drop-zone');

    // -------- When a user adds a file --------
    if ($file && $dropZone && $btn) {
        $file.addEventListener('change', async () => {
            // Reset UI elements
            ui.clearLog();
            logQueue.clear();
            ui.hideDownloadBtn();
        
            // Grab the first file (if multiple files were uploaded and if it exists)
            const file = $file.files?.[0];
            if (!file) return; 
            
            logQueue.add(`Loading: ${file.name} ...`); // UI update
            
            // UI updates based on file type
            const fileTypes: Record<string, string> = {
                'text/csv': 'CSV',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
                'application/vnd.ms-excel': 'XLS',
                'application/vnd.oasis.opendocument.spreadsheet': 'ODS'
            };
        
            let fileTypeDesc = fileTypes[file.type];
        
            if (fileTypeDesc) {
                console.log(`Processing ${fileTypeDesc} file: ${file.name}...`);
                logQueue.add(`Processing ${fileTypeDesc} file: ${file.name}...`);
            } else if (file.type === '' || file.type === 'application/octet-stream') {
                fileTypeDesc = 'Unknown';
                logQueue.add(`Processing file (unknown, type): ${file.name}...`);
                logQueue.add(`Processing file (unknown, type): ${file.name}...`);
            } else {
                logQueue.add(`Unsupported file type: ${file.type}. Supported file types: Excel (.xlsx, .xls), .ods, or .csv.`);
                logQueue.add(`Unsupported file type: ${file.type}. Supported file types: Excel (.xlsx, .xls), .ods, or .csv.`, undefined, 'error');
                ui.hideDownloadBtn();
                return;
            }
        
            // Parse the file
            try {
                const buffer = await file.arrayBuffer();
                const wb = read(buffer, {type: 'array'});
        
                let allQuestions : any[] = [];
                let totalRowsProcessed = 0;
        
                // Loop through each sheet in file
                for (const sheetName of wb.SheetNames) {
                    console.log(`Processing sheet: ${sheetName}`);
        
                    const sheet = wb.Sheets[sheetName]; // grab sheet
                    const rows = utils.sheet_to_json<Row>( // convert current sheet to JSON row objects
                        sheet, { raw: false }
                    );
                    totalRowsProcessed += rows.length;
        
                    const questionsFromSheet = rows.map(rowToQuestion).filter(question => question !== null);
        
                    allQuestions = allQuestions.concat(questionsFromSheet);
        
                    if (rows.length > 0) {
                        console.log(`Found ${rows.length} rows in sheet "${sheetName}", generated ${questionsFromSheet.length} questions.`);
                    }
                }
        
                // Check for no data
                if (totalRowsProcessed === 0) {
                    logQueue.add(`No data found in any sheets of ${file.name}. Make sure sheets have headers and content.`, undefined, 'error');
                    ui.hideDownloadBtn();
                    return;
                }
        
                // Check for valid questions
                if (allQuestions.length === 0 && totalRowsProcessed > 0) {
                    logQueue.add(`No valid questions could be generated from ${file.name}.`, undefined, 'error');
                    ui.hideDownloadBtn();
                    return;
                }
        
                // Build XML 
                const builder = new XMLBuilder({ 
                    ignoreAttributes: false, 
                    attributeNamePrefix: '@_', 
                    format: true, 
                    cdataPropName: '#cdata' 
                });
                xmlString  = builder.build({ quiz: { question: allQuestions }});
                
                logQueue.add(`Generated ${allQuestions.length} questions`, () => {
                    // Note if any rows were skipped/invalid
                    if (allQuestions.length < totalRowsProcessed) {
                        logQueue.add(`(${totalRowsProcessed - allQuestions.length} rows skipped or resulted in errors across all sheets).`);
                    }
                    // Show the download button 
                    ui.showDownloadBtn();
                }); // UI update    
        
            } catch(error) {
                console.error(`Error processing ${file.name}`, error);
                logQueue.add(`Error processing ${file.name} (${fileTypeDesc}). Open the console for more information.`);
            }
        });
        
        
        // -------- Drop zone functionality --------
        if ($dropZone && $file) {
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
                const files = (e.dataTransfer?.files || []);
                if (files.length > 0) {
                    // @ts-expect-error
                    $file.files = files;
                    $file.dispatchEvent(new Event('change')); // triggers the change event listener above (aka the file processing)
                }
            });
        
            $dropZone.addEventListener('click', () => {
                $file.click();
            })
        }
        
        
        // -------- Download button click functionality --------
        $btn.addEventListener('click', () => {
            const blob = new Blob([xmlString], { type: 'text/xml' }); // create blob 
            const url = URL.createObjectURL(blob); // temp blob url
        
            // Create hidden link that is auto clicked which downloads the file
            Object.assign(document.createElement('a'), {
                href: url,
                download: 'questions.xml'
            }).click();
        
            URL.revokeObjectURL(url); // revokes the temp blob url
        });
    }
})



