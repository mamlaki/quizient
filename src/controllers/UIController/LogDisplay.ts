// src/controllers/UIController/LogDisplay.ts
// ------------------------------------------
// Responsible for rendering the log and log entries

import { safeQuerySelector } from "../../utils/dom";
import { createElement, LoaderCircle } from "lucide";
import { FADE_IN_DELAY } from "../../constants";

export type LogType = 'info' | 'error';

export default class LogDisplay {
  private container: HTMLElement | null;

  constructor() {
    this.container = safeQuerySelector<HTMLElement>('#log');
  }

  show(): void {
    this.container?.classList.remove('hidden');
  }

  hide(): void {
    this.container?.classList.add('hidden');
  }

  clear(): void {
    if (this.container) this.container.innerHTML = '';
  }

  append(message: string): HTMLDivElement | null {
    if (!this.container) return null;

    this.show();
    const entry = document.createElement('div');
    entry.className = 'log-entry flex flex-row-reverse justify-end items-center gap-2 opacity-0 transition-opacity duration-500 mb-2';

    setTimeout(() => {
        entry.classList.add('opacity-100');
    }, FADE_IN_DELAY);

    const loadingIcon = createElement(LoaderCircle, { size: 18, class: 'log-loading-icon' });
    loadingIcon.classList.add('animate-spin', 'text-sky-400');

    const logText = document.createElement('span');
    logText.textContent = message;

    entry.appendChild(loadingIcon);
    entry.append(logText);
    this.container.appendChild(entry);

    return entry;
  }
}