const { ROLE_MEMBER, ROLE_ADMIN } = require('../constants');

function parseId(value) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function isValidAvatarColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function isValidBubbleColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function isValidRole(value) {
  return Number.isInteger(value) && value >= ROLE_MEMBER && value <= ROLE_ADMIN;
}

module.exports = {
  parseId,
  isValidAvatarColor,
  isValidBubbleColor,
  isValidRole,
};
