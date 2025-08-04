import { Doc, Id } from "../../convex/_generated/dataModel";

export type WizardID = Id<"wizards">;
export type UserID = string;

export interface Wizard extends Doc<"wizards"> {
  _id: WizardID;
  owner: UserID;
  name: string;
  description: string;
  illustrationURL?: string;
  illustration?: string;
  illustrationGeneratedAt?: number;
  illustrationVersion?: number;
  illustrations?: string[];
  isAIPowered?: boolean;
  wins?: number;
  losses?: number;
  _creationTime: number;
}
