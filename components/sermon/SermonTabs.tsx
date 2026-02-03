'use client';

import { useState } from 'react';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'study', label: 'Study Notes' },
  { id: 'transcript', label: 'Transcript' },
] as const;

type TabId = typeof TABS[number]['id'];

interface SermonTabsProps {
  overviewContent: React.ReactNode;
  studyNotesContent: React.ReactNode;
  transcriptContent: React.ReactNode;
  initialTab?: TabId;
}

export default function SermonTabs({ overviewContent, studyNotesContent, transcriptContent, initialTab = 'overview' }: SermonTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-[var(--surface)] rounded-xl mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-3 text-xs font-semibold tracking-wide rounded-lg transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-md'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6 animate-fade-in" key={activeTab}>
        {activeTab === 'overview' && overviewContent}
        {activeTab === 'study' && studyNotesContent}
        {activeTab === 'transcript' && transcriptContent}
      </div>
    </div>
  );
}
