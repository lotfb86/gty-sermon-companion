import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getListeningHistory } from '@/lib/auth-db';
import { getSermonByCode } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const history = await getListeningHistory(user.id);

  let totalHoursListened = 0;
  let sermonsCompleted = 0;
  const topicCounts: Record<string, number> = {};
  const bookCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  // Track streak
  const daysWithActivity = new Set<string>();

  for (const entry of history) {
    const progress = entry.duration > 0 ? entry.position / entry.duration : 0;
    const isCompleted = progress >= 0.95;

    // Hours listened (use actual position listened, not duration)
    totalHoursListened += entry.position / 3600;

    if (isCompleted) {
      sermonsCompleted++;
    }

    // Track activity days for streak
    if (entry.last_played_at) {
      const day = entry.last_played_at.substring(0, 10); // YYYY-MM-DD
      daysWithActivity.add(day);
    }

    // Get sermon metadata for completed sermons
    if (isCompleted) {
      const sermon = await getSermonByCode(entry.sermon_code);
      if (sermon?.llm_metadata) {
        try {
          const meta = JSON.parse(sermon.llm_metadata);

          // Primary theme
          if (meta?.themes?.primary) {
            const theme = meta.themes.primary;
            topicCounts[theme] = (topicCounts[theme] || 0) + 1;
          }

          // Theological categories
          if (Array.isArray(meta?.themes?.theological_categories)) {
            for (const cat of meta.themes.theological_categories) {
              categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            }
          }

          // Primary scripture book
          if (meta?.scripture?.primary_passage?.book) {
            const book = meta.scripture.primary_passage.book;
            bookCounts[book] = (bookCounts[book] || 0) + 1;
          }
        } catch {}
      }
    }
  }

  // Calculate streak (consecutive days from today going backwards)
  let streak = 0;
  const sortedDays = Array.from(daysWithActivity).sort().reverse();
  if (sortedDays.length > 0) {
    const today = new Date().toISOString().substring(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

    // Streak must start from today or yesterday
    if (sortedDays[0] === today || sortedDays[0] === yesterday) {
      let expectedDate = new Date(sortedDays[0]);
      for (const day of sortedDays) {
        const dayDate = new Date(day);
        const diff = Math.abs(expectedDate.getTime() - dayDate.getTime()) / 86400000;
        if (diff <= 1) {
          streak++;
          expectedDate = new Date(dayDate.getTime() - 86400000);
        } else {
          break;
        }
      }
    }
  }

  // Sort and take top entries
  const sortByCount = (obj: Record<string, number>, limit = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    hoursListened: Math.round(totalHoursListened * 10) / 10,
    sermonsCompleted,
    streak,
    totalSermons: history.length,
    topTopics: sortByCount(topicCounts),
    topBooks: sortByCount(bookCounts),
    topCategories: sortByCount(categoryCounts),
  });
}
