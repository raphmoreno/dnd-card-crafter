import { forwardRef } from "react";
import { Monster } from "@/types/monster";
import { MonsterCard } from "./MonsterCard";

interface PrintPreviewProps {
  monsters: Monster[];
}

export const PrintPreview = forwardRef<HTMLDivElement, PrintPreviewProps>(
  ({ monsters }, ref) => {
    // Split monsters into pages of 4
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
            className="bg-white p-4"
            style={{
              width: "210mm",
              height: "297mm",
              pageBreakAfter: pageIndex < pages.length - 1 ? "always" : "auto",
            }}
          >
            <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full place-items-center">
              {pageMonsters.map((monster) => (
                <MonsterCard key={monster.slug} monster={monster} />
              ))}
              {/* Fill empty slots with placeholder */}
              {Array.from({ length: 4 - pageMonsters.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center"
                  style={{ width: "170px", height: "260px" }}
                >
                  <span className="text-gray-300 text-sm">Empty slot</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

PrintPreview.displayName = "PrintPreview";
