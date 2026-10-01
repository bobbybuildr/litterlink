// Client-safe: shared by Server Actions (to build redirect URLs) and <FlashBanner />.
export const FLASH_MESSAGES = {
  eventCreated: "Event created successfully.",
  eventUpdated: "Event updated successfully.",
  eventCancelled: "Event cancelled successfully.",
  statsSaved: "Impact stats saved and published successfully.",
  statsUpdated: "Impact stats updated successfully.",
  groupCreated: "Group created successfully.",
  groupUpdated: "Group updated successfully.",
  groupDeleted: "Group deleted successfully.",
  applicationSubmitted: "Application submitted successfully.",
  passwordUpdated: "Password updated successfully.",
  accountDeleted: "Your account has been deleted.",
} as const;

export type FlashKey = keyof typeof FLASH_MESSAGES;

export const FLASH_PARAM = "flash";

export function withFlash(path: string, key: FlashKey): string {
  return `${path}${path.includes("?") ? "&" : "?"}${FLASH_PARAM}=${key}`;
}

export function isFlashKey(value: string | null): value is FlashKey {
  return value !== null && Object.prototype.hasOwnProperty.call(FLASH_MESSAGES, value);
}
