import { apiKlipy } from "../services/apiKlipy.js";
import { env } from "../config/env.js";

export const searchSticker = async (req, res) => {
  const { query, page, per_page, format_filter, content_filter } = req.query;
  const API_KEYS = [env.KLIPY_API_KEY_01, env.KLIPY_API_KEY_02].filter(Boolean);

  for (const apiKey of API_KEYS) {
    try {
      const url = `${apiKey}/stickers/search?page=${page ?? 1}&per_page=${per_page ?? 20}&q=${query ?? "String"}&format_filter=${format_filter ?? ""}&content_filter=${content_filter ?? ""}`;
      const response = await apiKlipy.get(url);

      return res.json(response.data);
    } catch (error) {
      const status = error.response ? error.response.status : null;
      if ([401, 403, 429].includes(status)) {
        console.warn(`Key ${apiKey} failed (${status}), trying next...`);
        continue;
      } else {
        console.error(error.message);
        return res.status(500).json({
          error: "Failed to search stickers",
        });
      }
    }
  }
  return res.status(503).json({
    error: "All API keys are unavailable",
  });
};
