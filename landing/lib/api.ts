import { config } from "./config";

export class ApiError extends Error {
  detail: string;
  status: number;
  constructor(message: string, status = 500, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail || message;
  }
}

export const api = {
  async submitPublicCustomPlanRequest(data: {
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    company_name: string;
    business_category: string;
    branch_count: string;
    queue_count: string;
    staff_count: string;
    visitor_volume: string;
    selected_services: string[];
    special_notes?: string;
  }): Promise<{ message: string; id: string }> {
    const res = await fetch(`${config.apiBaseUrl}/subscriptions/public/custom-plan-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let detail = "Unable to submit request. Please try again.";
      try {
        const body = await res.json();
        detail = body.detail || body.message || detail;
      } catch {
        // use fallback
      }
      throw new ApiError(detail, res.status, detail);
    }

    return res.json();
  },
};
