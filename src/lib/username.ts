/**
 * Helper to generate an automatic username from an email or full name.
 * Example: 'alex.morgan@cove.app' -> 'alex_morgan_782'
 */
export function generateAutoUsername(input: string): string {
  if (!input) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `cove_user_${randomSuffix}`;
  }

  // If input is an email, take the part before @
  const base = input.includes('@') ? input.split('@')[0] : input;

  // Clean string: replace special chars/spaces with underscores, keep alphanumeric & underscores
  let cleaned = base
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (cleaned.length < 3) {
    cleaned = `user_${cleaned}`;
  }

  // Trim to max 15 chars before adding random suffix
  if (cleaned.length > 15) {
    cleaned = cleaned.substring(0, 15);
  }

  const randomDigits = Math.floor(100 + Math.random() * 900);
  return `${cleaned}_${randomDigits}`;
}

/**
 * Validates a username format.
 * Must be 3-24 characters long and contain only letters, numbers, and underscores.
 */
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  const clean = username.startsWith('@') ? username.slice(1) : username;

  if (!clean || clean.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long.' };
  }

  if (clean.length > 24) {
    return { isValid: false, error: 'Username cannot exceed 24 characters.' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores.' };
  }

  return { isValid: true };
}
