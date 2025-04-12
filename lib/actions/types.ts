export type ActionState = {
  error?: string;
  success: boolean;
  newListId?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};