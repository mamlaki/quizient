// -------- Imports --------
// File processing
// src/services/FileProcessor.ts
import FileProcessor, { addTypedListener as onFP} from './services/FileProcessor';

// Web Components
import './components/SiteHeader';
import './components/SiteFooter';

// src/controllers
// Table of Contents Class
import TableOfContents from './controllers/TableOfContents';
// UI Controller Class
import UIController from './controllers/UIController';

// src/services
// LogQueue Class
import LogQueue from './services/LogQueue';

// src/templates
import createFileListItem from './templates/createFileListItem';

// src/theme
// ThemeManager Class
import ThemeManager from './theme/ThemeManager';

// src/utils - querySelectors
import { safeQuerySelector, safeQuerySelectorAll } from './utils/dom';

// ---------------- Main App Init ----------------
document.addEventListener('DOMContentLoaded', () => {
    // Initialize ccomponents using classes
    const toc = new TableOfContents(); // Table of Contents class instance
    toc.init();
    const ui = new UIController(); // UI Controller class instance
    const logQueue = new LogQueue(ui); // Log queue class instance
    const fileProcessor = new FileProcessor();
    let xmlCache = '';

    onFP(fileProcessor, 'progress', e => logQueue.add(e.detail.msg));
    onFP(fileProcessor, 'error', e => logQueue.add(e.detail.msg, undefined, 'error'));
    onFP(fileProcessor, 'done', e => {
        const count = e.detail.questions.length;

        if (count > 0) {
            logQueue.add(`Generated ${e.detail.questions.length} questions`, () => {
                ui.renderPreview(e.detail.questions);
                ui.showDownloadBtn();
            });
            xmlCache = e.detail.xml;           
        } else {
            logQueue.add('No valid questions were genereted.', undefined, 'error');
            ui.hideDownloadBtn();
            ui.clearPreview();
            ui.hidePreview();
            xmlCache = '';
        }
    });

    // DOM declarations
    const $file = safeQuerySelector<HTMLInputElement>('#file-input');
    const $btn = safeQuerySelector<HTMLButtonElement>('#download-btn');
    const $dropZone = safeQuerySelector<HTMLElement>('#drop-zone');
    const $downloadTemplateTriggers = safeQuerySelectorAll<HTMLElement>('.download-template');
    const $templateDropdown = safeQuerySelector<HTMLDivElement>('#template-dropdown');

    const selectedFiles: File[] = [];
    let hasConverted = false;
    const $fileList = safeQuerySelector<HTMLElement>('#file-list');
    const $fileActions = safeQuerySelector<HTMLElement>('#file-actions');
    const $clearFilesBtn = safeQuerySelector<HTMLButtonElement>('#clear-files-btn');
    const $convertBtn = safeQuerySelector<HTMLButtonElement>('#convert-btn');

    new ThemeManager();


    const clearAppState = () => {
        ui.clearLog();
        ui.hideLog();
        ui.hideDownloadBtn();
        ui.clearPreview();
        ui.hidePreview();
    }

    const refreshFileList = () => {
        if (!$fileList || !$fileActions) return;

        $fileList.innerHTML = '';
        selectedFiles.forEach((file, i) => {
            $fileList.appendChild(createFileListItem(file, i));
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
            clearAppState();
            hasConverted = false;
        });

        $fileList.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('button[data-i]');
            if (!btn) return;
            const i = Number(btn.getAttribute('data-i'));
            selectedFiles.splice(i, 1);
            refreshFileList();

            if (selectedFiles.length === 0 && hasConverted) {
                clearAppState();
                hasConverted = false;
            }
        });

        // -------- Convert button --------
        $convertBtn?.addEventListener('click', () => {
            if (!selectedFiles.length) return;
            hasConverted = true;
            $convertBtn.disabled = true; 
            $convertBtn.textContent = 'Converting...';
            fileProcessor.processFiles([...selectedFiles]).then(() => {
                $convertBtn.disabled = false; 
                $convertBtn.textContent = 'Convert';
            });
        });

        // -------- Download button --------
        $btn.addEventListener('click', () => {
            const blob = new Blob([xmlCache], { type: 'text/xml' }); // create blob 
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