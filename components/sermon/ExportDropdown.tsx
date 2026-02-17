'use client';

import { useRef, useEffect, useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';

interface ExportDropdownProps {
  sermonCode: string;
  highlightQuery: string;
}

export default function ExportDropdown({ sermonCode, highlightQuery }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when tapping outside
  useEffect(() => {
    if (!open) return;

    const handleTap = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleTap);
    document.addEventListener('touchstart', handleTap);

    return () => {
      document.removeEventListener('mousedown', handleTap);
      document.removeEventListener('touchstart', handleTap);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="btn btn-primary w-full flex items-center justify-center gap-2"
      >
        <Download size={16} />
        Export Transcript
        <ChevronDown
          size={18}
          className={`transition-transform text-[var(--bg-primary)]/90 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-2 z-[35] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-2xl p-1.5 space-y-1 max-h-[60vh] overflow-y-auto">
          <a
            href={`/api/sermons/${sermonCode}/export?format=pdf&scope=full`}
            download
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            Download whole transcript (PDF)
          </a>
          <a
            href={`/api/sermons/${sermonCode}/export?format=docx&scope=full`}
            download
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            Download whole transcript (DOCX)
          </a>
          <a
            href={`/api/sermons/${sermonCode}/export?format=pdf&scope=highlights&q=${encodeURIComponent(highlightQuery)}`}
            download
            onClick={() => setOpen(false)}
            className={`block px-3 py-2 rounded-lg text-sm hover:bg-[var(--surface-hover)] ${
              highlightQuery ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] pointer-events-none opacity-50'
            }`}
          >
            Download highlighted paragraphs (PDF)
          </a>
          <a
            href={`/api/sermons/${sermonCode}/export?format=docx&scope=highlights&q=${encodeURIComponent(highlightQuery)}`}
            download
            onClick={() => setOpen(false)}
            className={`block px-3 py-2 rounded-lg text-sm hover:bg-[var(--surface-hover)] ${
              highlightQuery ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] pointer-events-none opacity-50'
            }`}
          >
            Download highlighted paragraphs (DOCX)
          </a>
          {!highlightQuery && (
            <p className="px-3 pb-1 pt-0.5 text-[10px] text-[var(--text-tertiary)]">
              Open this sermon from transcript search to enable highlighted-paragraph exports.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
