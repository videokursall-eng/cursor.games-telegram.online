import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 50,
  duration: "30s",
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL || "http://localhost:8080"}/api/health`);
  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(0.2);
}

