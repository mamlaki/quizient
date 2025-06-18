// src/services/FileProcessor.ts
// -----------------------------
// Handles file processing (spreadsheet to Moodle-compatible XML)

// Imports
import { XMLBuilder } from "fast-xml-parser";
import { read, utils } from "xlsx";

// Types
import type { Question, Row } from "../types/quiz";
type FileProcEventMap = {
  progress: CustomEvent<FileProcProgress>;
  error: CustomEvent<FileProcError>;
  done: CustomEvent<FileProcDone>;
}

// Interfaces
export interface FileProcProgress { msg: string }
export interface FileProcError { msg: string }
export interface FileProcDone { xml: string; questions: Question[] }


// utils
export function addTypedListener<K extends keyof FileProcEventMap>(
  target: EventTarget,
  type: K,
  listener: (ev: FileProcEventMap[K]) => void
) {
  target.addEventListener(type, listener as EventListener);
}


export default class FileProcessor extends EventTarget {
    // File Limits
    private readonly MAX_FILE_SIZE_MB = 5;
    private readonly MAX_FILE_SIZE = this.MAX_FILE_SIZE_MB * 1024 * 1024;
    private readonly MAX_TOTAL_ROWS = 5000;

    // File types
    private readonly supportedFileTypes: Record<string, string> = {
        'text/csv': 'CSV',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
        'application/vnd.ms-excel': 'XLS',
        'application/vnd.oasis.opendocument.spreadsheet': 'ODS'
    };

    private readonly supportedExtensions = ['.csv', '.xlsx', '.xls', '.ods'];

    private xmlString = ""; // Final XML output container

    // Helper
    on = addTypedListener;

    // --- PROCESS FILES ---
    async processFiles(files: File[]): Promise<void> {
      const allQuestions: Question[] = [];
      let totalRows = 0;
      
      for (let i = 0; i < files.length; i++) {
          const file = files[i];

          if (file.size > this.MAX_FILE_SIZE) {
              this.emit('error', { msg: `${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)}MiB - max allowed is ${this.MAX_FILE_SIZE_MB} MiB` });
              continue;
          }
          
          this.emit('progress', { msg: `Loading (${i + 1}/${files.length}): ${file.name}` });
          
          const fileTypeInfo = this.validateFileType(file);
          if (!fileTypeInfo.isValid) {
              this.emit('error', { msg: fileTypeInfo.errorMessage! } );
              continue;
          }

          this.emit('progress', { msg: `Processing ${fileTypeInfo.description} file: ${file.name}...` });

          try {
              const { questions, totalRows: rows } = await this.parseFile(file);
              totalRows += rows;
              if (totalRows > this.MAX_TOTAL_ROWS) {
                  this.emit('error', { msg: `Row limit exceeded (${this.MAX_TOTAL_ROWS}).` });
                  break;
              }

              allQuestions.push(...questions);
          } catch (error) {
              console.error(`Error processing ${file.name} `, error);
              this.emit('error', { msg: `Error processing ${file.name} (${fileTypeInfo.description}). Open the console for more information.` });
          }
      }

      this.xmlString = this.buildXML(allQuestions);
      this.emit('done', { xml: this.xmlString, questions: allQuestions });
  }

  // Helpers
  private emit<K extends keyof FileProcEventMap>(type: K, detail: FileProcEventMap[K]['detail']):void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  private validateFileType(file: File): { isValid: boolean; description?: string; errorMessage?: string } {
    const fileTypeDesc = this.supportedFileTypes[file.type];

    if (fileTypeDesc) {
        return { isValid: true, description: fileTypeDesc};
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (this.supportedExtensions.includes(ext)) {
        return { isValid: true, description: ext.toUpperCase().replace('.', '') };
    }

    return {
        isValid: false,
        errorMessage: `Unsupported file type: ${file.type}. Supported file types: Excel (.xlsx, .xls), .ods, or .csv.`
    };
  }

  private async parseFile(file: File): Promise<{ questions: any[]; totalRows: number }> {
    const buffer = await file.arrayBuffer();
    const wb = read(buffer, { type: 'array' });

    let allQuestions: Question[] = [];
    let totalRowsProcessed = 0;

    for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const rows = utils.sheet_to_json<Row>(sheet, { raw: false });
        totalRowsProcessed += rows.length;

        const questionsFromSheet = rows.map(row => this.rowToQuestion(row)).filter((question): question is Question => question !== null);

        allQuestions = allQuestions.concat(questionsFromSheet);
    }

    return { questions: allQuestions, totalRows: totalRowsProcessed };
  }

  private rowToQuestion(row: Row) {
    const sharedElements = {
        name: { text: row.Title },
        questiontext: { '@_format': 'html', text: { '#cdata': row.Question } }
    };

    const questionType = row.Type?.toLowerCase(); // what is the question type/does it exist?

    if (questionType === 'truefalse') { // True/false question type
        const isCorrectTrue = row.Correct?.toLowerCase() === 'true';
        return {
            ...sharedElements,
            '@_type': 'truefalse',
            answer: [
                {
                    '@_fraction': isCorrectTrue? '100' : '0',
                    '@_format': 'moodle_auto_format',
                    text: 'true'
                },
                {
                    '@_fraction': !isCorrectTrue? '100' : '0',
                    '@_format': 'moodle_auto_format',
                    text: 'false'
                }
            ]
        };
    } else if (questionType === 'shortanswer') {
         // Short answer question type
        const useCase = row.UseCase === '1' ? 1 : 0;
        // Allow several correct answers
        const altKeys = Object.keys(row).filter(key => /^Correct\d+$/.test(key)); 
        const alternativeAnswers = altKeys.map(key => (row as any)[key]?.trim()).filter(val => val);

        const answers = alternativeAnswers.map(answer => ({
            '@_fraction': '100',
            '@_format': 'moodle_auto_format',
            text: answer
        }));

        return {
            ...sharedElements,
            '@_type': 'shortanswer',
            usecase: useCase,
            answer: answers
        };
    } else {
        // Default to multiplechoice 
        // Build answers list
        const answers = ['A', 'B', 'C', 'D'].flatMap(label => {
            const text = (row as any)[`Option${label}`];
            if (!text) {
                return [];
            }
            return [{
                '@_fraction': row.Correct?.toUpperCase().includes(label) ? '100' : '0',
                text
            }]
        });
        
        // Return a Moodle XML question object
        return {
            ...sharedElements,
            '@_type': 'multichoice',
            answer: answers
        };
    }
  }

  private buildXML(questions: Question[]): string {
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      cdataPropName: '#cdata'
    });
    return builder.build({ quiz: { question: questions} });
  }
}
