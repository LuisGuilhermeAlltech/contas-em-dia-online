export type ContaStatusNormalizado = 'pendente' | 'parcial' | 'paga';

export const normalizeContaStatus = (status: string | null | undefined): ContaStatusNormalizado => {
  const value = String(status || '').trim().toLowerCase();

  if (value === 'paga' || value === 'pago') {
    return 'paga';
  }

  if (value === 'parcial') {
    return 'parcial';
  }

  return 'pendente';
};

export const isContaEmAberto = (status: string | null | undefined): boolean => {
  const normalized = normalizeContaStatus(status);
  return normalized === 'pendente' || normalized === 'parcial';
};

export const calcSaldo = (valorTotal: number | null | undefined, totalPago: number | null | undefined): number => {
  return Number(valorTotal || 0) - Number(totalPago || 0);
};
