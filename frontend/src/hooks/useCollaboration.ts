import { useContext } from "react";
import {
  CollaborationContext,
  type CollaborationContextType,
} from "../components/Collaboration/CollaborationProvider";

export function useCollaboration(): CollaborationContextType {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error(
      "useCollaboration must be used within a CollaborationProvider",
    );
  }
  return context;
}
