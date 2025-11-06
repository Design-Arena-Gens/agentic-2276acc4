"use client";

import { useRef, useState } from "react";
import clsx from "clsx";

type SwipeableRowProps = {
  id: string;
  onDelete: (id: string) => void;
  children: React.ReactNode;
};

const MAX_TRANSLATION = 140;

export function SwipeableRow({ id, onDelete, children }: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const [translation, setTranslation] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const close = () => {
    setTranslation(0);
    setIsOpen(false);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    startX.current = event.clientX;
    containerRef.current.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const delta = event.clientX - startX.current;
    if (delta < 0) {
      const clamped = Math.max(delta, -MAX_TRANSLATION);
      setTranslation(clamped);
    } else if (!isOpen) {
      setTranslation(0);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    if (!containerRef.current) return;
    containerRef.current.releasePointerCapture(event.pointerId);
    if (translation < -80) {
      setTranslation(-MAX_TRANSLATION);
      setIsOpen(true);
    } else {
      close();
    }
    startX.current = null;
  };

  const handleDelete = () => {
    onDelete(id);
    close();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleDelete}
        className={clsx(
          "absolute right-3 top-1/2 z-10 flex h-10 -translate-y-1/2 items-center justify-center rounded-full bg-red-500 px-5 text-sm font-semibold text-white shadow-lg transition-all dark:bg-red-600",
          isOpen ? "opacity-100" : "opacity-0",
        )}
        aria-label="Delete"
      >
        Delete
      </button>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-colors dark:bg-surface-dark dark:ring-slate-700">
        <div
          ref={containerRef}
          style={{ transform: `translate3d(${translation}px, 0, 0)` }}
          className={clsx(
            "touch-pan-y transition-transform duration-200 ease-out",
            isOpen && "translate-x-[-140px]",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
