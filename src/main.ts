// imports
import { read, utils } from 'xlsx';

// DOM declarations
const $file = document.querySelector('#file-input') as HTMLInputElement;
const $log = document.querySelector('#log') as HTMLElement;
const $btn = document.querySelector('#convert-btn') as HTMLButtonElement;

// XML container
let xmlString = "";

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

    console.log(rows);
    
    $log.textContent = `Parsed ${rows.length} rows - see console`
});