// src/controllers/UIController/DownloadButton.ts
// ----------------------------------------------
// Manages the transition styles for the download button

import { safeQuerySelector } from "../../utils/dom";
import { TRANSITION_DURATION } from "../../constants";

export default class DownloadButton {
  private btn: HTMLButtonElement | null;
  
  constructor() {
    this.btn = safeQuerySelector<HTMLButtonElement>('#download-btn');
  }

  show(): void {
    if (!this.btn) return;
    this.btn.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.btn!.classList.remove('opacity-0');
      this.btn!.classList.add('opacity-100');
    });
  }

  hide(): void {
    if(!this.btn) return;
    this.btn.classList.remove('opacity-100');
    this.btn.classList.add('opacity-0')
    setTimeout(() => {
      this.btn!.classList.add('hidden');
    }, TRANSITION_DURATION);
  }
}