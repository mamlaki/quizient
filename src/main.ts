// -------- Imports --------
// File processing
import { XMLBuilder } from 'fast-xml-parser';
import { read, utils } from 'xlsx';

// Web Components
import './components/SiteHeader';
import './components/SiteFooter';


// src/controllers
// Table of Contents Class
import TableOfContents from './controllers/TableOfContents';
// UI Controller Class
import UIController from './controllers/UIController';
import { Question } from './types/quiz';

// src/services
// LogQueue Class
import LogQueue from './services/LogQueue';

// src/theme
// ThemeManager Class
import ThemeManager from './theme/ThemeManager';

// src/utils - querySelectors
import { safeQuerySelector, safeQuerySelectorAll } from './utils/dom';


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


// ---------------- File Processor Class ----------------
class FileProcessor {
    private ui: UIController;
    private logQueue: LogQueue;
    private xmlString = ""; // Final XML output container
    private questions: Question[] = [];

    // File Limits
    private readonly MAX_FILE_SIZE_MB = 5;
    private readonly MAX_FILE_SIZE = this.MAX_FILE_SIZE_MB * 1024 * 1024;
    private readonly MAX_TOTAL_ROWS = 5000;

    // File types
    private readonly supportedFileTypes: Record<string, string> = {
        'text/csv': 'CSV',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
        'application/vnd.ms-excel': 'XLS',
        'application/vnd.oasis.opendocument.spreadsheet': 'ODS'
    };

    private readonly supportedExtensions = ['.csv', '.xlsx', '.xls', '.ods'];

    constructor(ui: UIController, logQueue: LogQueue) {
        this.ui = ui;
        this.logQueue = logQueue;
    }

    async processFiles(files: File[]): Promise<void> {
        this.clearAll();

        const allQuestions: Question[] = [];
        let totalRows = 0;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (file.size > this.MAX_FILE_SIZE) {
                this.logQueue.add(`${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)}MiB - max allowed is ${this.MAX_FILE_SIZE_MB} MiB`, undefined, 'error');
                continue;
            }
            
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
                if (totalRows > this.MAX_TOTAL_ROWS) {
                    this.logQueue.add(`Row limit exceeded (${this.MAX_TOTAL_ROWS}).`, undefined, 'error');
                    break;
                }

                allQuestions.push(...questions);
            } catch (error) {
                console.error(`Error processing ${file.name}: `, error);
                this.logQueue.add(`Error processing ${file.name} (${fileTypeInfo.description}). Open the console for more information.`);
            }
        }

        this.questions = allQuestions;
        this.generateXML({ questions: allQuestions, totalRows }, files.map(f => f.name).join(', '));
        return this.logQueue.getCompletionPromise();
    }

    getXMLString(): string {
        return this.xmlString;
    }

    public clearAll(): void {
        this.ui.clearLog();
        this.ui.hideLog();
        this.logQueue.clear();
        this.ui.hideDownloadBtn();
        this.ui.clearPreview();
        this.ui.hidePreview();
        this.xmlString = '';
        this.questions = [];
    }

    private validateFileType(file: File): { isValid: boolean; description?: string; errorMessage?: string } {
        const fileTypeDesc = this.supportedFileTypes[file.type];

        if (fileTypeDesc) {
            return { isValid: true, description: fileTypeDesc};
        }

        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (this.supportedExtensions.includes(ext)) {
            return { isValid: true, description: ext.toUpperCase().replace('.', '') };
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
            const sheet = wb.Sheets[sheetName];
            const rows = utils.sheet_to_json<Row>(sheet, { raw: false });
            totalRowsProcessed += rows.length;

            const questionsFromSheet = rows.map(row => this.rowToQuestion(row)).filter((question): question is Question => question !== null);

            allQuestions = allQuestions.concat(questionsFromSheet);
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
    const $btn = safeQuerySelector<HTMLButtonElement>('#download-btn');
    const $dropZone = safeQuerySelector<HTMLElement>('#drop-zone');
    const $downloadTemplateTriggers = safeQuerySelectorAll<HTMLElement>('.download-template');
    const $templateDropdown = safeQuerySelector<HTMLDivElement>('#template-dropdown');

    const selectedFiles: File[] = [];
    const $fileList = safeQuerySelector<HTMLElement>('#file-list');
    const $fileActions = safeQuerySelector<HTMLElement>('#file-actions');
    const $clearFilesBtn = safeQuerySelector<HTMLButtonElement>('#clear-files-btn');
    const $convertBtn = safeQuerySelector<HTMLButtonElement>('#convert-btn');

    new ThemeManager();

    const refreshFileList = () => {
        if (!$fileList || !$fileActions) return;

        $fileList.innerHTML = '';
        selectedFiles.forEach((file, i) => {
            const item = document.createElement('div');
            item.className = 'relative flex items-center px-3 py-2 gap-2 bg-white dark:bg-gray-700 rounded shadow';
            item.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-spreadsheet-icon lucide-file-spreadsheet"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>
                <span class="text-sm">${file.name}</span>
                <button data-i="${i}" class="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-rose-600 text-white text-[10px] rounded-full hover:bg-rose-700 cursor-pointer">
                    x
                </button>
            `;
            $fileList.appendChild(item);
        });

        const hasFiles = selectedFiles.length > 0;
        $fileList.classList.toggle('hidden', !hasFiles);
        $fileActions.classList.toggle('hidden', !hasFiles);
    }


    const addFiles = (files: FileList | File[]) => {
        Array.from(files).forEach(file => {
            if (!selectedFiles.some(sf => sf.name === file.name && sf.size === file.size)) selectedFiles.push(file);
        });
        refreshFileList();
    }

    const triggerTemplateDownload = (format: string) => {
        const fileName = `quizient_template.${format}`;
        const templateUrl = `${import.meta.env.BASE_URL}${fileName}`;
        Object.assign(document.createElement('a'), {
            href: templateUrl,
            download: fileName,
            rel: 'noopener noreferrer',
            referrerPolicy: 'no-referrer'
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


    if ($file && $dropZone && $btn && $convertBtn && $clearFilesBtn && $fileList) {
        // -------- When a user adds a file --------
        $file.addEventListener('change', () => {
            if ($file.files?.length) addFiles($file.files);
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
            if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
        });
    
        $dropZone.addEventListener('click', () => {
            $file.click();
        })
        
        $clearFilesBtn.addEventListener('click', () => {
            selectedFiles.length = 0;
            refreshFileList();
            fileProcessor.clearAll();
        });

        $fileList.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('button[data-i]');
            if (!btn) return;
            const i = Number(btn.getAttribute('data-i'));
            selectedFiles.splice(i, 1);
            refreshFileList();
        });

        // -------- Convert button --------
        $convertBtn?.addEventListener('click', () => {
            if (!selectedFiles.length) return;
            $convertBtn.disabled = true; 
            $convertBtn.textContent = 'Converting...';
            fileProcessor.processFiles([...selectedFiles]).then(() => {
                $convertBtn.disabled = false; 
                $convertBtn.textContent = 'Convert';
                ui.showDownloadBtn();
            });
        });

        // -------- Download button --------
        $btn.addEventListener('click', () => {
            const blob = new Blob([fileProcessor.getXMLString()], { type: 'text/xml' }); // create blob 
            const url = URL.createObjectURL(blob); // temp blob url
        
            // Create hidden link that is auto clicked which downloads the file}
            Object.assign(document.createElement('a'), {
                href: url,
                download: 'questions.xml',
                rel: 'noopener noreferrer',
                referrerPolicy: 'no-referrer'
            }).click();
        
            URL.revokeObjectURL(url); // revokes the temp blob url
        });
    }
})