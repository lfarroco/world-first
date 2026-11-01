import { useMemo, useState } from "react";
import {
  CLASS_LABEL,
  LEVEL_CAP,
  condMod,
  formMod,
  healthMod,
  heroPower,
  itemLevel,
  moraleMod,
  powerInRole,
  renewalWage,
  roleById,
  sharpMod,
  transferFee,
  xpToNext,
  type AttrKey,
  type GearSlot,
  type Hero,
  type RoleId,
} from "../../sim";
import { useGameStore } from "../../store/gameStore";
import { heroChecks, heroHistory, roleOptions, statusChips, traitChips } from "../../store/selectors";
import { Chip, ClassIcon, Meter } from "../components/Primitives";
import { ConfirmButton } from "../components/Modal";

const ATTR_LABEL: Record<AttrKey, string> = {
  might: "Might",
  agility: "Agility",
  vitality: "Vitality",
  endurance: "Endurance",
  focus: "Focus",
  discipline: "Discipline",
  awareness: "Awareness",
  composure: "Composure",
};

const BODY: AttrKey[] = ["might", "agility", "vitality", "endurance"];
const SPIRIT: AttrKey[] = ["focus", "discipline", "awareness", "composure"];
const GEAR_LABEL: Record<GearSlot, string> = {
  weapon: "Weapon",
  chest: "Chest",
  helm: "Helm",
  trinket: "Trinket",
};
const GEAR_SLOTS: GearSlot[] = ["weapon", "chest", "helm", "trinket"];

const attrTone = (value: number): string => {
  if (value >= 15) return "good";
  if (value >= 9) return "";
  if (value >= 6) return "warn";
  return "bad";
};

const fitTone = (fit: string): string => {
  if (fit === "natural") return "good";
  if (fit === "trained") return "gold";
  if (fit === "makeshift") return "warn";
  return "bad";
};

const FIT_LABEL: Record<string, string> = {
  natural: "natural",
  trained: "trained",
  makeshift: "makeshift",
  wrong: "wrong class",
};

const AttrColumn = ({ title, keys, hero }: { title: string; keys: AttrKey[]; hero: Hero }) => (
  <div>
    <div className="eyebrow" style={{ marginBottom: 5 }}>
      {title}
    </div>
    {keys.map((key) => (
      <div className="attr-row" key={key}>
        <span className="attr-name">{ATTR_LABEL[key]}</span>
        <span className={`attr-value ${attrTone(hero.attrs[key])}`}>{hero.attrs[key]}</span>
      </div>
    ))}
  </div>
);

export const HeroSheet = ({ heroId, onClose }: { heroId: string; onClose: () => void }) => {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  const selectHero = useGameStore((s) => s.selectHero);
  const hero = game?.roster.find((h) => h.id === heroId);
  const [previewRole, setPreviewRole] = useState<RoleId | null>(null);

  const roles = useMemo(() => (hero ? roleOptions(hero) : []), [hero]);
  const selectedRole = previewRole ?? hero?.role ?? "bulwark";
  const checks = useMemo(() => (hero ? heroChecks(hero, selectedRole) : []), [hero, selectedRole]);
  const currentChecks = useMemo(() => (hero ? heroChecks(hero, hero.role) : []), [hero]);

  if (!game || !hero) return null;

  const team = game.raidTeam ?? [];
  const inTeam = team.includes(hero.id);
  const history = heroHistory(game, hero.id, 10);
  const form = formMod(hero);
  const stamina = Math.round(condMod(hero.fatigue) * 100);
  const sharp = Math.round(sharpMod(hero.sharpness) * 100);
  const morale = Math.round(moraleMod(hero.morale) * 100);
  const health = Math.round(healthMod(hero.health) * 100);
  const roleMeta = roleById(hero.role);
  const expiryItem = game.attention.find(
    (item) =>
      item.heroId === hero.id &&
      (item.kind === "contract-expiring" || item.kind === "contract-counter"),
  );
  const assignment = game.plan.parties.find((p) => p.heroes.includes(hero.id));
  const fatigueLine =
    hero.fatigue < 30
      ? "Fresh. Two more raid nights before fatigue bites."
      : hero.fatigue < 60
        ? "Tired, but the numbers still hold."
        : "Running on empty. Another night is an injury risk.";
  const sharpLine =
    hero.sharpness < 40
      ? "Rusty: rest has cost him sharpness."
      : hero.sharpness < 65
        ? "Reasonably sharp."
        : "Sharp. The raid nights are paying off.";

  const setRole = (role: RoleId): void => {
    setPreviewRole(role);
  };

  const assignRole = (): void => {
    if (!previewRole || previewRole === hero.role) return;
    dispatch({ type: "set-role", heroId: hero.id, role: previewRole });
    setPreviewRole(null);
  };

  const toggleTeam = (): void => {
    if (inTeam) {
      dispatch({ type: "set-raid-team", heroIds: team.filter((id) => id !== hero.id) });
    } else if (team.length < 10) {
      dispatch({ type: "set-raid-team", heroIds: [...team, hero.id] });
    }
  };

  return (
    <>
      <div className="drawer-overlay" onMouseDown={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`${hero.name} sheet`}>
        <div className="drawer-head">
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ paddingTop: 4 }}>
              <ClassIcon klass={hero.klass} label={CLASS_LABEL[hero.klass]} />
            </div>
            <div>
              <h2 className="screen-title" style={{ fontSize: 21 }}>
                {hero.name}
              </h2>
              <div className="small muted">
                Level {hero.level} {CLASS_LABEL[hero.klass]} · {roleMeta.name} ·{" "}
                {hero.level >= LEVEL_CAP ? "max level" : `${hero.xp}/${xpToNext(hero.level)} xp`}
              </div>
              <div className="row-wrap" style={{ marginTop: 6 }}>
                {statusChips(hero).map((chip) => (
                  <Chip key={chip.label} tone={chip.tone as "good" | "warn" | "bad"}>
                    {chip.label}
                  </Chip>
                ))}
                {inTeam ? <Chip tone="gold">★ raid ten</Chip> : null}
                {assignment ? <Chip tone="info">deployed</Chip> : <Chip>resting</Chip>}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close hero sheet">
            ✕
          </button>
        </div>

        <div className="drawer-body">
          <section className="drawer-section" style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
            <div>
              <div className="eyebrow">Power in role</div>
              <div className="hero-power">{Math.round(powerInRole(hero, selectedRole))}</div>
              <div className="small dim">
                {roleById(selectedRole).name} · form {Math.round(form * 100)}% ·{" "}
                {Math.round(heroPower(hero))} at his best role
              </div>
            </div>
            <div className="grow" />
            <div className="small" style={{ textAlign: "right" }}>
              <div className="dim">Gear iLvl</div>
              <div className="mono" style={{ fontSize: 18 }}>
                {itemLevel(hero.gear)}
              </div>
              <div className="dim">Wage {hero.contract.wage}g/wk</div>
            </div>
          </section>

          <section className="drawer-section">
            <div className="spread" style={{ marginBottom: 8 }}>
              <span className="eyebrow">Attributes</span>
              <span className="tiny dim">1–20 · growth is permanent</span>
            </div>
            <div className="attr-grid">
              <AttrColumn title="Body" keys={BODY} hero={hero} />
              <AttrColumn title="Spirit" keys={SPIRIT} hero={hero} />
            </div>
          </section>

          <section className="drawer-section">
            <div className="spread" style={{ marginBottom: 8 }}>
              <span className="eyebrow">Role fit</span>
              <span className="tiny dim">
                {previewRole && previewRole !== hero.role ? "previewing a switch" : "click a role to preview"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 9 }}>
              {roles.map((role) => (
                <button
                  key={role.id}
                  className="role-chip"
                  data-active={role.id === selectedRole}
                  onClick={() => setRole(role.id)}
                  title={role.description}
                >
                  <span className="row" style={{ gap: 5 }}>
                    <span className="role-chip-name">{role.name}</span>
                    <Chip tone={fitTone(role.fit) as "good" | "warn" | "bad" | "gold"}>
                      ×{role.multiplier.toFixed(2)}
                    </Chip>
                  </span>
                  <span className="role-chip-meta">
                    {FIT_LABEL[role.fit]} · {role.id === hero.role ? "current" : role.id === hero.naturalRole ? "natural" : "alt"}
                  </span>
                </button>
              ))}
            </div>
            <div className="check-grid">
              {checks.map((check) => {
                const before = currentChecks.find((c) => c.check === check.check)?.value ?? 0;
                const delta = check.value - before;
                return (
                  <div className="check-cell" key={check.check}>
                    <div className="check-cell-label">{check.label}</div>
                    <div className="check-cell-value">{check.value}</div>
                    {selectedRole !== hero.role && delta !== 0 ? (
                      <div className={`tiny ${delta > 0 ? "good" : "bad"}`}>
                        {delta > 0 ? "+" : ""}
                        {delta} vs {hero.role}
                      </div>
                    ) : (
                      <div className="tiny dim">contribution</div>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedRole !== hero.role ? (
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={assignRole}>
                  Assign {roleById(selectedRole).name}
                </button>
                <span className="tiny dim">Free and instant. Output changes tonight.</span>
              </div>
            ) : null}
          </section>

          <section className="drawer-section">
            <div className="eyebrow" style={{ marginBottom: 7 }}>
              Gear
            </div>
            <div className="gear-grid">
              {GEAR_SLOTS.map((slot) => (
                <div className="gear-cell" key={slot}>
                  <span className="small muted">{GEAR_LABEL[slot]}</span>
                  <span className="mono small">{hero.gear[slot]}</span>
                </div>
              ))}
            </div>
            <div className="tiny dim" style={{ marginTop: 6 }}>
              There is no bag. A clear's drops wait in the loot queue; the next advance takes the default.
            </div>
          </section>

          <section className="drawer-section">
            <div className="eyebrow" style={{ marginBottom: 7 }}>
              Condition
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <div className="spread small">
                <span className="muted">Fatigue</span>
                <span className="mono">{Math.round(hero.fatigue)}</span>
              </div>
              <Meter value={hero.fatigue} tone={hero.fatigue >= 70 ? "bad" : hero.fatigue >= 45 ? "warn" : "good"} />
              <div className="spread small">
                <span className="muted">Sharpness</span>
                <span className="mono">{Math.round(hero.sharpness)}</span>
              </div>
              <Meter value={hero.sharpness} tone={hero.sharpness < 40 ? "bad" : hero.sharpness < 60 ? "warn" : "good"} />
              <div className="spread small">
                <span className="muted">Health</span>
                <span className="mono">{Math.round(hero.health)}</span>
              </div>
              <Meter value={hero.health} tone={hero.health < 70 ? "warn" : "good"} />
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
              Output at {Math.round(form * 100)}%: condition {stamina}% · sharpness {sharp}% · morale{" "}
              {morale}% · health {health}%. {fatigueLine} {sharpLine}
            </p>
          </section>

          <section className="drawer-section">
            <div className="eyebrow" style={{ marginBottom: 7 }}>
              Contract
            </div>
            <dl style={{ margin: 0 }}>
              <div className="kv">
                <dt>Wage</dt>
                <dd>
                  {hero.contract.wage}g/week · {hero.contract.daysLeft} days left
                </dd>
              </div>
              <div className="kv">
                <dt>Squad status</dt>
                <dd style={{ textTransform: "capitalize" }}>{hero.contract.status.replace("-", " ")}</dd>
              </div>
              <div className="kv">
                <dt>Market rate</dt>
                <dd>{renewalWage(hero)}g/week</dd>
              </div>
              <div className="kv">
                <dt>Transfer value</dt>
                <dd>{transferFee(hero)}g</dd>
              </div>
              <div className="kv">
                <dt>Morale</dt>
                <dd>{Math.round(hero.morale)} / 100</dd>
              </div>
            </dl>
            {expiryItem ? (
              <div className="row" style={{ marginTop: 8 }}>
                <Chip tone="warn">In the attention queue</Chip>
                <span className="tiny dim">{expiryItem.title}</span>
              </div>
            ) : (
              <div className="tiny dim" style={{ marginTop: 6 }}>
                A renewal opens in the attention queue inside the last 7 days.
              </div>
            )}
          </section>

          <section className="drawer-section">
            <div className="eyebrow" style={{ marginBottom: 7 }}>
              Traits
            </div>
            <div className="row-wrap">
              {traitChips(hero).length === 0 ? (
                <span className="small dim">No traits.</span>
              ) : (
                traitChips(hero).map((trait) => (
                  <Chip key={trait.id} tone="info" title={trait.text}>
                    {trait.name}
                  </Chip>
                ))
              )}
            </div>
            <div className="tiny dim" style={{ marginTop: 6 }}>
              {traitChips(hero).map((t) => t.text).join(" ")}
            </div>
          </section>

          <section className="drawer-section">
            <div className="spread" style={{ marginBottom: 7 }}>
              <span className="eyebrow">Last 10 days</span>
              <span className="tiny dim">from the event log</span>
            </div>
            <div className="row" style={{ gap: 4 }}>
              {history.map((cell) => (
                <span
                  key={cell.day}
                  className={`chip ${cell.tone === "good" ? "good" : cell.tone === "bad" ? "bad" : ""}`}
                  title={`Day ${cell.day}: ${cell.title || "quiet"}`}
                  style={{ minWidth: 22, justifyContent: "center", padding: "1px 3px" }}
                >
                  {cell.mark}
                </span>
              ))}
            </div>
          </section>
        </div>

        <div className="drawer-foot">
          <button className="btn" onClick={toggleTeam} disabled={!inTeam && team.length >= 10}>
            {inTeam ? "Remove from raid ten" : "Promote to raid ten"}
          </button>
          <span className="grow" />
          <ConfirmButton
            label="Release"
            confirmLabel="Confirm release"
            onConfirm={() => {
              dispatch({ type: "release", heroId: hero.id });
              selectHero(null);
            }}
          >
            Release
          </ConfirmButton>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </>
  );
};
