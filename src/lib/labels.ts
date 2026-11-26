import type { PaymentMethod } from '@/types';

/** Ordem das formas de pagamento (os nomes traduzidos ficam em i18n/labels.ts). */
export const PAYMENT_ORDER: PaymentMethod[] = ['credito', 'pix', 'debito', 'dinheiro', 'boleto'];
