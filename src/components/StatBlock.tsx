import { Monster } from "@/types/monster";
import { getModifier, formatSpeed, formatSavingThrows, formatSkills } from "@/lib/open5e";

interface StatBlockProps {
  monster: Monster;
}

export function StatBlock({ monster }: StatBlockProps) {
  const savingThrows = formatSavingThrows(monster);
  const skills = formatSkills(monster.skills);

  return (
    <div className="text-[6px] leading-tight text-ink font-body space-y-1">
      {/* Name and Type */}
      <div className="border-b border-ink/20 pb-1">
        <h3 className="creature-name text-[9px] leading-none">{monster.name}</h3>
        <p className="italic text-[5px] text-ink-light">
          {monster.size} {monster.type}
          {monster.subtype && ` (${monster.subtype})`}, {monster.alignment}
        </p>
      </div>

      {/* Basic Stats */}
      <div className="stat-block-divider my-1" />
      <div className="space-y-0.5">
        <p><span className="font-semibold">Armor Class</span> {monster.armor_class}{monster.armor_desc && ` (${monster.armor_desc})`}</p>
        <p><span className="font-semibold">Hit Points</span> {monster.hit_points} ({monster.hit_dice})</p>
        <p><span className="font-semibold">Speed</span> {formatSpeed(monster.speed)}</p>
      </div>

      {/* Ability Scores */}
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
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value} ({getModifier(value)})</div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="stat-block-divider my-1" />
      <div className="space-y-0.5">
        {savingThrows && <p><span className="font-semibold">Saving Throws</span> {savingThrows}</p>}
        {skills && <p><span className="font-semibold">Skills</span> {skills}</p>}
        {monster.damage_vulnerabilities && <p><span className="font-semibold">Vulnerabilities</span> {monster.damage_vulnerabilities}</p>}
        {monster.damage_resistances && <p><span className="font-semibold">Resistances</span> {monster.damage_resistances}</p>}
        {monster.damage_immunities && <p><span className="font-semibold">Immunities</span> {monster.damage_immunities}</p>}
        {monster.condition_immunities && <p><span className="font-semibold">Condition Immunities</span> {monster.condition_immunities}</p>}
        {monster.senses && <p><span className="font-semibold">Senses</span> {monster.senses}</p>}
        {monster.languages && <p><span className="font-semibold">Languages</span> {monster.languages}</p>}
        <p><span className="font-semibold">Challenge</span> {monster.challenge_rating}</p>
      </div>

      {/* Special Abilities */}
      {monster.special_abilities && monster.special_abilities.length > 0 && (
        <>
          <div className="stat-block-divider my-1" />
          <div className="space-y-0.5">
            {monster.special_abilities.slice(0, 2).map((ability, index) => (
              <p key={index}>
                <span className="ability-name">{ability.name}.</span>{" "}
                {ability.desc.length > 120 ? ability.desc.slice(0, 117) + "..." : ability.desc}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      {monster.actions && monster.actions.length > 0 && (
        <>
          <div className="section-header mt-1">Actions</div>
          <div className="space-y-0.5">
            {monster.actions.slice(0, 3).map((action, index) => (
              <p key={index}>
                <span className="ability-name">{action.name}.</span>{" "}
                {action.desc.length > 100 ? action.desc.slice(0, 97) + "..." : action.desc}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Reactions */}
      {monster.reactions && monster.reactions.length > 0 && (
        <>
          <div className="section-header mt-1">Reactions</div>
          <div className="space-y-0.5">
            {monster.reactions.slice(0, 1).map((reaction, index) => (
              <p key={index}>
                <span className="ability-name">{reaction.name}.</span>{" "}
                {reaction.desc.length > 80 ? reaction.desc.slice(0, 77) + "..." : reaction.desc}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
