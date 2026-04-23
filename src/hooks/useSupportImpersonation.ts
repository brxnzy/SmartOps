import { useContext } from "react";
import SupportImpersonationContext from "../context/SupportImpersonationContext";

export default function useSupportImpersonation() {
  const ctx = useContext(SupportImpersonationContext);
  if (!ctx) {
    throw new Error("useSupportImpersonation debe usarse dentro de SupportImpersonationProvider");
  }
  return ctx;
}

