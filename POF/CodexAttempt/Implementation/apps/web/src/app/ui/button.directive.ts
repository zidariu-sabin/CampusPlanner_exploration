import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong/40 disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border border-strong bg-strong text-white hover:bg-strong-2',
  secondary: 'border border-line bg-panel text-strong hover:bg-panel-soft',
  ghost: 'border border-transparent text-muted hover:bg-panel-soft',
  danger: 'border border-red bg-red text-white hover:brightness-110',
};

/**
 * Button styling as an attribute directive so the host stays a real
 * `<button>` or `<a routerLink>` (type, disabled, routing all native).
 * Usage: `<button uiBtn>` (primary), `<a uiBtn="secondary" routerLink="…">`.
 * Replaces the global `.primary-action` / `.secondary-action` classes.
 */
@Directive({
  selector: '[uiBtn]',
  standalone: true,
  host: { '[class]': 'cls()' },
})
export class ButtonDirective {
  readonly uiBtn = input<ButtonVariant | ''>('');
  protected readonly cls = computed(() => `${BASE} ${VARIANTS[this.uiBtn() || 'primary']}`);
}
