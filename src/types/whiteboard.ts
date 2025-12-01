export type WhiteboardDocument = {
  id: string;
  userId: string;
  title: string;
  // Image exported from tldraw.com (data URL or remote URL)
  imageUrl?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type WhiteboardListItem = WhiteboardDocument;
