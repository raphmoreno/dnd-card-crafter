import { Monster } from "@/types/monster";
import { getModifier, formatSpeed, formatSavingThrows, formatSkills } from "@/lib/open5e";

interface StatBlockProps {
  monster: Monster;
}

export function StatBlock({ monster }: StatBlockProps) {
  const savingThrows = formatSavingThrows(monster);
  const skills = formatSkills(monster.skills);

  return (
    <div className="text-[8px] leading-[1.35] text-ink font-body space-y-1 h-full overflow-hidden p-1">
      {/* Name and Type */}
      <div className="border-b-2 border-ink/30 pb-1">
        <h3 className="creature-name text-[11px] leading-tight font-bold">{monster.name}</h3>
        <p className="italic text-[7px] text-ink-light">
          {monster.size} {monster.type}
          {monster.subtype && ` (${monster.subtype})`}, {monster.alignment}
        </p>
      </div>

      {/* Basic Stats */}
      <div className="space-y-0.5 text-[7.5px]">
        <p><span className="font-bold">AC</span> {monster.armor_class} <span className="font-bold ml-2">HP</span> {monster.hit_points}</p>
        <p><span className="font-bold">Speed</span> {formatSpeed(monster.speed)}</p>
      </div>

      {/* Ability Scores - Compact horizontal */}
      <div className="stat-block-divider my-1" />
      <div className="grid grid-cols-6 gap-0.5 text-center py-1">
        {[
          { label: "STR", value: monster.strength },
          { label: "DEX", value: monster.dexterity },
          { label: "CON", value: monster.constitution },
          { label: "INT", value: monster.intelligence },
          { label: "WIS", value: monster.wisdom },
          { label: "CHA", value: monster.charisma },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="stat-label text-[6px] font-bold">{label}</div>
            <div className="stat-value text-[7px]">{value} ({getModifier(value)})</div>
          </div>
        ))}
      </div>
      <div className="stat-block-divider my-1" />

      {/* Secondary Stats */}
      <div className="space-y-0.5 text-[7px]">
        {savingThrows && <p><span className="font-bold">Saves</span> {savingThrows}</p>}
        {skills && <p><span className="font-bold">Skills</span> {skills}</p>}
        {monster.damage_resistances && <p><span className="font-bold">Resist</span> {monster.damage_resistances}</p>}
        {monster.damage_immunities && <p><span className="font-bold">Immune</span> {monster.damage_immunities}</p>}
        {monster.senses && <p><span className="font-bold">Senses</span> {monster.senses}</p>}
        {monster.languages && <p><span className="font-bold">Lang</span> {monster.languages}</p>}
        <p><span className="font-bold">CR</span> {monster.challenge_rating}</p>
      </div>

      {/* Special Abilities */}
      {monster.special_abilities && monster.special_abilities.length > 0 && (
        <>
          <div className="stat-block-divider my-1" />
          <div className="space-y-0.5 text-[7px]">
            {monster.special_abilities.slice(0, 3).map((ability, index) => (
              <p key={index}>
                <span className="ability-name text-[7px] font-bold italic">{ability.name}.</span>{" "}
                {ability.desc.length > 120 ? ability.desc.slice(0, 117) + "..." : ability.desc}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      {monster.actions && monster.actions.length > 0 && (
        <>
          <div className="section-header mt-1 text-[8px] py-0.5">Actions</div>
          <div className="space-y-0.5 text-[7px]">
            {monster.actions.slice(0, 3).map((action, index) => (
              <p key={index}>
                <span className="ability-name text-[7px] font-bold italic">{action.name}.</span>{" "}
                {action.desc.length > 120 ? action.desc.slice(0, 117) + "..." : action.desc}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
