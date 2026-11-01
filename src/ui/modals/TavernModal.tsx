import {
  CLASS_LABEL,
  heroPower,
  itemLevel,
  roleById,
  rosterCapFor,
  traitById,
  type Candidate,
} from "../../sim";
import { useGameStore } from "../../store/gameStore";
import { Modal } from "../components/Modal";
import { Chip, ClassIcon } from "../components/Primitives";

const ATTRS = [
  "might",
  "agility",
  "vitality",
  "endurance",
  "focus",
  "discipline",
  "awareness",
  "composure",
] as const;

const CandidateCard = ({ candidate }: { candidate: Candidate }) => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  const closeModal = useGameStore((s) => s.closeModal);
  if (!game) return null;
  const hero = candidate.hero;
  const cap = rosterCapFor(game.facilities);
  const full = game.roster.length >= cap;
  const poor = game.gold < candidate.fee || game.gold < 0;
  const disabled = full || poor;

  return (
    <div className="panel-2" style={{ padding: 12, marginTop: 10 }}>
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <div className="row" style={{ alignItems: "flex-start", gap: 9 }}>
          <ClassIcon klass={hero.klass} label={CLASS_LABEL[hero.klass]} />
          <div>
            <div className="row" style={{ gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{hero.name}</span>
              <span className="tiny dim">
                {CLASS_LABEL[hero.klass]} · {roleById(hero.role).name} · level {hero.level}
              </span>
            </div>
            <div className="row-wrap" style={{ marginTop: 4 }}>
              <Chip>power {Math.round(heroPower(hero))}</Chip>
              <Chip>iLvl {itemLevel(hero.gear)}</Chip>
              <Chip>wage {hero.contract.wage}g/wk</Chip>
              <Chip tone="warn">fee {candidate.fee}g</Chip>
              <Chip title="Scouting is not built. Potential stays hidden.">potential ████</Chip>
            </div>
          </div>
        </div>
        <div className="stack" style={{ alignItems: "flex-end", gap: 5 }}>
          <button
            className="btn btn-primary btn-sm"
            disabled={disabled}
            onClick={() => {
              const ok = dispatch({ type: "hire", heroId: hero.id });
              if (ok) closeModal();
            }}
            title={full ? `Roster full (${cap})` : poor ? `Need ${candidate.fee}g` : "Sign at the listed fee"}
          >
            {full ? "Roster full" : poor ? `Need ${candidate.fee}g` : "Sign"}
          </button>
          <span className="tiny dim">signs at the fee, rotation status</span>
        </div>
      </div>

      <div className="attr-grid" style={{ marginTop: 9, gridTemplateColumns: "repeat(4, 1fr)" }}>
        {ATTRS.map((key) => (
          <div className="attr-row" key={key} style={{ gap: 4 }}>
            <span className="attr-name">{key.slice(0, 3).toUpperCase()}</span>
            <span className="attr-value">{hero.attrs[key]}</span>
          </div>
        ))}
      </div>

      {hero.traits.length > 0 ? (
        <div className="row-wrap" style={{ marginTop: 8 }}>
          {hero.traits.map((id) => {
            const trait = traitById(id);
            return (
              <Chip key={id} tone="info" title={trait.text}>
                {trait.name}
              </Chip>
            );
          })}
        </div>
      ) : null}
      <div className="tiny dim" style={{ marginTop: 6 }}>
        {hero.traits.map((id) => traitById(id).text).join(" ") || "No traits."} Attributes and traits are known. Potential is not scouted.
      </div>
    </div>
  );
};

export const TavernModal = ({ onClose }: { onClose: () => void }) => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const nextFaces = Math.ceil(game.day / 7) * 7 + 1;
  const cap = rosterCapFor(game.facilities);

  return (
    <Modal
      title="The tavern"
      subtitle={`Three faces, changed at the day-7 reset · next new faces day ${nextFaces} · roster ${game.roster.length}/${cap}`}
      onClose={onClose}
      wide
      footer={
        <>
          <span className="tiny dim grow">
            A signing is immediate and costs the fee. Wages are paid every seventh day.
          </span>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      {game.tavern.length === 0 ? (
        <div className="empty">No candidates. New faces arrive after the next reset.</div>
      ) : (
        game.tavern.map((candidate) => <CandidateCard key={candidate.hero.id} candidate={candidate} />)
      )}
      <hr className="sep" />
      <div className="small muted">
        A signing is immediate and costs the fee. Wage, length and squad status are fixed. Wages are paid every seventh day.
      </div>
    </Modal>
  );
};
