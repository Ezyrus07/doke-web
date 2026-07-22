export const normalizeAction = (value) => {
  const action = String(value || '').trim().toLowerCase();
  return ['prepare_uploads', 'submit', 'list', 'detail', 'start', 'decide'].includes(action)
    ? action
    : 'list';
};

export const normalizeText = (value, max = 500) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

export const normalizeLimit = (value, fallback = 100, min = 1, max = 200) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
};

export const normalizeKycError = (error) => {
  const source = [error?.code, error?.message, error?.details, error?.hint]
    .map((value) => String(value || ''))
    .join(' ')
    .toUpperCase();

  const known = [
    'DOKE_KYC_AUTH_REQUIRED',
    'DOKE_KYC_APPLICANT_AUTH_REQUIRED',
    'DOKE_KYC_APPLICANT_REQUIRED',
    'DOKE_KYC_REVIEWER_AUTH_REQUIRED',
    'DOKE_KYC_REVIEWER_REQUIRED',
    'DOKE_KYC_UPLOAD_FILES_INVALID',
    'DOKE_KYC_UPLOAD_FILES_REQUIRED',
    'DOKE_KYC_UPLOAD_FIELD_DUPLICATE',
    'DOKE_KYC_UPLOAD_FILE_INVALID',
    'DOKE_KYC_UPLOAD_FIELD_INVALID',
    'DOKE_KYC_UPLOAD_FILENAME_INVALID',
    'DOKE_KYC_UPLOAD_SIZE_INVALID',
    'DOKE_KYC_UPLOAD_INTENT_REQUIRED',
    'DOKE_KYC_UPLOAD_INTENT_NOT_FOUND',
    'DOKE_KYC_UPLOAD_INTENT_USED',
    'DOKE_KYC_UPLOAD_INTENT_EXPIRED',
    'DOKE_KYC_UPLOAD_INTENT_TYPE_MISMATCH',
    'DOKE_KYC_UPLOAD_MANIFEST_INVALID',
    'DOKE_KYC_DOCUMENT_NOT_FOUND',
    'DOKE_KYC_DOCUMENT_SIZE_MISMATCH',
    'DOKE_KYC_DOCUMENT_TYPE_MISMATCH',
    'DOKE_KYC_SELFIE_TYPE_INVALID',
    'DOKE_KYC_DOCUMENT_TYPE_INVALID',
    'DOKE_KYC_SUBMISSION_LOCKED',
    'DOKE_KYC_PAYLOAD_INVALID',
    'DOKE_KYC_LEGAL_NAME_INVALID',
    'DOKE_KYC_TAX_ID_INVALID',
    'DOKE_KYC_BIRTH_DATE_INVALID',
    'DOKE_KYC_REPRESENTATIVE_INVALID',
    'DOKE_KYC_ADDRESS_INVALID',
    'DOKE_KYC_CONSENT_REQUIRED',
    'DOKE_KYC_VERIFICATION_ID_REQUIRED',
    'DOKE_KYC_VERIFICATION_ID_INVALID',
    'DOKE_KYC_VERIFICATION_NOT_FOUND',
    'DOKE_KYC_STATUS_INVALID',
    'DOKE_KYC_ALREADY_CLAIMED',
    'DOKE_KYC_REVIEW_START_NOT_ALLOWED',
    'DOKE_KYC_DECISION_INVALID',
    'DOKE_KYC_REJECTION_REASON_REQUIRED',
    'DOKE_KYC_DECISION_NOT_ALLOWED',
    'DOKE_KYC_REVIEW_OWNER_REQUIRED',
  ].find((code) => source.includes(code));

  return known || 'DOKE_KYC_OPERATION_FAILED';
};

export const statusForKycError = (code) => {
  if (['DOKE_KYC_AUTH_REQUIRED', 'DOKE_KYC_APPLICANT_AUTH_REQUIRED', 'DOKE_KYC_REVIEWER_AUTH_REQUIRED'].includes(code)) return 401;
  if (['DOKE_KYC_APPLICANT_REQUIRED', 'DOKE_KYC_REVIEWER_REQUIRED', 'DOKE_KYC_REVIEW_OWNER_REQUIRED'].includes(code)) return 403;
  if (['DOKE_KYC_VERIFICATION_NOT_FOUND', 'DOKE_KYC_UPLOAD_INTENT_NOT_FOUND', 'DOKE_KYC_DOCUMENT_NOT_FOUND'].includes(code)) return 404;
  if (['DOKE_KYC_ALREADY_CLAIMED', 'DOKE_KYC_REVIEW_START_NOT_ALLOWED', 'DOKE_KYC_DECISION_NOT_ALLOWED', 'DOKE_KYC_SUBMISSION_LOCKED', 'DOKE_KYC_UPLOAD_INTENT_USED', 'DOKE_KYC_UPLOAD_INTENT_EXPIRED'].includes(code)) return 409;
  if (code !== 'DOKE_KYC_OPERATION_FAILED') return 400;
  return 500;
};
