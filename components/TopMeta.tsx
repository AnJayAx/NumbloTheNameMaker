import Clock from "@/components/Clock";

/** Fixed top meta row: viewport-centered clock with the quota beside it. */
export default function TopMeta({ namesLeft }: { namesLeft?: number }) {
  return (
    <div className="fixed inset-x-0 top-0 z-30 flex justify-center px-5 py-4">
      <div className="flex items-center gap-3">
        <Clock />
        {typeof namesLeft === "number" && (
          <>
            <span className="text-white/20">·</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e]" />
              {namesLeft} free {namesLeft === 1 ? "name" : "names"} left today
            </span>
          </>
        )}
      </div>
    </div>
  );
}
