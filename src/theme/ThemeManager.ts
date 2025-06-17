// src/theme/ThemeManager.ts
// --------------------------
// Controls theme switching and localstorage

// Imports
import { safeQuerySelector } from "../utils/dom";
import { createElement, Sun, Moon, SunMoon } from "lucide";

export default class ThemeManager {
  private STORAGE_KEY = 'quizient-theme';
  private prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  private themeBtn!: HTMLButtonElement | null;
  private themeMenu!: HTMLUListElement | null;
  private themeIcon!: HTMLElement | null;

  constructor() {
      this.waitForHeader().then(() => {
          this.applyTheme(this.getSavedTheme() || 'auto');
          this.init();
      });
  }

  private waitForHeader(): Promise<void> {
      return new Promise(resolve => {
          const ready = () => {
              this.themeBtn = safeQuerySelector<HTMLButtonElement>('#theme-btn');
              this.themeMenu = safeQuerySelector<HTMLUListElement>('#theme-menu');
              this.themeIcon = safeQuerySelector<HTMLElement>('#theme-icon');
              if (this.themeBtn && this.themeMenu && this.themeIcon) {
                  resolve();
              } else {
                  requestAnimationFrame(ready);
              }
          };
          ready();
      });
  }

  private init() {
      if (!this.themeBtn || !this.themeMenu) return;

      this.themeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setMenuState(this.themeMenu!.dataset.state !== 'open');
      });

      document.addEventListener('click', () => this.setMenuState(false));

      this.themeMenu.addEventListener('click', (e) => {
          const li = (e.target as HTMLElement).closest('.theme-option') as HTMLLIElement | null;
          if (!li) return;
          const choice = li.dataset.theme as 'light' | 'dark' | 'auto';
          this.saveTheme(choice);
          this.applyTheme(choice);
          this.setMenuState(false);
      });

      this.prefersDark.addEventListener('change', () => {
          if (this.getSavedTheme() === 'auto') this.applyTheme('auto');
      });
  }

  private setMenuState(open: boolean) {
      if (!this.themeBtn || !this.themeMenu) return;
      this.themeMenu.dataset.state = open ? 'open' : 'closed';
      this.themeBtn.setAttribute('aria-expanded', String(open));
  }

  private saveTheme(theme: string) { localStorage.setItem(this.STORAGE_KEY, theme); }

  private getSavedTheme(): 'light' | 'dark' | 'auto' | null {
      const theme = localStorage.getItem(this.STORAGE_KEY);
      if (theme === 'light' || theme === 'dark' || theme === 'auto' || theme === null) {
          return theme;
      } 
      return null;
  }

  private applyTheme(mode: 'light' | 'dark' | 'auto') {
      const isDark = mode === 'dark' || (mode === 'auto' && this.prefersDark.matches);
      document.documentElement.classList.toggle('dark', isDark);
      this.setThemeIcon(mode);
  }

  private setThemeIcon(mode: 'light' | 'dark' | 'auto') {
      if (!this.themeIcon) return;
      this.themeIcon.innerHTML = '';
      const icon = mode === 'light' ? createElement(Sun, { size: 18 }) : mode === 'dark' ? createElement(Moon, { size: 18 }) : createElement(SunMoon, { size: 18 });
      this.themeIcon.appendChild(icon);
  }
}