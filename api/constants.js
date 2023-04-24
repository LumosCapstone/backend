export const RESOURCE_TYPES = {
  FRIDGE_SPACE: "fridge_space",
  POWER: "power",
  WIFI: "wifi",
};

export const API_RETURN_MESSAGES = {
  RESERVE_SUCCESS: "RESERVE_SUCCESS",
  RESERVE_CONFIRMATION_SUCCESS: "CONFIRMED_RESERVATION",
  RESERVE_CANCELLATION_SUCCESS: "CANCELLED_RESERVATION",
  ITEM_UNAVAILABLE: "ITEM_UNAVAILABLE",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  NO_RESERVATION: 'NO_RESERVATION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_BORROWED: 'NOT_BORROWED',
  RESOURCE_RETURNED: 'RESOURCE_RETURNED',
  RESERVED: 'RESOURCE_RESERVED',
  UNLISTED: 'ITEM_UNLISTED',
  RELISTED: 'ITEM_RELISTED',
  USER_NOT_FOUND: 'USER_NOT_FOUND'
};

export const ITEM = {
  LISTED: 0,
  RESERVED: 1,
  CONFIRMED: 2,
  UNLISTED: 3,
}