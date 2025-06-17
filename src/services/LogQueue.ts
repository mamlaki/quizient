// src/services/LogQueue.ts
// ------------------------
// Service for managing the log queue

// Third-Party imports
import { createElement, CircleCheck, CircleX } from "lucide";

// Constants
import { LOG_QUEUE_DELAY } from "../constants";

// Types
export type LogEntry = {
  message: string;
  callback?: () => void;
  logType?: 'info' | 'error';
}

export interface ILogUI {
  appendLog(message: string): HTMLDivElement | null;
}


export default class LogQueue {
  private queue: LogEntry[] = [];
  private isProcessing = false;
  private ui: ILogUI;
  private completionPromise: Promise<void> | null = null;
  private completionResolve: (() => void) | null = null;

  constructor(ui: ILogUI) {
      this.ui = ui;
  }

  add(message: string, callback?: () => void, logType: 'info' | 'error' = 'info'): void {
      this.queue.push({ message, callback, logType });
      this.process();
  }

  clear(): void {
      this.queue = [];
      this.isProcessing = false;
      if (this.completionResolve) {
          this.completionResolve();
          this.completionPromise = null;
          this.completionResolve = null;
      }
  }

  private process(): void {
      if (this.isProcessing) return;

      if (this.queue.length === 0) {
          this.isProcessing = false;
          if (this.completionResolve) {
              this.completionResolve();
              this.completionPromise = null;
              this.completionResolve = null;
          }
          return;
      }
      

      this.isProcessing = true;
      const { message, callback, logType = 'info' } = this.queue.shift()!;
      const entry = this.ui.appendLog(message);

      if (!entry) {
          this.isProcessing = false;
          callback?.();
          this.process();
          return;
      }

      setTimeout(() => {
          this.updateLogIcon(entry, logType);
          this.isProcessing = false;
          callback?.();
          this.process();
      }, LOG_QUEUE_DELAY);
  }

  private updateLogIcon(entry: HTMLDivElement, logType: 'info' | 'error'): void {
      const loadingIcon = entry.querySelector('.log-loading-icon');
      if (!loadingIcon) return;

      const icon = logType === 'error'
          ? createElement(CircleX, { size: 18, class: 'log-icon-updated text-rose-600' })
          : createElement(CircleCheck, { size: 18, class: 'log-icon-updated text-green-600' });

      loadingIcon.replaceWith(icon);
  }

  getCompletionPromise(): Promise<void> {
      if (!this.isProcessing && this.queue.length === 0) {
          return Promise.resolve();
      }

      if (!this.completionPromise) {
          this.completionPromise = new Promise(resolve => {
              this.completionResolve = resolve;
          });
      }

      return this.completionPromise;
  }
}