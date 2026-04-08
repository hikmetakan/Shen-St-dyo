import axios from "axios";

export interface CreateTaskInput {
  prompt: string;
  image_input?: string[];
  aspect_ratio?: string;
  resolution?: string;
  output_format?: string;
}

export interface CreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  } | null;
}

export interface TaskDetailResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: "pending" | "processing" | "success" | "failed";
    results?: {
      url: string;
    }[];
    error?: string;
  } | null;
}

export const createTask = async (input: CreateTaskInput): Promise<CreateTaskResponse> => {
  const response = await axios.post("/api/createTask", {
    model: "nano-banana-2",
    input
  });
  return response.data;
};

export const getTaskDetail = async (taskId: string): Promise<TaskDetailResponse> => {
  const response = await axios.post("/api/getTaskDetail", { taskId });
  return response.data;
};
