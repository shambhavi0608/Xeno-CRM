import React from 'react';

export function Customer360Skeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left w-full animate-pulse p-1">
      {/* LEFT COLUMN SKELETON */}
      <div className="lg:col-span-5 space-y-5">
        {/* Profile Card Skeleton */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-5">
          <div className="flex gap-4">
            <div className="w-14 h-14 bg-stone-900 rounded-full" />
            <div className="flex-1 space-y-2 mt-1">
              <div className="h-4 bg-stone-900 rounded w-2/3" />
              <div className="h-3 bg-stone-900 rounded w-1/2" />
            </div>
          </div>
          <div className="border-t border-white/5 pt-4 space-y-3">
            <div className="h-3 bg-stone-900 rounded w-5/6" />
            <div className="h-3 bg-stone-900 rounded w-11/12" />
            <div className="h-3 bg-stone-900 rounded w-3/4" />
          </div>
        </div>

        {/* Revenue Card Skeleton */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="flex justify-between">
            <div className="space-y-2 w-1/3">
              <div className="h-3 bg-stone-900 rounded w-1/2" />
              <div className="h-5 bg-stone-900 rounded" />
            </div>
            <div className="space-y-2 w-1/4">
              <div className="h-3 bg-stone-900 rounded w-2/3" />
              <div className="h-4 bg-stone-900 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#18181b]/30 p-4 rounded-xl space-y-2">
              <div className="h-2 bg-stone-900 rounded w-3/4" />
              <div className="h-4 bg-stone-900 rounded w-1/2" />
            </div>
            <div className="bg-[#18181b]/30 p-4 rounded-xl space-y-2">
              <div className="h-2 bg-stone-900 rounded w-3/4" />
              <div className="h-4 bg-stone-900 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-stone-900 rounded w-1/4" />
            <div className="h-[120px] bg-stone-900 rounded-lg" />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN SKELETON */}
      <div className="lg:col-span-7 space-y-5">
        {/* Health Card Skeleton */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <div className="h-4 bg-stone-900 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 mt-5">
            <div className="sm:col-span-5 flex justify-center py-4">
              <div className="w-24 h-24 rounded-full border-4 border-stone-900/50" />
            </div>
            <div className="sm:col-span-7 space-y-4 pt-1">
              <div className="space-y-2">
                <div className="h-3 bg-stone-900 rounded w-1/2" />
                <div className="h-2 bg-stone-900 rounded" />
              </div>
              <div className="h-6 bg-stone-900 rounded w-1/3" />
            </div>
          </div>
        </div>

        {/* AI Insight Card Skeleton */}
        <div className="bg-gradient-to-b from-[#1c1815]/30 to-[#120f0c]/20 border border-amber-900/15 rounded-2xl p-6 space-y-4">
          <div className="h-5 bg-stone-900 rounded w-1/4" />
          <div className="space-y-3.5">
            <div className="space-y-2">
              <div className="h-2.5 bg-stone-900 rounded w-1/5" />
              <div className="h-3 bg-stone-900 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-2.5 bg-stone-900 rounded w-1/4" />
              <div className="h-3 bg-stone-900 rounded w-11/12" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
              <div className="h-14 bg-stone-900/40 rounded-xl" />
              <div className="h-14 bg-stone-900/40 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Activity Timeline Skeleton */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="h-4 bg-stone-900 rounded w-1/3" />
          <div className="space-y-4 pt-2">
            <div className="flex gap-4">
              <div className="w-3.5 h-3.5 bg-stone-900 rounded-full mt-1 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-stone-900 rounded w-1/3" />
                <div className="h-3 bg-stone-900 rounded w-3/4" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-3.5 h-3.5 bg-stone-900 rounded-full mt-1 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-stone-900 rounded w-1/4" />
                <div className="h-3 bg-stone-900 rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
