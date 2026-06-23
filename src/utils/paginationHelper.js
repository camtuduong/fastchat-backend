export const getNextCursor = (items, fieldName) => {
  return items.length > 0 ? items[items.length - 1][fieldName] : null;
};
