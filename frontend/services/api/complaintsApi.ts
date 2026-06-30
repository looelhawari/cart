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
  bot_handled?: boolean;
  escalated_to_agent?: boolean;
}

export interface ComplaintMessage {
  id: number;
  message: string;
  is_admin_reply: boolean;
  is_bot_reply?: boolean;
  bot_intent?: string;
  attachments?: ComplaintAttachment[] | null;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

export interface ComplaintAttachment {
  id: number;
  message_id?: number | null;
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
  bot_handled?: boolean;
  escalated_to_agent?: boolean;
  escalated_at?: string | null;
  bot_satisfaction_rating?: number | null;
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
  data?: {
    message?: ComplaintMessage;
    bot_response?: {
      message: ComplaintMessage;
      escalated: boolean;
    };
  };
}

export interface CreateComplaintPayload {
  subject: string;
  category: string;
  priority?: string;
  description: string;
  order_id?: number | null;
  attachments?: ComplaintUploadFile[];
}

export interface ComplaintUploadFile {
  uri: string;
  name: string;
  mimeType: string;
}

const authHeaders = async (): Promise<HeadersInit> => {
  const token = await getAuthToken();
  return {
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * Pull-to-refresh on the complaints screen passes forceRefresh=true.
 * Mutations (create/reply/close/escalate/rate) invalidate the complaints
 * prefix so the next list/detail read pulls a fresh server copy.
 */
interface ComplaintsFetchOptions {
  forceRefresh?: boolean;
}

const COMPLAINTS_TTL = 5 * 60 * 1000;
const COMPLAINTS_INVALIDATE = ["complaints"];

export const listComplaints = async (
  status?: string,
  perPage: number = 20,
  options: ComplaintsFetchOptions = {},
): Promise<ComplaintsResponse> => {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  query.set("per_page", perPage.toString());

  return apiRequest<ComplaintsResponse>(
    `/complaints?${query.toString()}`,
    {
      method: "GET",
      cacheKey: `complaints:list:${query.toString()}`,
      cacheTtlMs: COMPLAINTS_TTL,
      forceRefresh: options.forceRefresh,
    },
  );
};

export const getComplaint = async (
  id: number,
  options: ComplaintsFetchOptions = {},
): Promise<ComplaintResponse> => {
  return apiRequest<ComplaintResponse>(`/complaints/${id}`, {
    method: "GET",
    cacheKey: `complaints:detail:${id}`,
    cacheTtlMs: COMPLAINTS_TTL,
    forceRefresh: options.forceRefresh,
  });
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
    body: formData,
    invalidatePrefixes: COMPLAINTS_INVALIDATE,
  });
};

export const replyToComplaint = async (
  complaintId: number,
  message: string,
  attachments: ComplaintUploadFile[] = [],
): Promise<ReplyResponse> => {
  if (attachments.length > 0) {
    const formData = new FormData();
    const trimmedMessage = message.trim();

    if (trimmedMessage) {
      formData.append("message", trimmedMessage);
    }

    attachments.forEach((file) => {
      formData.append("attachments[]", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);
    });

    return await apiRequest<ReplyResponse>(
      `/complaints/${complaintId}/messages`,
      {
        method: "POST",
        body: formData,
        invalidatePrefixes: COMPLAINTS_INVALIDATE,
      },
    );
  }

  return await apiRequest<ReplyResponse>(`/complaints/${complaintId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
    invalidatePrefixes: COMPLAINTS_INVALIDATE,
  });
};

export const closeComplaint = async (
  id: number,
): Promise<{ success: boolean }> => {
  return await apiRequest<{ success: boolean }>(`/complaints/${id}/close`, {
    method: "POST",
    invalidatePrefixes: COMPLAINTS_INVALIDATE,
  });
};

export const broadcastTyping = async (
  id: number,
  isTyping: boolean,
): Promise<{ success: boolean }> => {
  return await apiRequest<{ success: boolean }>(`/complaints/${id}/typing`, {
    method: "POST",
    body: JSON.stringify({ is_typing: isTyping }),
  });
};

export const escalateToAgent = async (
  id: number,
  reason?: string,
): Promise<{ success: boolean; message: string }> => {
  return await apiRequest<{ success: boolean; message: string }>(
    `/complaints/${id}/escalate`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
      invalidatePrefixes: COMPLAINTS_INVALIDATE,
    },
  );
};

export const rateBotExperience = async (
  id: number,
  rating: number,
  feedback?: string,
): Promise<{ success: boolean }> => {
  return await apiRequest<{ success: boolean }>(`/complaints/${id}/rate-bot`, {
    method: "POST",
    body: JSON.stringify({ rating, feedback }),
    invalidatePrefixes: COMPLAINTS_INVALIDATE,
  });
};
