import { useMemo, useState } from "react";
import {
  CLASS_IDS,
  CLASS_LABEL,
  averageItemLevel,
  fitFor,
  formMod,
  heroPower,
  itemLevel,
  roleById,
  rosterCapFor,
  squadRating,
  wageBill,
  wageBudgetFor,
  type Hero,
} from "../../sim";
import { useGameStore } from "../../store/gameStore";
import {
  HERO_VIEWS,
  filterHeroes,
  heroHistory,
  statusChips,
  type HeroView,
} from "../../store/selectors";
import { Chip, Meter } from "../components/Primitives";
import { Portrait } from "../components/Portrait";

type SortKey = "name" | "level" | "power" | "ilvl" | "fatigue" | "sharpness" | "morale" | "wage" | "contract";

const SORT_COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "level", label: "Lvl", numeric: true },
  { key: "power", label: "Power", numeric: true },
  { key: "ilvl", label: "iLvl", numeric: true },
  { key: "fatigue", label: "Fatigue", numeric: true },
  { key: "sharpness", label: "Sharpness", numeric: true },
  { key: "morale", label: "Morale", numeric: true },
  { key: "wage", label: "Wage", numeric: true },
  { key: "contract", label: "Contract", numeric: true },
];

const valueFor = (hero: Hero, key: SortKey): number | string => {
  switch (key) {
    case "name":
      return hero.name;
    case "level":
      return hero.level;
    case "power":
      return heroPower(hero);
    case "ilvl":
      return itemLevel(hero.gear);
    case "fatigue":
      return hero.fatigue;
    case "sharpness":
      return hero.sharpness;
    case "morale":
      return hero.morale;
    case "wage":
      return hero.contract.wage;
    case "contract":
      return hero.contract.daysLeft;
  }
};

const SortHead = ({
  column,
  sort,
  dir,
  onSort,
  className,
}: {
  column: { key: SortKey; label: string; numeric: boolean };
  sort: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) => (
  <th
    className={`sortable ${column.numeric ? "num" : ""} ${className ?? ""}`}
    onClick={() => onSort(column.key)}
    aria-sort={sort === column.key ? (dir === "asc" ? "ascending" : "descending") : "none"}
  >
    {column.label}
    {sort === column.key ? <span className="dim"> {dir === "asc" ? "▲" : "▼"}</span> : null}
  </th>
);

const HeroRow = ({ hero }: { hero: Hero }) => {
  const game = useGameStore((s) => s.game);
  const selected = useGameStore((s) => s.drawerHeroId);
  const selectHero = useGameStore((s) => s.selectHero);
  if (!game) return null;
  const chips = statusChips(hero).slice(0, 2);
  const fit = fitFor(hero, hero.role);
  const team = (game.raidTeam ?? []).includes(hero.id);
  const history = heroHistory(game, hero.id, 5);
  const assignment = game.plan.parties.find((p) => p.heroes.includes(hero.id));
  const fatigueTone = hero.fatigue >= 70 ? "bad" : hero.fatigue >= 45 ? "warn" : "good";
  const sharpTone = hero.sharpness < 40 ? "bad" : hero.sharpness < 60 ? "warn" : "good";
  const moraleTone = hero.morale < 40 ? "bad" : hero.morale < 60 ? "warn" : "good";

  return (
    <tr
      data-clickable="true"
      data-selected={selected === hero.id}
      onClick={() => selectHero(hero.id)}
      title="Open the hero sheet"
    >
      <td>
        <div className="hero-cell">
          <Portrait role={hero.naturalRole} klass={hero.klass} name={hero.name} size={26} />
          <span style={{ fontWeight: 600 }}>{team ? "★ " : ""}{hero.name}</span>
          {chips.map((chip) => (
            <Chip key={chip.label} tone={chip.tone as "good" | "warn" | "bad"}>
              {chip.label}
            </Chip>
          ))}
        </div>
      </td>
      <td>
        <span className="muted">{CLASS_LABEL[hero.klass]}</span>
        <span className="dim"> · </span>
        <span>{roleById(hero.role).name}</span>
        {fit.fit !== "natural" ? (
          <span className={`tiny ${fit.fit === "wrong" ? "bad" : "warn"}`}> ×{fit.multiplier.toFixed(2)}</span>
        ) : null}
        {assignment ? <span className="tiny dim"> · in party</span> : null}
      </td>
      <td className="num">{hero.level}</td>
      <td className="num">
        <span>{Math.round(heroPower(hero))}</span>
        <span className="tiny dim"> · form {Math.round(formMod(hero) * 100)}%</span>
      </td>
      <td className="num dim col-optional" title="Potential is hidden until a scouting system exists">
        ████
      </td>
      <td className="num">{itemLevel(hero.gear)}</td>
      <td>
        <Meter value={hero.fatigue} tone={fatigueTone} label={String(Math.round(hero.fatigue))} />
      </td>
      <td>
        <Meter value={hero.sharpness} tone={sharpTone} label={String(Math.round(hero.sharpness))} />
      </td>
      <td>
        <Meter value={hero.morale} tone={moraleTone} label={String(Math.round(hero.morale))} />
      </td>
      <td className="num">{hero.contract.wage}g</td>
      <td className="num">
        <span className={hero.contract.daysLeft <= 7 ? "warn" : ""}>{hero.contract.daysLeft}d</span>
      </td>
      <td className="col-optional">
        <span className="row" style={{ gap: 2 }}>
          {history.map((cell) => (
            <span
              key={cell.day}
              className={cell.tone === "good" ? "good" : cell.tone === "bad" ? "bad" : "dim"}
              title={`Day ${cell.day}: ${cell.title || "quiet"}`}
            >
              {cell.mark}
            </span>
          ))}
        </span>
      </td>
    </tr>
  );
};

export const RosterScreen = () => {
  const game = useGameStore((s) => s.game);
  const openModal = useGameStore((s) => s.openModal);
  const selectHero = useGameStore((s) => s.selectHero);
  const [view, setView] = useState<HeroView>("all");
  const [query, setQuery] = useState("");
  const [klass, setKlass] = useState("all");
  const [group, setGroup] = useState(true);
  const [sort, setSort] = useState<SortKey>("power");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const heroes = useMemo(() => {
    if (!game) return [];
    let list = filterHeroes(game, game.roster, view);
    if (klass !== "all") list = list.filter((h) => h.klass === klass);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          CLASS_LABEL[h.klass].toLowerCase().includes(q) ||
          roleById(h.role).name.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const av = valueFor(a, sort);
      const bv = valueFor(b, sort);
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);
      return dir === "asc" ? cmp : -cmp;
    });
  }, [game, view, klass, query, sort, dir]);

  if (!game) return null;

  const onSort = (key: SortKey): void => {
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir(key === "name" ? "asc" : "desc");
    }
  };

  const groups = group
    ? CLASS_IDS.map((id) => ({
        id,
        label: CLASS_LABEL[id],
        heroes: heroes.filter((h) => h.klass === id),
      })).filter((g) => g.heroes.length > 0)
    : [{ id: "all", label: "All heroes", heroes }];

  const cap = game.roster.length;
  const wage = wageBill(game.roster);
  const budget = wageBudgetFor(game.renown, game.facilities);
  // The Roster tab count is contracts inside seven days plus injuries. Say
  // which hero each count is about; a tooltip on the tab is not enough once
  // the player is looking at a twenty-row table.
  const alerts = [
    ...game.roster
      .filter((hero) => hero.contract.daysLeft <= 7)
      .sort((a, b) => a.contract.daysLeft - b.contract.daysLeft)
      .map((hero) => ({
        key: `contract-${hero.id}`,
        hero,
        kind: "Contract",
        tone: "warn" as const,
        detail: `${hero.contract.daysLeft} day${hero.contract.daysLeft === 1 ? "" : "s"} left · ${hero.contract.wage}g/week`,
      })),
    ...game.roster
      .filter((hero) => hero.injuryDays > 0)
      .sort((a, b) => b.injuryDays - a.injuryDays)
      .map((hero) => ({
        key: `injury-${hero.id}`,
        hero,
        kind: "Injured",
        tone: "bad" as const,
        detail: `out ${hero.injuryDays} day${hero.injuryDays === 1 ? "" : "s"}`,
      })),
  ];

  return (
    <div className="stack" style={{ gap: 12 }}>
      <header className="spread">
        <div>
          <h1 className="screen-title">Roster</h1>
          <p className="screen-sub">
            Every hero, with tonight's power and condition. Click a hero for the full sheet.
          </p>
        </div>
        <div className="row-wrap small">
          <Chip>
            {cap} heroes · squad rating {Math.round(squadRating(game.roster))}
          </Chip>
          <Chip>avg iLvl {averageItemLevel(game.roster)}</Chip>
          <Chip tone={wage > budget ? "bad" : undefined}>
            wages {wage}g / {budget}g
          </Chip>
          <button className="btn btn-sm" onClick={() => openModal({ kind: "tavern" })}>
            Visit tavern
          </button>
        </div>
      </header>

      {alerts.length > 0 ? (
        <section className="panel">
          <div className="panel-head">
            <span className="eyebrow">Roster alerts ({alerts.length})</span>
            <span className="tiny dim">the Roster tab count · click a hero</span>
          </div>
          <div>
            {alerts.slice(0, 5).map((alert) => (
              <button
                className="roster-alert"
                key={alert.key}
                onClick={() => selectHero(alert.hero.id)}
                title="Open the hero sheet"
              >
                <Chip tone={alert.tone}>{alert.kind}</Chip>
                <span style={{ fontWeight: 600 }}>{alert.hero.name}</span>
                <span className="small dim">{alert.detail}</span>
                <span className="grow" />
                <span className="tiny dim">open ▸</span>
              </button>
            ))}
            {alerts.length > 5 ? (
              <div className="tiny dim" style={{ padding: "6px 12px" }}>
                +{alerts.length - 5} more — use the Expiring or Injured view.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head" style={{ gap: 10, alignItems: "center" }}>
          <div className="row-wrap">
            <div className="seg">
              {HERO_VIEWS.map((v) => (
                <button key={v.id} data-active={view === v.id} onClick={() => setView(v.id)}>
                  {v.label}
                </button>
              ))}
            </div>
            <select className="select" value={klass} onChange={(e) => setKlass(e.target.value)} aria-label="Filter by class">
              <option value="all">All classes</option>
              {CLASS_IDS.map((id) => (
                <option key={id} value={id}>
                  {CLASS_LABEL[id]}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Search name, class, role"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: 180 }}
            />
          </div>
          <div className="row">
            <button className={`btn btn-sm ${group ? "btn-primary" : ""}`} onClick={() => setGroup((g) => !g)}>
              Group by class
            </button>
            <span className="tiny dim">{heroes.length} shown</span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => onSort("name")} aria-sort={sort === "name" ? (dir === "asc" ? "ascending" : "descending") : "none"}>
                  Hero {sort === "name" ? <span className="dim">{dir === "asc" ? "▲" : "▼"}</span> : null}
                </th>
                <th>Class · Role</th>
                <SortHead column={SORT_COLUMNS[0]!} sort={sort} dir={dir} onSort={onSort} />
                <SortHead column={SORT_COLUMNS[1]!} sort={sort} dir={dir} onSort={onSort} />
                <th className="num col-optional" title="Hidden until scouted">Potential</th>
                <SortHead column={SORT_COLUMNS[2]!} sort={sort} dir={dir} onSort={onSort} />
                <SortHead column={SORT_COLUMNS[3]!} sort={sort} dir={dir} onSort={onSort} />
                <SortHead column={SORT_COLUMNS[4]!} sort={sort} dir={dir} onSort={onSort} />
                <SortHead column={SORT_COLUMNS[5]!} sort={sort} dir={dir} onSort={onSort} />
                <SortHead column={SORT_COLUMNS[6]!} sort={sort} dir={dir} onSort={onSort} />
                <SortHead column={SORT_COLUMNS[7]!} sort={sort} dir={dir} onSort={onSort} />
                <th className="col-optional">Last 5</th>
              </tr>
            </thead>
            {game.roster.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={12}>
                    <div className="empty">
                      No heroes left in the guild. Visit the tavern and sign a body before the next reset.
                      <div style={{ marginTop: 8 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => openModal({ kind: "tavern" })}>
                          Visit the tavern
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : heroes.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={12}>
                    <div className="empty">
                      No hero matches this view.{" "}
                      <button className="btn btn-ghost btn-sm" onClick={() => { setView("all"); setKlass("all"); setQuery(""); }}>
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              groups.map((groupData) => (
                <tbody key={groupData.id}>
                  <tr className="group-row">
                    <td colSpan={12}>
                      {groupData.label} · {groupData.heroes.length}
                    </td>
                  </tr>
                  {groupData.heroes.map((hero) => (
                    <HeroRow key={hero.id} hero={hero} />
                  ))}
                </tbody>
              ))
            )}
          </table>
        </div>
        <div className="footer-note">
          <span>
            ★ marks the standing raid ten. Deployed heroes fight tonight. The rest recover fatigue and lose sharpness.
          </span>
          <span className="mono">roster cap {rosterCapFor(game.facilities)}</span>
        </div>
      </section>
    </div>
  );
};
