'use strict';

const contract = require('./scheduling-contract');
const { RUNTIME_ERROR_CODES, runtimeError, contractError } = require('./scheduling-errors');

const REQUIRED_TRANSACTION_METHODS = Object.freeze([
  'claimIdempotency',
  'completeIdempotency',
  'getAvailabilityRule',
  'insertAvailabilityRule',
  'updateAvailabilityRule',
  'getOrder',
  'isRangeAvailable',
  'listActiveReservations',
  'insertReservation',
  'getReservationForUpdate',
  'updateReservation',
  'insertEvent',
  'projectOrderSchedule',
  'clearOrderSchedule',
  'listExpiredHolds'
]);

function assertSchedulingRepository(repository) {
  if (!repository || typeof repository.transaction !== 'function') {
    throw runtimeError(
      RUNTIME_ERROR_CODES.repositoryUnavailable,
      'A transactional scheduling repository is required.',
      null,
      503
    );
  }
  return repository;
}

function assertTransactionPort(tx) {
  const missing = REQUIRED_TRANSACTION_METHODS.filter((method) => !tx || typeof tx[method] !== 'function');
  if (missing.length) {
    throw runtimeError(
      RUNTIME_ERROR_CODES.repositoryUnavailable,
      'The scheduling transaction port is incomplete.',
      { missing },
      503
    );
  }
  return true;
}

function mapRepositoryError(error) {
  if (!error || error.code && String(error.code).startsWith('DOKE_')) return error;
  const code = String(error.code || error.sqlState || '').toUpperCase();
  const message = String(error.message || error.details || '');
  if (code === '23P01' || message.includes('schedule_reservations_no_active_overlap')) {
    return contractError(
      contract.ERROR_CODES.conflict,
      'The professional already has an active overlapping occupancy.'
    );
  }
  if (code === '40001' || code === 'P0001' && message.includes('VERSION')) {
    return contractError(
      contract.ERROR_CODES.versionConflict,
      'The canonical scheduling version changed before mutation.'
    );
  }
  return error;
}

module.exports = Object.freeze({
  REQUIRED_TRANSACTION_METHODS,
  assertSchedulingRepository,
  assertTransactionPort,
  mapRepositoryError
});
