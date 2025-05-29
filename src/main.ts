// -------- Imports --------
// File processing
import { XMLBuilder } from 'fast-xml-parser';
import { read, utils } from 'xlsx';
// UI/UX
import { createElement, CircleCheck, CircleX, LoaderCircle } from 'lucide';

// Web Components
import './components/SiteHeader';
import './components/SiteFooter';

// DOM Declarations
const $file = document.querySelector('#file-input') as HTMLInputElement;
const $log = document.querySelector('#log') as HTMLElement;
const $btn = document.querySelector('#convert-btn') as HTMLButtonElement;
const $dropZone = document.querySelector('#drop-zone') as HTMLElement;

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

// -------- Download button helper functions --------
const showDownloadBtn = () => {
    if ($btn) {
        $btn.classList.remove('hidden');
        requestAnimationFrame(() => {
            $btn.classList.remove('opacity-0');
            $btn.classList.add('opacity-100');
        });
    }
}

const hideDownloadBtn = () => {
    if ($btn) {
        $btn.classList.remove('opacity-100');
        $btn.classList.add('opacity-0');
        setTimeout(() => {
            $btn.classList.add('hidden');
        }, 300);
    }
}

// -------- Log helper functions --------
const showLog = () => {
    if ($log) {
        $log.classList.remove('hidden');
    }
}

const clearLog = () =>  {
    if ($log) {
        $log.innerHTML = '';
    }
}

const appendLog = (message: string) => {
    if (!$log) return null;
    showLog();
    const entry = document.createElement('div');
    entry.className = 'log-entry flex flex-row-reverse justify-end items-center gap-2 opacity-0 transition-opacity duration-500 mb-2';
    setTimeout(() => {
        entry.classList.add('opacity-100');
    }, 10);
    // Loading
    const loadingIcon = createElement(LoaderCircle, { size: 18, class: 'log-loading-icon' });
    loadingIcon.classList.add('animate-spin', 'text-sky-400');

    entry.appendChild(loadingIcon);

    // Log text
    const text = document.createElement('span');
    text.textContent = message;
    entry.appendChild(text);

    $log.appendChild(entry);
    return entry;
}
// Smoother log output (especially for smaller files)
let logQueue: { message: string; callback?: () => void; logType?: 'info' | 'error' }[] = [];
let isProcessingLog = false

function processLogQueue() {
    if (isProcessingLog || logQueue.length === 0) return;

    isProcessingLog = true;
    const { message, callback, logType } = logQueue.shift()!;
    const entry = appendLog(message);

    if (!entry) {
        isProcessingLog = false;
        if (callback) callback();
        processLogQueue();
        return;
    }

    setTimeout(() => {
        const loadingIcon = entry.querySelector('.log-loading-icon');
        if (loadingIcon) {
            if (logType === 'error') {
                const errorIcon = createElement(CircleX, { size: 18, class: 'log-icon-updated' })
                errorIcon.classList.add('text-rose-600');
                loadingIcon.replaceWith(errorIcon);
                console.log('error');
            } else {
                const check = createElement(CircleCheck, { size: 18, class: 'log-icon-updated' });
                check.classList.add('text-green-600');
                loadingIcon.replaceWith(check);
                console.log('check');
            }
        }
        isProcessingLog = false;
        if (callback) callback();
        processLogQueue();
    }, 400);
}

const queueLog = (message: string, callback?: () => void, logType: 'info' | 'error' = 'info') => {
    if (!$log) {
        if (callback) callback();
        return;
    }
    logQueue.push({ message, callback, logType });
    processLogQueue();
}

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


// -------- When a user adds a file --------
if ($file && $dropZone && $btn && $log) {
    $file.addEventListener('change', async () => {
        // Reset UI elements
        clearLog();
        logQueue = [];
        isProcessingLog = false;
    
        hideDownloadBtn();
    
        // Grab the first file (if multiple files were uploaded and if it exists)
        const file = $file.files?.[0];
        if (!file) return; 
        
        queueLog(`Loading: ${file.name} ...`); // UI update
        
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
            queueLog(`Processing ${fileTypeDesc} file: ${file.name}...`);
        } else if (file.type === '' || file.type === 'application/octet-stream') {
            fileTypeDesc = 'Unknown';
            console.log(`Processing file (unknown, type): ${file.name}...`);
            queueLog(`Processing file (unknown, type): ${file.name}...`);
        } else {
            console.log(`Unsupported file type: ${file.type}. Supported file types: Excel (.xlsx, .xls), .ods, or .csv.`);
            queueLog(`Unsupported file type: ${file.type}. Supported file types: Excel (.xlsx, .xls), .ods, or .csv.`, undefined, 'error');
            hideDownloadBtn();
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
                queueLog(`No data found in any sheets of ${file.name}. Make sure sheets have headers and content.`, undefined, 'error');
                hideDownloadBtn();
                return;
            }
    
            // Check for valid questions
            if (allQuestions.length === 0 && totalRowsProcessed > 0) {
                queueLog(`No valid questions could be generated from ${file.name}.`, undefined, 'error');
                hideDownloadBtn();
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
            
            queueLog(`Generated ${allQuestions.length} questions`, () => {
                // Note if any rows were skipped/invalid
                if (allQuestions.length < totalRowsProcessed) {
                    queueLog(`(${totalRowsProcessed - allQuestions.length} rows skipped or resulted in errors across all sheets).`);
                }
                // Show the download button 
                showDownloadBtn();
            }); // UI update    
    
        } catch(error) {
            console.error(`Error processing ${file.name}`, error);
            queueLog(`Error processing ${file.name} (${fileTypeDesc}). Open the console for more information.`);
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
