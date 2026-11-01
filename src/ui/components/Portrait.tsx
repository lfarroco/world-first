import { CLASS_LABEL, type ClassId, type RoleId } from "../../sim";
import { Art } from "./Art";

/**
 * Role portraits.
 *
 * One image per role, not per hero: the roster is generated, so the face comes
 * from `naturalRole`, which never changes. `role` does change — the planner
 * reassigns it per fight — and keying the image on it would give a hero a new
 * face overnight.
 */
type Props = {
  role: RoleId;
  klass: ClassId;
  name?: string;
  /** Width, and the height unless `height` is given. */
  size?: number;
  height?: number;
};

export const Portrait = ({ role, klass, name, size = 28, height }: Props) => {
  const box = Math.min(size, height ?? size);
  return (
    <Art
      base={`/art/roles/${role}`}
      alt={name ? `${name}, ${role}` : `${role} portrait`}
      width={size}
      height={height ?? size}
      className={`portrait-${klass}`}
      title={name ? `${name} — ${role} portrait` : undefined}
    >
      <span style={{ fontSize: Math.round(box * 0.4) }}>{CLASS_LABEL[klass].slice(0, 1)}</span>
    </Art>
  );
};
