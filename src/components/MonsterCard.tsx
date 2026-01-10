import { Monster } from "@/types/monster";
import { StatBlock } from "./StatBlock";

interface MonsterCardProps {
  monster: Monster;
  forPrint?: boolean;
}

export function MonsterCard({ monster, forPrint = false }: MonsterCardProps) {
  // For print: width ~47mm (fits 4 on A4 landscape with margins), height ~140mm (1:3 aspect for fold)
  // For preview: scaled down version
  const cardStyle = forPrint 
    ? { width: "47mm", height: "140mm" }
    : { width: "120px", height: "360px" };

  return (
    <div 
      className="mtg-card-border rounded-lg p-[4px] flex flex-col"
      style={cardStyle}
    >
      {/* TOP HALF: Image section (upside down for tent fold - players see this) */}
      <div className="card-inner-frame rounded-t flex-1 overflow-hidden upside-down">
        <div className="w-full h-full bg-gradient-to-br from-parchment-dark to-parchment flex flex-col items-center justify-center p-2">
          {/* Content is already upside-down from parent, so we flip it back for correct display when folded */}
          <div className="text-center upside-down w-full h-full flex flex-col items-center justify-center">
            <div className="text-[10px] font-display font-semibold text-ink mb-2 leading-tight">
              {monster.name}
            </div>
            <div className="w-16 h-16 mx-auto bg-ink/10 rounded-lg flex items-center justify-center mb-2">
              <svg 
                className="w-10 h-10 text-ink/40" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </div>
            <div className="text-[7px] text-ink/60 italic">
              {monster.size} {monster.type}
            </div>
            <div className="text-[6px] text-ink/50 mt-1">
              CR {monster.challenge_rating}
            </div>
          </div>
        </div>
      </div>

      {/* Fold line indicator */}
      <div className="h-[2px] bg-ink/20 flex-shrink-0 relative">
        <div className="absolute inset-0 border-t border-dashed border-ink/30" />
      </div>

      {/* BOTTOM HALF: Stat block section (GM sees this) */}
      <div className="card-inner-frame rounded-b flex-1 overflow-hidden px-1.5 py-1">
        <StatBlock monster={monster} />
      </div>
    </div>
  );
}
