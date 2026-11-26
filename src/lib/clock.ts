import { dateToISO } from '@/lib/dates';
import type { ISODate } from '@/types';

/**
 * "Hoje" do app. Por padrão é a data real do aparelho.
 *
 * Para depurar/gerar capturas com uma data fixa, troque `FIXED_TODAY` por uma
 * data ('YYYY-MM-DD').
 */
const FIXED_TODAY: ISODate | null = null;

export const todayISO = (): ISODate => FIXED_TODAY ?? dateToISO(new Date());
