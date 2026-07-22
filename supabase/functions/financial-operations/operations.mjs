export const normalizeAction = (value) => {
  const action = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  return ['resolve_withdrawal', 'resolve_dispute'].includes(action) ? action : '';
};

export const normalizeText = (value, max = 500) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

export const normalizeFinancialError = (error) => {
  const source = [error?.code, error?.message, error?.details, error?.hint]
    .map((value) => String(value || ''))
    .join(' ')
    .toUpperCase();
  const known = [
    'DOKE_FINANCIAL_AUTH_REQUIRED',
    'DOKE_FINANCIAL_OPERATOR_REQUIRED',
    'DOKE_FINANCIAL_ROLE_REQUIRED',
    'DOKE_FINANCIAL_ACTION_INVALID',
    'DOKE_WITHDRAWAL_RESOLUTION_INVALID',
    'DOKE_WITHDRAWAL_TRANSACTION_NOT_FOUND',
    'DOKE_WITHDRAWAL_STATE_NOT_FOUND',
    'DOKE_DISPUTE_RESOLUTION_INVALID',
    'DOKE_DISPUTE_NOT_FOUND',
    'DOKE_DISPUTE_FINANCIAL_STATE_NOT_FOUND',
  ].find((code) => source.includes(code));
  return known || 'DOKE_FINANCIAL_OPERATION_FAILED';
};

export const statusForFinancialError = (code) => {
  if (code === 'DOKE_FINANCIAL_AUTH_REQUIRED') return 401;
  if (['DOKE_FINANCIAL_OPERATOR_REQUIRED', 'DOKE_FINANCIAL_ROLE_REQUIRED'].includes(code)) return 403;
  if (['DOKE_WITHDRAWAL_TRANSACTION_NOT_FOUND', 'DOKE_WITHDRAWAL_STATE_NOT_FOUND', 'DOKE_DISPUTE_NOT_FOUND', 'DOKE_DISPUTE_FINANCIAL_STATE_NOT_FOUND'].includes(code)) return 404;
  if (code !== 'DOKE_FINANCIAL_OPERATION_FAILED') return 400;
  return 500;
};
