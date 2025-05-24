// Imports
import { XMLBuilder } from 'fast-xml-parser';
import { read, utils } from 'xlsx';

// DOM Declarations
const $file = document.querySelector('#file-input') as HTMLInputElement;
const $log = document.querySelector('#log') as HTMLElement;
const $btn = document.querySelector('#convert-btn') as HTMLButtonElement;

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

// Create Moodle XML question object from a row 
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
        }
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
        }
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

// When a user adds a file
$file.addEventListener('change', async () => {
    // Grab the first file (if multiple files were uploaded and if it exists)
    const file = $file.files?.[0];
    if (!file) return; 
    
    $log.textContent = `Loading: ${file.name} ...`; // UI update
    
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
        $log.textContent = `Processing ${fileTypeDesc} file: ${file.name}...`;
    } else if (file.type === '' || file.type === 'application/octet-stream') {
        fileTypeDesc = 'Unknown';
        console.log(`Processing file (unknown, type): ${file.name}...`);
        $log.textContent = `Processing file (unknown, type): ${file.name}...`;
    } else {
        console.log(`Unsupported file type: ${file.type}. Supported file types: Excel (.xlsx, .xls), .ods, or .csv.`);
        $log.textContent = `Unsupported file type: ${file.type}. Supported file types: Excel (.xlsx, .xls), .ods, or .csv.`;
        $btn.classList.add('hidden');
        $btn.classList.remove('block');
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
            $log.textContent = `No data found in any sheets of ${file.name}. Make sure sheets have headers and content.`;
            $btn.classList.add('hidden');
            $btn.classList.remove('block');
            return;
        }

        // Check for valid questions
        if (allQuestions.length === 0 && totalRowsProcessed > 0) {
            $log.textContent = `No valid questions could be generated from ${file.name}.`;
            $btn.classList.add('hidden');
            $btn.classList.remove('block');
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
        
        $log.textContent = `Generated ${allQuestions.length} questions`; // UI update

        // Note if any rows were skipped/invalid
        if (allQuestions.length < totalRowsProcessed) {
            $log.textContent += ` (${totalRowsProcessed - allQuestions.length} rows skipped or resulted in errors across all sheets).`;
        }

        // Show the download button
        $btn.classList.remove('hidden'); 
        $btn.classList.add('block');
    } catch(error) {
        console.error(`Error processing ${file.name}`, error);
        $log.textContent = `Error processing ${file.name} (${fileTypeDesc}). Open the console for more information.`;
        $btn.classList.add('hidden');
        $btn.classList.remove('block');
    }
});

// Download button click functionality
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