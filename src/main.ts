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
    // Build answers list
    const answers = ['A', 'B', 'C', 'D'].flatMap(label => {
        const text = (row as any)[`Option${label}`];
        if (!text) {
            return [];
        }
        return [{
            '@_fraction': row.Correct?.includes(label) ? '100' : '0',
            text
        }]
    });
    
    // Return a Moodle XML question object
    return {
        '@_type': 'multichoice',
        name: { text: row.Title },
        questiontext: { '@_format': 'html', text: { '#cdata': row.Question } },
        answer: answers
    };
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