// GSTIN (India's GST identification number) validation. Dependency-free so the browser form
// and the /api routes share one rule. Format: 2-digit state code, 10-char PAN, entity number,
// the letter Z, and a check character. This checks the SHAPE only, not that the number exists.

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

/** Uppercases and trims; returns '' for empty input. */
export const normalizeGstin = (value: string): string => value.trim().toUpperCase()

/** True for an empty value (GSTIN is optional) or a well-formed GSTIN. */
export const isValidGstin = (value: string): boolean => {
  const v = normalizeGstin(value)
  return v === '' || GSTIN_PATTERN.test(v)
}
