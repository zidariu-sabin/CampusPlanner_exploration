import { Component, input } from '@angular/core';

/** Inline "nothing here yet" prompt. Replaces `.inline-form-title`. */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <strong class="font-bold text-ink">{{ title() }}</strong>
    <span class="text-sm leading-relaxed text-muted">{{ message() }}</span>
  `,
  host: {
    class: 'grid gap-1 rounded-lg border border-line bg-panel-soft p-3',
  },
})
export class EmptyStateComponent {
  readonly title = input<string>('');
  readonly message = input<string>('');
}
