// Conservative lexical checks, NOT semantic entailment proofs. False positives
// fail safely; paraphrases and complex units still require human review.
export function claimFlags(claim: string, quote: string): string[] {
  const flags: string[] = [];
  if (
    /theoretical (?:maximum|maxima|limit)/i.test(claim) &&
    !/theoretical (?:maximum|maxima|limit)/i.test(quote)
  )
    flags.push(
      "Unsupported theoretical-maximum comparison; often-cited values are not theoretical limits.",
    );
  const numbers = (s: string) =>
    s.replace(/(?<=\d),(?=\d{3}\b)/g, "").match(/\d+(?:\.\d+)?/g) || [];
  const cited = new Set(numbers(quote));
  if (numbers(claim).some((n) => !cited.has(n)))
    flags.push(
      "Numerical value absent from cited quote; check units, ranges and conversions manually.",
    );
  const units = (s: string) =>
    s.toLowerCase().match(/%|\brpm\b|\bkwh\b|\bkj\/kg\b|\bw[·.]?h\/kg\b/g) ||
    [];
  const quotedUnits = new Set(units(quote));
  if (units(claim).some((unit) => !quotedUnits.has(unit)))
    flags.push("Unit absent from cited quote; conversion is not verified.");
  if (
    /\b(?:higher|greater|more)\b/i.test(claim) &&
    /\b(?:lower|less)\b/i.test(quote) &&
    !/\b(?:higher|greater|more)\b/i.test(quote)
  )
    flags.push(
      "Possible reversed comparison; check which quantities are compared.",
    );
  if (
    /(?:as high as|up to|may|can|typically|often|some)/i.test(quote) &&
    !/(?:as high as|up to|may|can|typically|often|some|reported|source states)/i.test(
      claim,
    ) &&
    (/\d/.test(claim) || /always|all |every|guarantee/i.test(claim))
  )
    flags.push("Possible exaggeration: source qualifier was removed.");
  if (
    /always|guaranteed|universally/i.test(claim) &&
    !/always|guaranteed|universally/i.test(quote)
  )
    flags.push("Absolute statement exceeds the cited wording.");
  return flags;
}
export function reportWarnings(text: string): string[] {
  const flags: string[] = [];
  // Absence assertions are prohibited in Phase 2B: bounded retrieval cannot prove
  // absence from a document. This also catches the reviewed Mission #001 errors.
  if (
    /(?:not|never)\s+(?:provided|included|given|specified|described|discussed|quantified|explained|available|present|stated|addressed)|\b(?:missing|absent|lacks?)\b|\bno\s+(?:data|information|details|evidence)|does not\s+(?:provide|include|describe|discuss|specify|explain|quantify)|doesn't\s+(?:provide|include)/i.test(
      text,
    )
  )
    flags.push(
      "Unsupported absence assertion: review the full retained excerpts and describe scope instead.",
    );
  const proofText = text
    .replace(
      /not (?:yet )?independently (?:confirmed|corroborated|verified)/gi,
      "",
    )
    .replace(/(?:needs?|requires?) independent corroboration/gi, "")
    .replace(
      /(?:AI|agent) agreement (?:is not proof|does not prove[^.]*|is not independent corroboration)/gi,
      "",
    );
  if (
    /(?:independently (?:confirmed|corroborated|verified)|independent corroboration|agent agreement|AI agreement|agents agree)/i.test(
      proofText,
    )
  )
    flags.push(
      "Do not claim independent corroboration or use AI agreement as proof.",
    );
  return flags;
}
