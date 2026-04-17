import { LegalDocumentPage } from '@/components/legal-document-page';
import {
  legalSummaries,
  LEGAL_VERSION,
  termsSections,
} from '@/features/legal/legal-documents';

export default function TermosPage() {
  return (
    <LegalDocumentPage
      title={legalSummaries.termsTitle}
      summary={legalSummaries.termsSummary}
      version={LEGAL_VERSION}
      sections={termsSections}
    />
  );
}
