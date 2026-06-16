import { Component, input, output } from '@angular/core';

export interface StepItem {
  title: string;
  detail: string;
  disabled?: boolean;
}

/** Horizontal wizard step selector. Replaces the global `.step-strip`. */
@Component({
  selector: 'app-step-strip',
  standalone: true,
  template: `
    <div class="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
      @for (s of steps(); track $index; let i = $index) {
        <button
          type="button"
          class="grid grid-rows-[auto_auto_1fr] gap-2 rounded-lg border p-3 text-left text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          [class]="i === active() ? 'border-amber bg-amber-soft' : 'border-line bg-panel enabled:hover:bg-panel-soft'"
          [disabled]="!!s.disabled"
          (click)="select.emit(i)"
        >
          <span
            class="grid h-7 w-7 place-items-center rounded-lg text-xs font-black"
            [class]="i === active() ? 'bg-amber text-white' : 'bg-panel-soft text-muted'"
            >{{ i + 1 }}</span
          >
          <strong class="text-sm">{{ s.title }}</strong>
          <small class="text-xs leading-snug text-muted">{{ s.detail }}</small>
        </button>
      }
    </div>
  `,
})
export class StepStripComponent {
  readonly steps = input<StepItem[]>([]);
  readonly active = input(0);
  readonly select = output<number>();
}
