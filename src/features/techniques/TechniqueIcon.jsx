import {
  BookMarked, BookOpenText, Boxes, CalendarClock, CircleHelp, Cpu, Gauge, Lightbulb, ListTree,
  PanelLeft, PenLine, Shuffle, Timer,
} from 'lucide-react';

const ICONS = { BookMarked, BookOpenText, Boxes, CalendarClock, CircleHelp, Cpu, Gauge, Lightbulb, ListTree, PanelLeft, PenLine, Shuffle, Timer };

export default function TechniqueIcon({ name, size = 22 }) {
  const Icon = ICONS[name] || CalendarClock;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}
