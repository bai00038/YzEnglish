import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router";

export function LearningInfoRow({ to, icon: Icon, title, description }: {
  to: string; icon: LucideIcon; title: string; description: string;
}) {
  return <Link to={to}>
    <Icon size={21} aria-hidden="true" />
    <div className="learning-info-copy"><strong>{title}</strong><small>{description}</small></div>
    <ChevronRight size={18} aria-hidden="true" />
  </Link>;
}
