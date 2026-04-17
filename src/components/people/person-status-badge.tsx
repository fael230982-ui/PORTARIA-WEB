import { personStatusColors, personStatusLabels } from "@/constants/people";
import type { PersonStatus } from "@/types/person";

type Props = {
  status: PersonStatus;
};

export function PersonStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${personStatusColors[status]}`}
    >
      {personStatusLabels[status] || status}
    </span>
  );
}
