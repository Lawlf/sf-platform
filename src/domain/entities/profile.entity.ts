export type ProfileType = "PF" | "PJ_MEI";

export interface ProfileEntity {
  id: string;
  userId: string;
  type: ProfileType;
  linkedProfileId: string | null;
  displayName: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}
