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
};

// Create Moodle XML question object from a row 
function rowToQuestion(row: Row) {
    // Shared between multiplechoice and truefalse questions
    const sharedElements = {
        name: { text: row.Title },
        questiontext: { '@_format': 'html', text: { '#cdata': row.Question } },
    };

    if (row.Type && row.Type.toLowerCase() === 'truefalse') {
        const isCorrectTrue = row.Correct?.toLowerCase() === 'true';

        return {
            ...sharedElements,
            '@_type': 'truefalse',
            answer: [
                {
                    '@_fraction': isCorrectTrue? '100' : '0',
                    '@_format': 'moodle_auto_format',
                    text: 'true',
                    feedback: { '@_format': 'html', text: '' }
                },
                {
                    '@_fraction': !isCorrectTrue? '100' : '0',
                    '@_format': 'moodle_auto_format',
                    text: 'false',
                    feedback: { '@_format': 'html', text: '' }
                }
            ]
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
        const sheet = wb.Sheets[wb.SheetNames[0]]; // grab the first sheet
        const rows = utils.sheet_to_json<Row>( // converting to JSON row objects
            sheet, { raw: false }
        );
    
        const questions = rows.map(rowToQuestion);  // use rowToQuestions() on each of the converted rows
    
        // Build XML
        const builder = new XMLBuilder({ 
            ignoreAttributes: false, 
            attributeNamePrefix: '@_', 
            format: true, 
            cdataPropName: '#cdata' 
        });
        xmlString  = builder.build({ quiz: { question: questions }});
    
        console.table(rows);
        
        $log.textContent = `Generated ${questions.length} questions`; // UI update
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