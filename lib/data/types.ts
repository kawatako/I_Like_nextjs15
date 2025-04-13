export interface UserData {
  id: string;
  username: string | null;
  image: string | null;
}

export interface UserProfile extends UserData {
  bio: string | null;
}
