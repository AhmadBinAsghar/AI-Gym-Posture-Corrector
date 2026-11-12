// Anchored on both ends: one "@", no spaces, a dot in the domain, a 2+ letter TLD.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;

export const isValidEmail = email => EMAIL_PATTERN.test(email);
