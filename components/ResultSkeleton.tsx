export default function ResultSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-surface border border-border rounded-2xl p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-xl bg-border flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-border rounded w-3/4" />
              <div className="h-3 bg-border rounded w-1/2" />
              <div className="h-3 bg-border rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
