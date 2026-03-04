import { Clock } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';

export default function ActivityFeed() {
  const activities = useAppSelector((state) => state.activity.items);

  if (activities.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium mb-1">No activity yet</p>
        <p className="text-xs text-muted-foreground">Actions will appear here as they happen.</p>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">
        Recent Activity
      </h3>
      <div className="relative pl-5">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-4">
          {activities.map((entry, i) => (
            <div key={entry.id} className="relative flex gap-3">
              {/* Dot */}
              <div className={`absolute -left-5 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background ${
                i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
              }`} />

              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{entry.description}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(entry.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' '}
                  {new Date(entry.timestamp).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
