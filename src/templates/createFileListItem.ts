export default function createFileListItem(file: File, index: number): HTMLDivElement {
  const item = document.createElement('div');
  item.className = 'relative flex items-center px-3 py-2 gap-2 bg-white dark:bg-gray-700 rounded shadow';

  item.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-spreadsheet-icon lucide-file-spreadsheet"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>
    <span class="text-sm">${file.name}</span>
    <button data-i="${index}" class="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-rose-600 text-white text-[10px] rounded-full hover:bg-rose-700 cursor-pointer">
        x
    </button>
  `;

  return item;
}