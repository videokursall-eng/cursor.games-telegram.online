import axios from "axios";

export async function track(eventType: string, payload?: unknown): Promise<void> {
  try {
    await axios.post("/api/analytics/event", {
      type: eventType,
      payload,
    });
  } catch {
    // ignore analytics failures
  }
}

