import { Component, input } from '@angular/core';

/** Numbered wayfinding / instruction list. Replaces `.route-steps` / `.route-step`. */
@Component({
  selector: 'app-route-steps',
  standalone: true,
  template: `
    @for (step of steps(); track $index) {
      <div class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5">
        <span
          class="grid h-6 w-6 place-items-center rounded-full bg-strong text-xs font-bold text-white"
          >{{ $index + 1 }}</span
        >
        <p class="text-sm leading-relaxed text-muted">{{ step }}</p>
      </div>
    }
  `,
  host: {
    class: 'grid gap-2.5',
  },
})
export class RouteStepsComponent {
  readonly steps = input<string[]>([]);
}
