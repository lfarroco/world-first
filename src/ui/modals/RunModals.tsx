import { useState } from "react";
import { RUN_DAYS } from "../../sim";
import { randomSeed } from "../../app/clock";
import { useGameStore } from "../../store/gameStore";
import { Modal } from "../components/Modal";

export const NewRunModal = ({ onClose }: { onClose: () => void }) => {
  const game = useGameStore((s) => s.game);
  const startRun = useGameStore((s) => s.startRun);
  const abandonRun = useGameStore((s) => s.abandonRun);
  const [name, setName] = useState(game?.guildName ?? "Ironbound Order");
  const [seed, setSeed] = useState(String(randomSeed()));

  const begin = () => {
    const parsed = Number.parseInt(seed, 10);
    startRun(Math.max(1, Number.isFinite(parsed) ? parsed : 1234), name.trim() || "Ironbound Order");
  };

  return (
    <Modal
      title="Start a new run"
      subtitle={`A run is ${RUN_DAYS} days. The current save is replaced.`}
      onClose={onClose}
      footer={
        <>
          {game ? (
            <button className="btn btn-danger" onClick={() => abandonRun()} title="Delete the save and return to the title screen">
              Abandon run
            </button>
          ) : null}
          <span className="grow" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={begin}>
            Found the guild
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div className="field">
          <label htmlFor="new-guild-name">Guild name</label>
          <input
            id="new-guild-name"
            className="input"
            style={{ width: "100%" }}
            value={name}
            maxLength={36}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="new-seed">Seed</label>
          <div className="row">
            <input
              id="new-seed"
              className="input grow"
              inputMode="numeric"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
            />
            <button className="btn" onClick={() => setSeed(String(randomSeed()))}>
              Random
            </button>
          </div>
        </div>
        <p className="small muted">
          The seed fixes the roster, the rivals, the tavern and every roll. Replay it to test another plan against the same world.
        </p>
      </div>
    </Modal>
  );
};

export const HelpModal = ({ onClose }: { onClose: () => void }) => (
  <Modal
    title="Shortcuts and numbers"
    subtitle="Every number comes from the simulation."
    onClose={onClose}
    footer={
      <button className="btn btn-primary" onClick={onClose}>
        Close
      </button>
    }
  >
    <div className="inspect-grid">
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          Keyboard
        </div>
        <dl style={{ margin: 0 }}>
          <div className="kv">
            <dt>
              <span className="kbd">Space</span>
            </dt>
            <dd>Advance the day</dd>
          </div>
          <div className="kv">
            <dt>1 – 6</dt>
            <dd>Hall · Roster · War Room · Raid · Guilds · Report</dd>
          </div>
          <div className="kv">
            <dt>
              <span className="kbd">R</span> / <span className="kbd">W</span>
            </dt>
            <dd>Roster / War Room</dd>
          </div>
          <div className="kv">
            <dt>
              <span className="kbd">Esc</span>
            </dt>
            <dd>Close the drawer or modal</dd>
          </div>
        </dl>
      </div>
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          The numbers
        </div>
        <dl style={{ margin: 0 }}>
          <div className="kv">
            <dt>Power</dt>
            <dd>Best role × gear × form</dd>
          </div>
          <div className="kv">
            <dt>Form</dt>
            <dd>Condition × sharpness × morale × health × a bought tonic</dd>
          </div>
          <div className="kv">
            <dt>Projected</dt>
            <dd>Share of the boss the plan banks</dd>
          </div>
          <div className="kv">
            <dt>iLvl</dt>
            <dd>Average of four gear slots</dd>
          </div>
          <div className="kv">
            <dt>Check</dt>
            <dd>A phase test: DPS, Mitigation, Mechanics or Sustain</dd>
          </div>
          <div className="kv">
            <dt>Pull</dt>
            <dd>One attempt at an area</dd>
          </div>
          <div className="kv">
            <dt>Mastery</dt>
            <dd>Each pull adds 2%, capped at 30%</dd>
          </div>
        </dl>
      </div>
    </div>
    <hr className="sep" />
    <p className="small muted">
      A blocking item holds Advance until you answer it. The count on a tab is what waits inside it. The Report dot means an unopened day report. Drops never block: the next Advance takes the default. A phase ratio of 0.92–1.00 can clear or wipe, and a wipe can injure a hero. Push rolls its own injury risk on every pull. Drops can be assigned, sold, or forged; the market sells gear at the guild's tier.
    </p>
  </Modal>
);
