// Quiz/question related types
export type Question = {
  '@_type': 'multichoice' | 'truefalse' | 'shortanswer';
  name: { text: string };
  questiontext: {
      '@_format': 'html';
      text: {
          '#cdata': string;
      };
  };
  answer: any[];
  usecase?: number;
}

export type Row = {
  Type: string;
  Title: string;
  Question: string;
  OptionA?: string;
  OptionB?: string;
  OptionC?: string;
  OptionD?: string;
  Correct?: string;
  UseCase?: string;
};
