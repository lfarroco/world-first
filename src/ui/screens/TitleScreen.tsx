import { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { randomSeed } from "../../app/clock";

export const TitleScreen = () => {
  const startRun = useGameStore((s) => s.startRun);
  const [name, setName] = useState("Ironbound Order");
  const [seed, setSeed] = useState("1234");

  const begin = () => {
    const parsed = Number.parseInt(seed, 10);
    const value = Number.isFinite(parsed) ? parsed : 1234;
    startRun(Math.max(1, value), name.trim() || "Ironbound Order");
  };

  return (
    <div className="title-screen">
      <div className="title-card">
        <div className="title-kicker">World First · a guild management game</div>
        <h1 className="title-name">
          Three heroes.
          <br />
          One wood.
          <br />
          Eighty-four days.
        </h1>
        <p className="title-lead">
          You never fight. You choose who raids, who sits, who gets a drop, and whether tonight is progress or farm. The fight tests those choices. Three rival guilds run the same ladder at the same pace.
        </p>
        <div className="title-form">
          <div className="field">
            <label htmlFor="guild-name">Guild name</label>
            <input
              id="guild-name"
              className="input"
              style={{ width: "100%", padding: "7px 9px", fontSize: 12 }}
              value={name}
              maxLength={36}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") begin();
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="seed">Seed</label>
            <input
              id="seed"
              className="input"
              inputMode="numeric"
              style={{ width: "100%", padding: "7px 9px", fontSize: 12 }}
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") begin();
              }}
            />
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn"
              onClick={() => setSeed(String(randomSeed()))}
              title="Generate a random seed"
            >
              Random
            </button>
            <button className="btn btn-primary btn-lg" onClick={begin}>
              Found the guild ▸
            </button>
          </div>
        </div>
        <div className="footer-note">
          <span>The same seed and the same actions replay the same run. The save lives in this browser.</span>
          <span className="mono">seed {seed || "—"}</span>
        </div>
      </div>
    </div>
  );
};
