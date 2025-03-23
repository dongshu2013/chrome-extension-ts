/**
 * Parses Twitter/X number format (like 1.5K, 2.3M) to a number
 * @param text Number text to parse
 * @returns Parsed number
 */
export function parseTwitterNumber(text: string): number {
  if (!text || text === "") return 0

  // Remove commas and whitespace
  text = text.replace(/,|\s/g, "")

  // Parse numbers like "1.5K", "2.3M"
  const numericMatch = text.match(/^([\d.]+)([KkMmBb])?$/)
  if (numericMatch) {
    const [_, numPart, suffix] = numericMatch
    const base = parseFloat(numPart)

    if (suffix) {
      const upperSuffix = suffix.toUpperCase()
      if (upperSuffix === "K") return base * 1000
      if (upperSuffix === "M") return base * 1000000
      if (upperSuffix === "B") return base * 1000000000
    }

    return base
  }

  // Try to extract just the number
  const justNumbers = text.match(/^[\d,]+$/)
  if (justNumbers) {
    return parseInt(justNumbers[0].replace(/,/g, ""), 10)
  }

  return 0
}
