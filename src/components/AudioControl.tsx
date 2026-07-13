import "./AudioControl.css";
import { useGameStore } from "../store/gameStore";

/** Small unobtrusive mute toggle for ambient audio + SFX, bottom-right. */
export function AudioControl() {
  const muted = useGameStore(s => s.state.settings.audioMuted);
  const updateSettings = useGameStore(s => s.updateSettings);

  return (
    <button
      type="button"
      className="audio-control"
      data-muted={muted}
      aria-label={muted ? "Unmute audio" : "Mute audio"}
      title={muted ? "Unmute audio" : "Mute audio"}
      onClick={() => updateSettings({ audioMuted: !muted })}
    >
      {muted ? "\u{1F507}" : "\u{1F50A}"}
    </button>
  );
}
