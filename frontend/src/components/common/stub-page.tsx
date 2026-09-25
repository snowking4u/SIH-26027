import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  PagePlaceholder,
  type PlaceholderDataSource,
} from "@/components/common/page-placeholder";
import { PageHeader } from "@/components/common/page-header";

export interface StubPageProps {
  eyebrow?: string;
  title: string;
  description: string;
  /** Icon shown inside the placeholder block. */
  icon?: LucideIcon;
  /** Plain-language answer to "what should the controller understand/do here?". */
  intent: ReactNode;
  /** Real backend endpoints this screen will consume in Phase 2. */
  dataSources: PlaceholderDataSource[];
  note?: string;
}

/**
 * Standard Phase‑2 stub screen: honest page header + placeholder that
 * states the operational intent and the real API endpoints behind it.
 */
export function StubPage({
  eyebrow,
  title,
  description,
  icon,
  intent,
  dataSources,
  note,
}: StubPageProps) {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <PagePlaceholder icon={icon} intent={intent} dataSources={dataSources} note={note} />
    </div>
  );
}