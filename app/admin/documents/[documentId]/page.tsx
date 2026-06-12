import { DocumentDetailView } from "../../features";

export default async function DocumentReviewPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  return <DocumentDetailView documentId={documentId} />;
}
