/* eslint-disable import/no-unresolved */

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "http://localhost:5001";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const res = http.post(`${BASE_URL}/api/messages/`);

  check(res, {
    "api messages responded": (response) => response.status === 200,
  });

  sleep(1);
}
