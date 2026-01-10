import { forwardRef } from "react";
import { Monster } from "@/types/monster";
import { MonsterCard } from "./MonsterCard";

interface PrintPreviewProps {
  monsters: Monster[];
}

export const PrintPreview = forwardRef<HTMLDivElement, PrintPreviewProps>(
  ({ monsters }, ref) => {
    // Split monsters into pages of 4 (horizontal layout on landscape A4)
    const pages: Monster[][] = [];
    for (let i = 0; i < monsters.length; i += 4) {
      pages.push(monsters.slice(i, i + 4));
    }

    if (pages.length === 0) {
      pages.push([]);
    }

    return (
      <div ref={ref} className="print-container">
        {pages.map((pageMonsters, pageIndex) => (
          <div
            key={pageIndex}
            className="bg-white flex items-center justify-center gap-1"
            style={{
              width: "297mm",  // A4 landscape width
              height: "210mm", // A4 landscape height
              padding: "2mm",
              pageBreakAfter: pageIndex < pages.length - 1 ? "always" : "auto",
            }}
          >
            {/* 4 cards in horizontal row */}
            {pageMonsters.map((monster) => (
              <MonsterCard key={monster.slug} monster={monster} forPrint />
            ))}
            {/* Fill empty slots with placeholder */}
            {Array.from({ length: 4 - pageMonsters.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center"
                style={{ width: "72mm", height: "200mm" }}
              >
                <span className="text-gray-300 text-xs">Empty</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
);

PrintPreview.displayName = "PrintPreview";
