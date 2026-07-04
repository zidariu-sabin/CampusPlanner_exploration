import { Component, input } from '@angular/core';

/** Headline statistic card (label + large value). Replaces `.metric`. */
@Component({
  selector: 'app-metric',
  standalone: true,
  template: `
    <span class="text-xs font-semibold text-muted">{{ label() }}</span>
    <strong
      class="mt-2 block text-3xl font-bold leading-none tracking-tight sm:text-4xl"
      [class.text-amber]="tone() === 'warn'"
      >{{ value() }}</strong
    >
  `,
  host: {
    class: 'block rounded-lg border border-line bg-panel p-4 shadow-panel',
  },
})
export class MetricComponent {
  readonly label = input<string>('');
  readonly value = input<string | number>('');
  readonly tone = input<'default' | 'warn'>('default');
}
