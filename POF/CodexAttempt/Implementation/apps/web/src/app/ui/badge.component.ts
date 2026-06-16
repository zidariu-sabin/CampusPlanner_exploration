import { Component, computed, input } from '@angular/core';

/** Pill status label. Replaces `.badge` / `.badge-good` / `.badge-warn`. */
@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[class]': 'cls()',
  },
})
export class BadgeComponent {
  readonly tone = input<'neutral' | 'good' | 'warn'>('neutral');

  protected readonly cls = computed(
    () =>
      'inline-flex w-fit items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-none ' +
      {
        neutral: 'bg-panel-soft text-muted',
        good: 'bg-green-soft text-green',
        warn: 'bg-amber-soft text-amber',
      }[this.tone()],
  );
}
