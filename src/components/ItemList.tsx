"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ItemCard } from "./ItemCard";
import { Id } from "../../convex/_generated/dataModel";

export function ItemList({
  selectedId,
  onSelect,
}: {
  selectedId: Id<"items"> | null;
  onSelect: (id: Id<"items"> | null) => void;
}) {
  const items = useQuery(api.items.list);

  if (!items) return null;

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-stone-400 text-center text-[15px] leading-relaxed">
          What would you like to get done today?
        </p>
      </div>
    );
  }

  const active = items.filter((i) => i.status !== "done");
  const done = items.filter((i) => i.status === "done");

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {active.map((item) => (
        <ItemCard
          key={item._id}
          item={item}
          selected={selectedId === item._id}
          onClick={() =>
            onSelect(selectedId === item._id ? null : item._id)
          }
          onDeleted={() => {
            if (selectedId === item._id) onSelect(null);
          }}
        />
      ))}
      {done.length > 0 && (
        <>
          <div className="px-5 pt-6 pb-2">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
              Completed
            </p>
          </div>
          {done.map((item) => (
            <ItemCard
              key={item._id}
              item={item}
              selected={selectedId === item._id}
              onClick={() =>
                onSelect(selectedId === item._id ? null : item._id)
              }
              onDeleted={() => {
                if (selectedId === item._id) onSelect(null);
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
