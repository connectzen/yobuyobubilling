export type DurationUnit = "minutes" | "hours" | "days";

const MINUTES_PER_UNIT: Record<DurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
};

export function durationToMinutes(amount: number, unit: DurationUnit): number {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Duration must be a positive whole number");
  }
  const factor = MINUTES_PER_UNIT[unit];
  if (!factor) {
    throw new Error("Unknown duration unit");
  }
  return amount * factor;
}

export function minutesToDuration(minutes: number): {
  amount: number;
  unit: DurationUnit;
} {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error("Duration must be a positive whole number");
  }
  if (minutes % 1440 === 0) {
    return { amount: minutes / 1440, unit: "days" };
  }
  if (minutes % 60 === 0) {
    return { amount: minutes / 60, unit: "hours" };
  }
  return { amount: minutes, unit: "minutes" };
}

export function formatDuration(minutes: number): string {
  const { amount, unit } = minutesToDuration(minutes);
  const singular = unit.slice(0, -1);
  return amount === 1 ? `1 ${singular}` : `${amount} ${unit}`;
}
