import { CheckCircle, HelpCircle, Users } from 'lucide-react';

interface PracticalApplicationsProps {
  targetAudience?: string;
  lifeApplications?: string[];
  questionsAddressed?: string[];
}

export default function PracticalApplications({ targetAudience, lifeApplications, questionsAddressed }: PracticalApplicationsProps) {
  const hasApplications = lifeApplications && lifeApplications.length > 0;
  const hasQuestions = questionsAddressed && questionsAddressed.length > 0;

  if (!hasApplications && !hasQuestions) return null;

  return (
    <div className="card-elevated">
      <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] mb-4">
        Practical Application
      </h3>

      {targetAudience && (
        <div className="flex items-center gap-2 mb-4 text-xs">
          <Users size={14} className="text-[var(--accent)]" />
          <span className="text-[var(--text-secondary)]">
            For: <span className="text-[var(--text-primary)] font-medium">{targetAudience}</span>
          </span>
        </div>
      )}

      {hasApplications && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
            Life Applications
          </h4>
          <div className="space-y-2.5">
            {lifeApplications!.map((app, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <CheckCircle size={16} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{app}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasQuestions && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
            Questions Addressed
          </h4>
          <div className="space-y-2.5">
            {questionsAddressed!.map((q, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <HelpCircle size={16} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{q}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
