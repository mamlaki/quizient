// src/controllers/UIController/PreviewPane.ts
// -------------------------------------------
// Responsible for rendering the preview pane/area/section

// Imports
// utils & constants
import { safeQuerySelector } from "../../utils/dom";
import { TRANSITION_DURATION } from "../../constants";
// Third-party
import DOMPurify from 'dompurify';

// Types
import type { Question } from "../../types/quiz";

export default class PreviewPane {
  private container: HTMLElement | null;
  private root: HTMLElement | null;

  constructor() {
    this.container = safeQuerySelector<HTMLElement>('#preview-container');
    this.root = safeQuerySelector<HTMLElement>('#preview');
  }

  show(): void {
    if (!this.container) return;

    this.container.classList.remove('hidden');
    requestAnimationFrame(() => {
        this.container?.classList.remove('opacity-0');
        this.container?.classList.add('opacity-100');
    });
  }

  hide(): void {
    if (!this.container) return;
      this.container.classList.remove('opacity-100');
      this.container.classList.add('opacity-0');
      setTimeout(() => {
          this.container?.classList.add('hidden');
      }, TRANSITION_DURATION);
      this.container?.classList.add('hidden');
  }

  clear(): void {
    if (this.root) this.root.innerHTML = '';
  }

  render(questions: Question[]): HTMLDivElement[] {
    if (!this.root) return [];
    this.clear();
    if (questions.length === 0) {
      this.hide();
      return[];
    }

    this.show();

    const cards: HTMLDivElement[] = questions.map((question, index) => this.createCard(question, index));
    cards.forEach((card) => this.root!.appendChild(card));
    return cards;
  }

  private createCard(question: Question, index: number): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';

    const title = document.createElement('h4');
    title.className = 'font-bold text-gray-800 dark:text-gray-100';
    title.textContent = `Q${index + 1}: ${question.name.text}`;

    const typeBadge = document.createElement('span');
    typeBadge.className = 'text-xs font-semibold uppercase px-2 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300';
    typeBadge.textContent = question['@_type'];

    header.appendChild(title);
    header.appendChild(typeBadge);

    // Questions
    const card = document.createElement('div');
    card.className = 'question-preview-item mb-4 p-4 rounded-md bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ease-in-out';

    const questionText = document.createElement('p');
    questionText.className = 'mb-3 text-gray-700 dark:text-gray-300';
    // DOMPurify to sanitize 
    questionText.innerText = DOMPurify.sanitize(
        question.questiontext.text['#cdata'], { ALLOWED_URI_REGEXP: /^(?!javascript:)/i }
    );


    // Answers
    const answersWrapper = document.createElement('div');
    answersWrapper.className = 'answers-preview pt-3';

    const answersHeader = document.createElement('h5');
    answersHeader.className = 'text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2';
    answersHeader.textContent = 'Answers';
    answersWrapper.appendChild(answersHeader);

    const answerList = this.createAnswerList(question);
    answersWrapper.appendChild(answerList);


    card.appendChild(header);
    card.appendChild(questionText);
    card.append(answersWrapper);

    return card;
  }

  private createAnswerList(question: Question): HTMLUListElement {
    const list = document.createElement('ul');
    const isMultichoice = question['@_type'] === 'multichoice';
    const isTrueFalse = question['@_type'] === 'truefalse';

    list.className = `${isMultichoice ? 'list-none' : 'list-disc'} pl-5 space-y-1 text-gray-600 dark:text-gray-400`;

    question.answer.forEach((ans, index) => {
        const listItem = document.createElement('li');
        const isCorrect = ans['@_fraction'] === '100';
        let text = ans.text;

        if (isCorrect) {
            if (isTrueFalse) {
                text = text.toUpperCase();
                listItem.className = `${text === 'TRUE' ? 'text-green-700 font-semibold' : 'text-rose-700 font-semibold'}`;
            } else {
                listItem.className = 'text-green-700 font-semibold';
            }
        }
        
        if (isMultichoice) {
            const prefix = String.fromCharCode(65 + index);
            text = `${prefix}. ${text}`;
        }

        listItem.textContent = text;
        list.appendChild(listItem);
    });

    return list;
  }

  // Getters
  getCards(): HTMLDivElement[] { 
    return Array.from(this.root?.querySelectorAll<HTMLDivElement>('.question-preview-item') || []);
  }

  getRoot(): HTMLElement | null { return this.root; }
}