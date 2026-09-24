export function hasFirms() {
  return Boolean(process.env.FIRMS_MAP_KEY);
}

export function hasLlm() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export function hasTwilio() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

export const NWS_UA =
  process.env.NWS_USER_AGENT ?? "RallyHuddle/1.0 (youngcoderssphere; rally@local)";
