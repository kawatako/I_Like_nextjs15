export interface UserData {
  id: string;
  username: string | null;
  image: string | null;
}

// 他のユーザー関連の型定義もここに追加できます
export interface UserProfile extends UserData {
  bio: string | null;
}
