export interface ReferenceItem {
  ref: string;
  peca: string;
}

export interface StopLabelData {
  ref: string;
  pecas: string;
  quantidade: string;
  data: string;
  responsavel: string;
  motivo: string;
  observacoes: string;
}

export const RESPONSAVEIS: string[] = [
  'SQF - Cláudio Seabra',
  'SQF - Ricardo Almeida',
  'SQF - Helga Correia',
  'SQF - Pedro Falcão',
  'SQF - Tarciana Félix',
  'SQF - Leandro Andrade',
  'SQF - Nuno Leal',
  'SQF - Patrício Pires',
  'SQF - Eduardo Silva',
  'SQF - David Valente',
  'SQF - Paulo Ferreira / Helder Silva',
];

export function formatTodayPt(): string {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  return `${dia}/${mes}/${ano}`;
}
