import { BadgeCheck } from "lucide-react";
import { Heading, Text } from "@/components/ui";

interface ProjectCertificationsProps {
  certifications?: string[];
}

// Puste lub brak certifications → sekcja nie renderuje się w ogóle, żaden pusty
// placeholder (spec 0020 AC-4).
export function ProjectCertifications({ certifications }: ProjectCertificationsProps) {
  if (!certifications || certifications.length === 0) return null;

  return (
    <div className="flex flex-col gap-brand-2 rounded-v5-card border border-status-approved/30 bg-status-approved/10 p-brand-3">
      <Heading level="h3" surface="v5" className="text-body-l">
        Certyfikaty
      </Heading>
      <ul className="flex flex-wrap gap-brand-2">
        {certifications.map((certification) => (
          <li
            key={certification}
            className="flex items-center gap-brand-1 rounded-data border border-status-approved/30 bg-brand-v5-surface px-brand-2 py-1.5 text-data font-medium"
          >
            <BadgeCheck className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
            <Text as="span" surface="v5" className="text-data">
              {certification}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
}
