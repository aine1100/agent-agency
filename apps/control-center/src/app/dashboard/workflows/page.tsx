import { getWorkflows } from "@/lib/services/dashboard-service";
import { WorkflowListClient } from "./workflow-list-client";

export default async function WorkflowsPage() {
  const workflows = await getWorkflows();

  return (
    <WorkflowListClient initialWorkflows={workflows as any} />
  );
}
