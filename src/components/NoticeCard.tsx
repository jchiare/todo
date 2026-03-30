"use client";

type Notice = {
  label: string;
  value: string;
};

export function NoticeCard({ notices }: { notices: Notice[] }) {
  if (notices.length === 0) return null;

  return (
    <div className="border-l-2 border-sage-200 pl-4 py-1 space-y-3">
      {notices.map((notice, i) => (
        <div key={i}>
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
            {notice.label}
          </p>
          <p className="text-[13px] text-stone-600 leading-snug mt-0.5">
            {notice.value}
          </p>
        </div>
      ))}
    </div>
  );
}
