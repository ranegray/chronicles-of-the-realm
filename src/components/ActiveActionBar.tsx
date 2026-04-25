import { Button } from "./Button";
import type { ActiveActionBarProps } from "./v04UiTypes";

export function ActiveActionBar({ actions, onUseAction }: ActiveActionBarProps) {
  if (actions.length === 0) return null;

  return (
    <div className="active-action-bar">
      {actions.map(action => (
        <Button
          key={action.id}
          variant={action.type === "escape" ? "danger" : action.type === "magic" ? "secondary" : "ghost"}
          disabled={action.disabled}
          title={action.disabledReason ?? action.description}
          onClick={() => onUseAction(action.id)}
        >
          {action.name}
          {action.remainingCooldown ? ` (${action.remainingCooldown})` : ""}
        </Button>
      ))}
    </div>
  );
}
