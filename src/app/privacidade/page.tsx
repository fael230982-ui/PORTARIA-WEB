import { LegalDocumentPage } from '@/components/legal-document-page';
import {
  legalSummaries,
  LEGAL_VERSION,
  privacySections,
} from '@/features/legal/legal-documents';

export default function PrivacidadePage() {
  return (
    <LegalDocumentPage
      title={legalSummaries.privacyTitle}
      summary={legalSummaries.privacySummary}
      version={LEGAL_VERSION}
      sections={privacySections}
    />
  );
}
