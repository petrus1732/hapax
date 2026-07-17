import type { BonusOrNull } from './wordblitz';

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type Board = {
  id: string;
  author: string;
  boardName: string;
  size: number;
  letters: string;
  date: string;
  theme?: string;
  subtheme?: string;
  bonuses?: BonusOrNull[] | string | null;
  sourceMode?: string | null;
  source_mode?: string | null;
  abundance?: string | null;
  trainingSeedWord?: string | null;
  training_seed_word?: string | null;
};
