"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ItemList } from "@/components/ItemList";
import { ItemDetail } from "@/components/ItemDetail";
import { InputBar } from "@/components/InputBar";
import { ConvexProvider } from "@/components/ConvexProvider";
import { Id } from "../../convex/_generated/dataModel";

function App() {
  const [selectedId, setSelectedId] = useState<Id<"items"> | null>(null);
  const items = useQuery(api.items.list);
  const selectedItem = items?.find((i) => i._id === selectedId);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="px-6 pt-6 pb-2">
        <h1 className="text-xl font-semibold text-stone-800 tracking-tight">
          Done.
        </h1>
      </header>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {selectedId ? (
          <>
            {/* Sidebar list when detail is open */}
            <div className="w-80 flex flex-col border-r border-sage-100 flex-shrink-0">
              <ItemList selectedId={selectedId} onSelect={setSelectedId} />
            </div>
            {/* Detail panel */}
            <div className="flex-1 flex flex-col min-w-0">
              <ItemDetail
                itemId={selectedId}
                onClose={() => setSelectedId(null)}
              />
            </div>
          </>
        ) : (
          /* Centered list when nothing selected */
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-lg">
              <ItemList selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <InputBar
        selectedItemId={selectedId}
        selectedItemStatus={selectedItem?.status ?? null}
        onItemCreated={(id) => setSelectedId(id)}
      />
    </div>
  );
}

export default function Page() {
  return (
    <ConvexProvider>
      <App />
    </ConvexProvider>
  );
}
