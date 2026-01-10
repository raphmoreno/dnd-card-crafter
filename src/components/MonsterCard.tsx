import { Monster } from "@/types/monster";
import { StatBlock } from "./StatBlock";

interface MonsterCardProps {
  monster: Monster;
}

export function MonsterCard({ monster }: MonsterCardProps) {
  return (
    <div 
      className="mtg-card-border rounded-lg p-[6px] flex flex-col"
      style={{ width: "170px", height: "260px" }}
    >
      {/* Image section (upside down for tent fold) */}
      <div className="card-inner-frame rounded-t flex-shrink-0 h-[90px] overflow-hidden upside-down">
        <div className="w-full h-full bg-gradient-to-br from-parchment-dark to-parchment flex items-center justify-center">
          <div className="text-center p-2">
            <div className="text-[8px] font-display font-semibold text-ink mb-1 upside-down">
              {monster.name}
            </div>
            <div className="w-12 h-12 mx-auto bg-ink/10 rounded flex items-center justify-center upside-down">
              <svg 
                className="w-8 h-8 text-ink/30" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </div>
            <div className="text-[5px] text-ink/50 mt-1 upside-down">
              {monster.type} • CR {monster.challenge_rating}
            </div>
          </div>
        </div>
      </div>

      {/* Type bar (like MTG type line) */}
      <div className="bg-parchment-dark border-x border-b border-ink/20 px-1 py-0.5 flex-shrink-0">
        <p className="text-[5px] font-display text-ink/70 text-center truncate">
          {monster.size} {monster.type}{monster.subtype && ` — ${monster.subtype}`}
        </p>
      </div>

      {/* Stat block section */}
      <div className="card-inner-frame rounded-b flex-1 overflow-hidden px-1.5 py-1">
        <StatBlock monster={monster} />
      </div>
    </div>
  );
}
