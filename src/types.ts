export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other"
}

export enum PrivacySetting {
  PRIVATE = "private",
  FAMILY = "family",
  PUBLIC = "public"
}

export interface AccessControls {
  contactInfo: boolean;
  birthdate: boolean;
  anecdotes: boolean;
}

export interface AdvancedPrivacy {
  profileVisibility: "public" | "friends" | "specific" | "private";
  branchVisibility: "paternal" | "maternal" | "descendants" | "all" | "none";
  contactDetailsVisibility: "public" | "friends" | "specific" | "private";
  birthdateVisibility: "public" | "friends" | "specific" | "private";
  notesVisibility: "public" | "friends" | "specific" | "private";
  allowedIndividuals: string[]; // List of specific user emails or names
}

export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  birthdate: string; // YYYY-MM-DD
  birthplace: string;
  gender: Gender;
  relationshipToRoot: string; // "Self", "Father", "Mother", "Sibling", "Grandfather", etc.
  parents: string[]; // ids of mother/father
  siblings: string[]; // ids of siblings
  children: string[]; // ids of children
  contactPhone: string;
  contactEmail: string;
  address: string;
  privacy: PrivacySetting;
  isAncestor: boolean;
  photos: string[]; // array of base64 image strings or URLs
  notes: string;
  createdAt: number;
  access_controls?: AccessControls;
  advanced_privacy?: AdvancedPrivacy;
  // Offline Sync state
  synced?: boolean;
  pendingSync?: "create" | "update" | "delete" | null;
}

export interface HistoricalDocument {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  fileData: string; // base64 representation of photo/document
  tags: string[];
  linkedMemberIds: string[];
  createdAt: number;
  // Offline Sync state
  synced?: boolean;
  pendingSync?: "create" | "update" | "delete" | null;
}

export interface AnniversaryReminder {
  id: string;
  userId: string;
  memberId: string;
  title: string;
  date: string; // MM-DD or YYYY-MM-DD
  type: "birthday" | "wedding" | "death" | "anniversary";
  remindDaysBefore: number;
  createdAt: number;
  // Offline Sync state
  synced?: boolean;
  pendingSync?: "create" | "update" | "delete" | null;
}

export interface ConnectionMatch {
  userMemberId: string;
  matchedMemberId: string;
  matchedUserId: string;
  relationshipType: string;
  confidence: number;
  explanation: string;
  connectionPath: string;
}

export interface MatchingResult {
  hasMatches: boolean;
  matches: ConnectionMatch[];
  summary: string;
}

export interface LineageAccessRequest {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  toUserId: string;
  memberId: string;
  memberName: string;
  status: "pending" | "approved" | "rejected";
  allowedFields: string[]; // e.g., ['birthdate', 'birthplace', 'contactPhone', 'contactEmail', 'address', 'notes']
  createdAt: number;
}

