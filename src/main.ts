// imports
import { read, utils } from 'xlsx';

// DOM declarations
const $file = document.querySelector('#file-input') as HTMLInputElement;
const $log = document.querySelector('#log') as HTMLElement;
const $btn = document.querySelector('#convert-btn') as HTMLButtonElement;

// XML container
let xmlString = "";

// row type declaration
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

function rowToQuestion(row: Row) {
    return {
        '@_type:': 'description',
        name: { text: row.Title || 'Untitled' },
        questiontext: { '@_format': 'html', text: `<![CDATA${row.Question}]]` }
    }
}

$file.addEventListener('change', async () => {
    // grab file
    const file = $file.files?.[0];
    if (!file) return; 
    
    $log.textContent = `Loading: ${file.name} ...`;
    
    // parse loaded file 
    const buffer = await file.arrayBuffer();
    const wb = read(buffer, {type: 'array'});
    const sheet = wb.Sheets[wb.SheetNames[0]]; // grab the first sheet
    const rows = utils.sheet_to_json<Record<string, string>>( // converting to JSON
        sheet, { raw: false }
    );

    console.table(rows);
    
    $log.textContent = `Parsed ${rows.length} rows - see console`
});