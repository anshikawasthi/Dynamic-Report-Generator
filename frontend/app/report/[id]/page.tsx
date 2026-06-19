import { fetchReportA2UI } from "@/lib/api";
import { notFound } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export default async function ReportPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { edit } = await searchParams;
  const isEditMode = edit === "true";

  let data;
  try {
    // In edit mode, fetch unfiltered data so the FSM sees all KPIs/assets
    data = await fetchReportA2UI(id, isEditMode);
  } catch {
    notFound();
  }

  return (
    <DashboardShell
      messages={data.messages}
      contract={data.contract}
      isEditMode={isEditMode}
      reportId={id}
      savedCustomization={data.customization}
    />
  );
}
