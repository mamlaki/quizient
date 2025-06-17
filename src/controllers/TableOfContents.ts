/**
 * src/controllers/TableOfContents.ts
 * ----------------------------------
 * Controller that manages the responsive Table of Contents used on the About, Support, and Privacy pages
 * 
 * Handles opening/closing the mobile slide-in menu, 
 * menu-item clicks, and style changes
 * 
 */

import { safeQuerySelector, safeQuerySelectorAll } from "../utils/dom";
import { TRANSITION_DURATION, TAILWIND_LG_BREAKPOINT } from "../constants";

export default class TableOfContents {
  private tocToggle: HTMLButtonElement | null;
  private tocClose: HTMLButtonElement | null;
  private pageNav: HTMLElement | null;
  private tocLinks: NodeListOf<HTMLAnchorElement>;

  constructor() {
      this.tocToggle = safeQuerySelector<HTMLButtonElement>('#toc-toggle');
      this.tocClose = safeQuerySelector<HTMLButtonElement>('#toc-close');
      this.pageNav = safeQuerySelector<HTMLElement>('#page-nav');
      this.tocLinks = safeQuerySelectorAll<HTMLAnchorElement>('.toc-link');
  }

  init(): void {
      if (!this.pageNav || !this.tocToggle || !this.tocClose) return;
      this.setupEventListeners();
  }

  private setupEventListeners(): void {
      if (!this.tocToggle || !this.tocClose) return;
      this.tocToggle.addEventListener('click', this.handleToggleClick.bind(this));
      this.tocClose.addEventListener('click', this.closeToc.bind(this));

      this.tocLinks.forEach(link => {
          link.addEventListener('click', this.handleLinkClick.bind(this));
      });
  }

  private handleToggleClick(e: Event): void {
      e.stopPropagation();
      if (this.pageNav?.classList.contains('-translate-x-full')) {
          this.openToc();
      } else {
          this.closeToc();
      }
  }

  private handleLinkClick(): void {
      if (window.innerWidth < TAILWIND_LG_BREAKPOINT) {
          this.closeToc();
      }
  }

  private openToc(): void {
      if (!this.pageNav || !this.tocToggle) return;

      this.pageNav.classList.remove('-translate-x-full');
      this.pageNav.classList.add('translate-x-0');
      this.tocToggle.setAttribute('aria-expanded', 'true');

      this.showOverlay();
      document.body.style.overflow = 'hidden';
  }

  private closeToc(): void {
      if (!this.pageNav || !this.tocToggle) return;

      this.pageNav.classList.add('-translate-x-full');
      this.pageNav.classList.remove('translate-x-0');
      this.tocToggle.setAttribute('aria-expanded', 'false');

      this.hideOverlay();
      document.body.style.overflow = '';
  }

  private showOverlay(): void {
      let overlay = safeQuerySelector<HTMLDivElement>('#toc-overlay');

      if (!overlay) {
          overlay = this.createOverlay();
      }

      overlay!.classList.remove('hidden');
      requestAnimationFrame(() => {
          overlay!.classList.remove('opacity-0');
          overlay!.classList.add('opacity-50');
      });
  }

  private hideOverlay(): void {
      const overlay = safeQuerySelector<HTMLDivElement>('#toc-overlay');
      if (!overlay) return;

      overlay.classList.remove('opacity-50');
      overlay.classList.add('opacity-0');

      setTimeout(() => {
          overlay.classList.add('hidden');
      }, TRANSITION_DURATION);
  }

  private createOverlay(): HTMLDivElement {
      const overlay = document.createElement('div');
      overlay.id = 'toc-overlay';
      overlay.className = 'fixed inset-0 z-30 bg-black opacity-0 transition-opacity duration-300 lg:hidden';
      overlay.addEventListener('click', this.closeToc.bind(this));
      document.body.appendChild(overlay);
      return overlay;
  }
}