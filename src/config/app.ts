export const APP_NAME = "Olaer Store";
export const APP_SHORT_NAME = "Olaer Store";
export const APP_VERSION = "v1.0.0";

/** Locale/currency used across the app. The store operates in the Philippines. */
export const LOCALE = "en-PH";
export const CURRENCY = "PHP";

/** Prefix for every persisted storage key, so the app never collides with other apps on the device. */
export const STORAGE_NAMESPACE = "olaer-store";

/**
 * Prices already include VAT, so this rate is only ever used to show a
 * breakdown -- it is never added to a total (decision D1).
 */
export const VAT_RATE = 0.12;

/** No sign-in in version 1; every record is stamped with this user (D3). */
export const CURRENT_USER = {
  id: "USR-001",
  name: "Juan Dela Cruz",
  role: "Owner",
};
