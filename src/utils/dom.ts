/**
 * Shorthand helpers for safe querySelectors
 * 
 * i.e., return null if not found.
 * 
 */

export const safeQuerySelector = <T extends HTMLElement>(selector: string): T | null => document.querySelector(selector) as T | null;

export const safeQuerySelectorAll = <T extends HTMLElement>(selector: string): NodeListOf<T> => document.querySelectorAll(selector) as NodeListOf<T>;