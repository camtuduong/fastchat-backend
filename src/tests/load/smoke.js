/* eslint-disable import/no-unresolved */

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "http://localhost:5001";

export const options = {
  vus: 1,
  duration: "30s",
};

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/signin`,
    JSON.stringify({
      username: "tuduong1",
      password: "tuduong1",
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  check(loginRes, {
    "login success": (r) => r.status === 200,
    "has access token": (r) => Boolean(r.json("accessToken")),
  });

  return {
    accessToken: loginRes.json("accessToken"),
  };
}

export default function (data) {
  const res = http.get(`${BASE_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${data.accessToken}`,
    },
  });

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  sleep(1);
}
