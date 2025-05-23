// imports
import { read, utils } from 'xlsx';

// DOM declarations
const $file = document.querySelector('#file-input') as HTMLInputElement;
const $log = document.querySelector('#log') as HTMLElement;
const $btn = document.querySelector('#convert-btn') as HTMLButtonElement;

// XML container
let xmlString = "";

$file.addEventListener('change', async () => {
    const file = $file.files?.[0];
    if (!file) return; 

    $log.textContent = `Loading: ${file.name} ...`;
    const buffer = await file.arrayBuffer();
    $log.textContent = `Loaded`;
});