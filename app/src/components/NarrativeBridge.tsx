import { DriftingParachutes } from "./DriftingParachutes";

/** Visual breathing room between scroll story and pack deck */
export function NarrativeBridge() {
  return (
    <div className="narrative-bridge" aria-hidden>
      <DriftingParachutes zone="bridge" />
    </div>
  );
}