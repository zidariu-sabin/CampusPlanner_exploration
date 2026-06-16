import { Component, input } from '@angular/core';

/**
 * Card surface with an optional header (title + subtitle + projected action)
 * and a padded body. Replaces the global `.panel` / `.panel-header` /
 * `.panel-body` classes. Sizing is rem/scale-based (responsive), not pixel-exact.
 * Project a header action with the `panelAction` attribute:
 *
 *   <app-panel heading="Title" sub="Subtitle">
 *     <a panelAction class="secondary-action">Action</a>
 *     …body…
 *   </app-panel>
 */
@Component({
  selector: 'app-panel',
  standalone: true,
  template: `
    @if (heading()) {
      <header
        class="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel-muted px-4 py-3.5"
      >
        <div class="min-w-0">
          <h3 class="truncate text-lg font-bold tracking-tight text-ink">{{ heading() }}</h3>
          @if (sub()) {
            <p class="mt-0.5 text-xs text-muted">{{ sub() }}</p>
          }
        </div>
        <ng-content select="[panelAction]" />
      </header>
    }
    <div [class]="flush() ? '' : 'p-4'">
      <ng-content />
    </div>
  `,
  host: {
    class: 'block overflow-hidden rounded-lg border border-line bg-panel shadow-panel',
  },
})
export class PanelComponent {
  readonly heading = input<string>('');
  readonly sub = input<string>('');
  /** Drop the body padding (e.g. when the body is a map canvas or table). */
  readonly flush = input(false);
}
