/**
 * Bỏ dấu tiếng Việt, chuyển về chữ thường
 * Ví dụ: "Nguyễn Văn A" → "nguyen van a"
 */
export const normalizeText = (text) => {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};
