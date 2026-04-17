import {
  personCategoryColors,
  personCategoryLabels,
} from "@/constants/people";
import type { PersonCategory } from "@/types/person";

type Props = {
  category: PersonCategory;
};

export function PersonCategoryBadge({ category }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${personCategoryColors[category]}`}
    >
      {personCategoryLabels[category] || category}
    </span>
  );
}