import Link from 'next/link';
import { getSermonByCode, getTopicsForSermon, getScriptureReferencesForSermon, getSeriesById, getAdjacentSermonsInSeries, getRelatedSermons } from '@/lib/db';
import AudioPlayer from '@/components/AudioPlayer';
import PlayButton from '@/components/PlayButton';
import { Calendar, Clock, BookOpen, ExternalLink } from 'lucide-react';

import SermonTabs from '@/components/sermon/SermonTabs';
import ExpandableSummary from '@/components/sermon/ExpandableSummary';
import ScriptureRefsWithContext from '@/components/sermon/ScriptureRefsWithContext';
import SermonOutline from '@/components/sermon/SermonOutline';
import NotableQuotes from '@/components/sermon/NotableQuotes';
import PracticalApplications from '@/components/sermon/PracticalApplications';
import DoctrineSection from '@/components/sermon/DoctrineSection';
import ExternalReferences from '@/components/sermon/ExternalReferences';
import BiblicalContent from '@/components/sermon/BiblicalContent';
import SeriesNavigation from '@/components/sermon/SeriesNavigation';
import RelatedSermons from '@/components/sermon/RelatedSermons';
import AddToQueueButton from '@/components/AddToQueueButton';
import TranscriptWithHighlight from '@/components/sermon/TranscriptWithHighlight';

export default async function SermonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const highlightQuery = (sp.t as string) || '';
  const sermon = await getSermonByCode(code);

  if (!sermon) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="font-serif text-2xl font-semibold mb-2 text-[var(--text-primary)]">
            Sermon not found
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            This sermon could not be found in the archive.
          </p>
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const topics = await getTopicsForSermon(sermon.id);
  const scriptureRefs = await getScriptureReferencesForSermon(sermon.id);
  const series = sermon.series_id ? await getSeriesById(sermon.series_id) : null;

  // Get series navigation
  const adjacentSermons = series && sermon.date_preached
    ? await getAdjacentSermonsInSeries(series.id, sermon.date_preached)
    : { prev: undefined, next: undefined };

  // Parse metadata
  let metadata: any = null;
  try {
    metadata = sermon.llm_metadata ? JSON.parse(sermon.llm_metadata) : null;
  } catch (e) {
    // ignore
  }

  // Get related sermons
  const primaryTheme = metadata?.themes?.primary || null;
  const scriptureBook = metadata?.scripture?.primary_passage?.book || null;
  const relatedSermons = await getRelatedSermons(sermon.id, primaryTheme, scriptureBook, 5);

  // ---- Build tab content ----

  // OVERVIEW TAB
  const overviewContent = (
    <div className="space-y-6">
      {/* Summary with main theme */}
      <ExpandableSummary
        mainTheme={metadata?.summary?.main_theme}
        brief={
          typeof metadata?.summary === 'string'
            ? metadata.summary
            : metadata?.summary?.brief
        }
        detailed={metadata?.summary?.detailed}
        sermonType={metadata?.summary?.sermon_type}
        fallbackDescription={sermon.description}
      />

      {/* Scripture References with Context */}
      {metadata?.scripture?.all_references ? (
        <ScriptureRefsWithContext
          primaryPassage={metadata.scripture.primary_passage}
          allReferences={metadata.scripture.all_references}
        />
      ) : scriptureRefs.length > 0 ? (
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-[var(--accent)]" />
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Scripture References
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {scriptureRefs.map((ref) => (
              <Link
                key={ref.id}
                href={`/browse/scripture/${encodeURIComponent(ref.book)}/${ref.chapter}`}
                className="tag"
              >
                {ref.reference_text}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Topics */}
      {topics.length > 0 && (
        <div className="card-elevated">
          <h3 className="font-serif text-lg font-bold mb-3 text-[var(--text-primary)]">
            Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/topics/${topic.id}`}
                className="tag"
              >
                {topic.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Themes */}
      {metadata?.themes && (
        <div className="card-elevated">
          <h3 className="font-serif text-lg font-bold mb-3 text-[var(--text-primary)]">
            Themes
          </h3>
          {metadata.themes.primary && (
            <div className="mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">Primary</span>
              <Link href={`/search?q=${encodeURIComponent(metadata.themes.primary)}`} className="tag tag-active">
                {metadata.themes.primary}
              </Link>
            </div>
          )}
          {metadata.themes.secondary && metadata.themes.secondary.length > 0 && (
            <div className="mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">Secondary</span>
              <div className="flex flex-wrap gap-2">
                {metadata.themes.secondary.map((theme: string, idx: number) => (
                  <Link key={idx} href={`/search?q=${encodeURIComponent(theme)}`} className="tag">
                    {theme}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {metadata.themes.theological_categories && metadata.themes.theological_categories.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">Theological Categories</span>
              <div className="flex flex-wrap gap-2">
                {metadata.themes.theological_categories.map((cat: string, idx: number) => (
                  <Link key={idx} href={`/search?q=${encodeURIComponent(cat)}`} className="tag">
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keywords */}
      {metadata?.keywords && metadata.keywords.length > 0 && (
        <div className="card-elevated">
          <h3 className="font-serif text-lg font-bold mb-3 text-[var(--text-primary)]">
            Keywords
          </h3>
          <div className="flex flex-wrap gap-2">
            {metadata.keywords.map((keyword: string, idx: number) => (
              <Link
                key={idx}
                href={`/search?q=${encodeURIComponent(keyword)}`}
                className="tag"
              >
                {keyword}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Series Info */}
      {series && (
        <SeriesNavigation
          series={series}
          seriesPosition={metadata?.context?.series_position}
          prev={adjacentSermons.prev}
          next={adjacentSermons.next}
        />
      )}
    </div>
  );

  // STUDY NOTES TAB
  const studyNotesContent = (
    <div className="space-y-6">
      {/* Sermon Outline */}
      {metadata?.structure?.main_points && (
        <SermonOutline
          mainPoints={metadata.structure.main_points}
          outlineStyle={metadata.structure.outline_style}
          progression={metadata.structure.progression}
        />
      )}

      {/* Notable Quotes */}
      <NotableQuotes quotes={metadata?.notable_quotes} />

      {/* Practical Applications */}
      <PracticalApplications
        targetAudience={metadata?.practical?.target_audience}
        lifeApplications={metadata?.practical?.life_applications}
        questionsAddressed={metadata?.practical?.questions_addressed}
      />

      {/* Doctrine */}
      <DoctrineSection
        keyDoctrinesDefended={metadata?.doctrine?.key_doctrines_defended}
        heresiesRefuted={metadata?.doctrine?.heresies_refuted}
      />

      {/* External References */}
      <ExternalReferences
        authorsQuoted={metadata?.external_references?.authors_quoted}
        hymnsMentioned={metadata?.external_references?.hymns_mentioned}
        booksReferenced={metadata?.external_references?.books_referenced}
      />

      {/* Biblical Content */}
      <BiblicalContent
        charactersDiscussed={metadata?.biblical_content?.characters_discussed}
        placesMentioned={metadata?.biblical_content?.places_mentioned}
        timePeriod={metadata?.biblical_content?.time_period}
      />

      {/* Empty state */}
      {!metadata?.structure?.main_points &&
       !metadata?.notable_quotes?.length &&
       !metadata?.practical?.life_applications?.length &&
       !metadata?.doctrine?.key_doctrines_defended?.length &&
       !metadata?.external_references?.authors_quoted?.length &&
       !metadata?.biblical_content?.characters_discussed?.length && (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text-tertiary)]">
            Study notes are not yet available for this sermon.
          </p>
        </div>
      )}
    </div>
  );

  // TRANSCRIPT TAB
  // Clean transcript text (shared logic for both highlighted and plain rendering)
  const cleanedTranscript = (() => {
    let text = sermon.transcript_text || '';
    if (!text) return '';
    const junkPatterns = [
      /^.*?(VIDEO SERMON|AUDIO SERMON).*$/gim,
      /^(WATCH NOW|ADD TO WATCHLIST|SHARE|DOWNLOAD|TRANSCRIPT|PRINT|SERMONS ARCHIVE|RESET|CD|DVD|MP3|MP4)\s*$/gim,
      /^[A-Z]\s*$/gm,
    ];
    for (const pattern of junkPatterns) {
      text = text.replace(pattern, '');
    }
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    let startIdx = 0;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i].trim();
      if (line.length > 60 && /[a-z]/.test(line) && /[.,:;]/.test(line)) {
        startIdx = i;
        break;
      }
    }
    text = lines.slice(startIdx).join('\n');
    return text.replace(/\n{3,}/g, '\n\n').trim();
  })();

  const transcriptContent = (
    <div className="space-y-6">
      {cleanedTranscript ? (
        <div className="card-elevated">
          <h3 className="font-serif text-lg font-bold mb-4 text-[var(--text-primary)]">
            Full Transcript
          </h3>
          {highlightQuery ? (
            <TranscriptWithHighlight text={cleanedTranscript} query={highlightQuery} />
          ) : (
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {cleanedTranscript}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text-tertiary)]">
            A transcript is not yet available for this sermon.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="pb-40 animate-fade-in">
      {/* Header */}
      <header className="px-6 pt-6 pb-4 glass sticky top-0 z-40 border-b border-white/5">
        <Link
          href="/"
          className="text-[var(--accent)] text-sm font-medium hover:text-[var(--accent-hover)] transition-colors inline-block mb-3"
        >
          &larr; Back
        </Link>
        <h1 className="font-serif text-2xl md:text-3xl text-[var(--gold-text)] leading-tight">
          {sermon.title}
        </h1>
        {sermon.verse && (
          <p className="text-sm text-[var(--accent)] font-medium mt-1">
            {sermon.verse}
          </p>
        )}

        {/* Metadata Tags */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-[var(--text-tertiary)]">
          {sermon.date_preached && (
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>
                {new Date(sermon.date_preached).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
          {sermon.duration && (
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{Math.round(sermon.duration / 60)} min</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <BookOpen size={14} />
            <span>{sermon.sermon_code}</span>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* Play Button + Audio Player */}
        {sermon.audio_url ? (
          <div className="card-elevated">
            <div className="flex items-center gap-4 mb-4">
              <PlayButton sermon={sermon} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">Listen Now</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {sermon.duration ? `${Math.round(sermon.duration / 60)} min` : 'Audio available'}
                </p>
              </div>
              <AddToQueueButton sermon={sermon} variant="icon" />
            </div>
            <AudioPlayer />
          </div>
        ) : (
          <a
            href={`https://www.gty.org/sermons/${sermon.sermon_code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="card-elevated flex items-center justify-center gap-2 py-4 text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            <ExternalLink size={18} />
            <span className="font-medium text-sm">Listen on GTY.org</span>
          </a>
        )}

        {/* Tabbed Content */}
        <SermonTabs
          overviewContent={overviewContent}
          studyNotesContent={studyNotesContent}
          transcriptContent={transcriptContent}
          initialTab={highlightQuery ? 'transcript' : 'overview'}
        />

        {/* Related Sermons */}
        <RelatedSermons sermons={relatedSermons} />

        {/* Queue Action */}
        <AddToQueueButton
          sermon={sermon}
          variant="button"
        />

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href={`/api/sermons/${sermon.sermon_code}/pdf`}
            download
            className="btn btn-primary flex-1"
          >
            Download PDF (with Transcript)
          </a>
          {sermon.audio_url ? (
            <a
              href={sermon.audio_url}
              download
              className="btn btn-secondary flex-1"
            >
              Download MP3
            </a>
          ) : (
            <a
              href={`https://www.gty.org/sermons/${sermon.sermon_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} />
              Listen on GTY.org
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
