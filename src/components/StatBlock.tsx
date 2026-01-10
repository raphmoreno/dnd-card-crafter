import { Monster } from "@/types/monster";
import { getModifier, formatSpeed, formatSavingThrows, formatSkills } from "@/lib/open5e";

interface StatBlockProps {
  monster: Monster;
}

export function StatBlock({ monster }: StatBlockProps) {
  const savingThrows = formatSavingThrows(monster);
  const skills = formatSkills(monster.skills);

  return (
    <div className="text-[5px] leading-[1.3] text-ink font-body space-y-0.5 h-full overflow-hidden">
      {/* Name and Type */}
      <div className="border-b border-ink/20 pb-0.5">
        <h3 className="creature-name text-[7px] leading-none">{monster.name}</h3>
        <p className="italic text-[4px] text-ink-light">
          {monster.size} {monster.type}
          {monster.subtype && ` (${monster.subtype})`}, {monster.alignment}
        </p>
      </div>

      {/* Basic Stats */}
      <div className="space-y-0">
        <p><span className="font-semibold">AC</span> {monster.armor_class} <span className="font-semibold ml-1">HP</span> {monster.hit_points}</p>
        <p><span className="font-semibold">Speed</span> {formatSpeed(monster.speed)}</p>
      </div>

      {/* Ability Scores - Compact horizontal */}
      <div className="stat-block-divider my-0.5" />
      <div className="grid grid-cols-6 gap-0 text-center py-0.5">
        {[
          { label: "STR", value: monster.strength },
          { label: "DEX", value: monster.dexterity },
          { label: "CON", value: monster.constitution },
          { label: "INT", value: monster.intelligence },
          { label: "WIS", value: monster.wisdom },
          { label: "CHA", value: monster.charisma },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="stat-label text-[4px]">{label}</div>
            <div className="stat-value text-[5px]">{value} ({getModifier(value)})</div>
          </div>
        ))}
      </div>
      <div className="stat-block-divider my-0.5" />

      {/* Secondary Stats - Very compact */}
      <div className="space-y-0">
        {savingThrows && <p><span className="font-semibold">Saves</span> {savingThrows}</p>}
        {skills && <p><span className="font-semibold">Skills</span> {skills}</p>}
        {monster.damage_resistances && <p><span className="font-semibold">Resist</span> {monster.damage_resistances}</p>}
        {monster.damage_immunities && <p><span className="font-semibold">Immune</span> {monster.damage_immunities}</p>}
        {monster.senses && <p><span className="font-semibold">Senses</span> {monster.senses}</p>}
        {monster.languages && <p><span className="font-semibold">Lang</span> {monster.languages}</p>}
        <p><span className="font-semibold">CR</span> {monster.challenge_rating}</p>
      </div>

      {/* Special Abilities */}
      {monster.special_abilities && monster.special_abilities.length > 0 && (
        <>
          <div className="stat-block-divider my-0.5" />
          <div className="space-y-0">
            {monster.special_abilities.slice(0, 2).map((ability, index) => (
              <p key={index}>
                <span className="ability-name text-[4.5px]">{ability.name}.</span>{" "}
                {ability.desc.length > 80 ? ability.desc.slice(0, 77) + "..." : ability.desc}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      {monster.actions && monster.actions.length > 0 && (
        <>
          <div className="section-header mt-0.5 text-[5px] py-0">Actions</div>
          <div className="space-y-0">
            {monster.actions.slice(0, 2).map((action, index) => (
              <p key={index}>
                <span className="ability-name text-[4.5px]">{action.name}.</span>{" "}
                {action.desc.length > 70 ? action.desc.slice(0, 67) + "..." : action.desc}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
