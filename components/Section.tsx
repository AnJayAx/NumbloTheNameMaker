import type { ReactNode } from "react";

interface Props {
  /** Short mono label shown in the left column. */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Left-label / right-content rhythm (the "ultra" signature). The label sits in
 * a narrow left column on sm+ and stacks above the content on mobile.
 */
export default function Section({ label, children, className = "" }: Props) {
  return (
    <section className={className}>
      <div className="section-label mb-3">{label}</div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
