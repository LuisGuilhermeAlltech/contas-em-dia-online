/**
 * Funções de formatação seguras com fallback para locale pt-BR
 */

const DEFAULT_LOCALE = 'pt-BR';
const FALLBACK_LOCALE = 'en-US';

/**
 * Formata um número como moeda brasileira com fallback
 */
export const formatCurrency = (value: number | null | undefined): string => {
  const numValue = Number(value || 0);
  
  try {
    return numValue.toLocaleString(DEFAULT_LOCALE, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (error) {
    console.warn('Erro ao formatar moeda em pt-BR, usando fallback:', error);
    try {
      return numValue.toLocaleString(FALLBACK_LOCALE, { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (fallbackError) {
      // Último recurso: formatação manual
      return numValue.toFixed(2).replace('.', ',');
    }
  }
};

/**
 * Formata uma data no formato brasileiro (DD/MM/YYYY) com fallback
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  
  try {
    // Adiciona horário para evitar problemas de timezone
    const date = new Date(dateString + 'T00:00:00');
    
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    return date.toLocaleDateString(DEFAULT_LOCALE);
  } catch (error) {
    console.warn('Erro ao formatar data em pt-BR, usando fallback:', error);
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString(FALLBACK_LOCALE);
    } catch (fallbackError) {
      // Último recurso: formatação manual
      try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      } catch (manualError) {
        return dateString;
      }
    }
  }
};

/**
 * Formata um número simples com locale pt-BR
 */
export const formatNumber = (value: number | null | undefined): string => {
  const numValue = Number(value || 0);
  
  try {
    return numValue.toLocaleString(DEFAULT_LOCALE);
  } catch (error) {
    console.warn('Erro ao formatar número em pt-BR, usando fallback:', error);
    try {
      return numValue.toLocaleString(FALLBACK_LOCALE);
    } catch (fallbackError) {
      return String(numValue);
    }
  }
};
