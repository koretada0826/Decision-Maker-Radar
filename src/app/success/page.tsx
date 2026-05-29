import { findPlan } from "@/lib/plans";
import { SuccessClient } from "./SuccessClient";

export const dynamic = "force-dynamic";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: {
    plan?: string;
    leadId?: string;
    demo?: string;
    session_id?: string;
  };
}) {
  const plan = findPlan(searchParams.plan ?? "");
  return (
    <SuccessClient
      leadId={searchParams.leadId}
      planName={plan?.name}
      planPrice={plan?.price}
      planLeads={plan?.leads}
      isDemo={searchParams.demo === "1"}
      sessionId={searchParams.session_id}
    />
  );
}
