/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SECURITY NOTICE:
 * Hardcoded service-account credentials have been completely removed from this repository.
 * Any previously exposed service-account private keys MUST be revoked immediately
 * in the Google Cloud / Firebase Console under IAM & Admin > Service Accounts.
 *
 * To run administrative Firebase operations, set GOOGLE_APPLICATION_CREDENTIALS
 * pointing to an external JSON key file outside the project repository.
 */

console.error(
  '[Security Alert] Hardcoded service account credentials are removed. Ensure any previously exposed keys are revoked in Firebase/GCP Console.'
);
process.exit(1);
