"use client";

import { useState } from "react";

interface Result {
  url: string;
  thumbUrl: string;
}

export default function ImageSearch({ onAdd }: { onAdd: (urls: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setSelected(new Set());
    try {
      const res = await fetch(`/api/image-search?q=${encodeURIComponent(query.trim())}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Search failed");
      setResults(body.results);
      if (body.results.length === 0) setError("No results — try a different search.");
    } catch {
      setError("Search failed — try again.");
      setResults(null);
    }
    setSearching(false);
  }

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function addSelected() {
    onAdd([...selected]);
    setSelected(new Set());
    setResults(null);
    setQuery("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm text-blue-600 dark:text-blue-400 underline"
      >
        Or search free stock photos (Wikimedia Commons)
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15 p-3 flex flex-col gap-3">
      {/* Not a <form> — this whole component nests inside the challenge
          form on /create, and HTML doesn't allow a form within a form. */}
      <div className="flex gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="e.g. paperclip"
          className="flex-1 rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {searching ? "Searching…" : "Search"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setResults(null);
            setError(null);
          }}
          className="text-sm text-black/40 dark:text-white px-2"
        >
          Cancel
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {results && results.length > 0 && (
        <>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {results.map((r) => {
              const isSelected = selected.has(r.url);
              return (
                <button
                  type="button"
                  key={r.url}
                  onClick={() => toggle(r.url)}
                  className={`relative aspect-square rounded-md overflow-hidden border-2 transition ${
                    isSelected ? "border-blue-500" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.thumbUrl} alt="" className="h-full w-full object-cover" />
                  {isSelected && (
                    <span className="absolute inset-0 bg-blue-500/30 flex items-center justify-center text-white font-bold">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addSelected}
            disabled={selected.size === 0}
            className="self-start rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add {selected.size || ""} selected
          </button>
        </>
      )}
    </div>
  );
}
