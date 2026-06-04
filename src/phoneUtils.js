import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhone(input) {
  if (!input) return "";

  const phoneNumber = parsePhoneNumberFromString(String(input));
  if (!phoneNumber || !phoneNumber.isValid()) return "";

  return phoneNumber.number;
}

export function isValidPhone(input) {
  return Boolean(normalizePhone(input));
}

export function formatPhoneForDisplay(input) {
  const phoneNumber = parsePhoneNumberFromString(String(input));
  if (!phoneNumber || !phoneNumber.isValid()) return input || "";

  return phoneNumber.formatInternational();
}
