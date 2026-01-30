import { API_BASE_URL, getAuthToken, safeResponseJson, apiRequest } from "./base";

export interface ComplaintSummary {
  id: number;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  messages_count?: number;
}

export interface ComplaintMessage {
  id: number;
  message: string;
  is_admin_reply: boolean;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

export interface ComplaintAttachment {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ComplaintDetail extends ComplaintSummary {
  description: string;
  order_id?: number | null;
  messages?: ComplaintMessage[];
  attachments?: ComplaintAttachment[];
  updated_at?: string;
  resolved_at?: string | null;
}

export interface ComplaintsResponse {
  success: boolean;
  data: {
    complaints: ComplaintSummary[];
    pagination?: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  };
}

export interface ComplaintResponse {
  success: boolean;
  message?: string;
  data?: {
    complaint?: ComplaintDetail;
  };
}

export interface ReplyResponse {
  success: boolean;
  message: string;
}

export interface CreateComplaintPayload {
  subject: string;
  category: string;
  priority?: string;
  description: string;
  order_id?: number | null;
  attachments?: Array<{
    uri: string;
    name: string;
    mimeType: string;
  }>;
}

const authHeaders = async (): Promise<HeadersInit> => {
  const token = await getAuthToken();
  return {
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const listComplaints = async (
  status?: string,
  perPage: number = 20,
): Promise<ComplaintsResponse> => {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  query.set("per_page", perPage.toString());

  const response = await fetch(
    `${API_BASE_URL}/complaints?${query.toString()}`,
    {
      method: "GET",
      headers: await authHeaders(),
    },
  );

  return await safeResponseJson(response);
};

export const getComplaint = async (id: number): Promise<ComplaintResponse> => {
  const response = await fetch(`${API_BASE_URL}/complaints/${id}`, {
    method: "GET",
    headers: await authHeaders(),
  });

  return await safeResponseJson(response);
};

export const createComplaint = async (
  payload: CreateComplaintPayload,
): Promise<ComplaintResponse> => {
  const formData = new FormData();
  formData.append("subject", payload.subject);
  formData.append("category", payload.category);
  if (payload.priority) {
    formData.append("priority", payload.priority);
  }
  formData.append("description", payload.description);
  if (payload.order_id) {
    formData.append("order_id", payload.order_id.toString());
  }

  if (payload.attachments?.length) {
    payload.attachments.forEach((file) => {
      formData.append("attachments[]", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);
    });
  }

  return await apiRequest<ComplaintResponse>("/complaints", {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    body: formData,
  });
};

export const replyToComplaint = async (
  complaintId: number,
  message: string,
): Promise<ReplyResponse> => {
  return await apiRequest<ReplyResponse>(`/complaints/${complaintId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
};

export const closeComplaint = async (
  id: number,
): Promise<{ success: boolean }> => {
  return await apiRequest<{ success: boolean }>(`/complaints/${id}/close`, {
    method: "POST",
  });
};
