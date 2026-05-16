import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  type BackgroundImageEditDraft,
  type CanvasMode,
  clampBackgroundScale,
} from '../core/background-image-editor';

@Component({
  selector: 'app-image-manipulation-tools',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="tool-section">
      <div class="section-header">
        <div>
          <h3>Image tools</h3>
          <p class="muted">
            Rotate, scale, drag, and crop the floor-plan image before mapping rooms.
          </p>
        </div>
        <span class="chip">{{ canUseImageTools() ? 'Ready' : 'No image' }}</span>
      </div>

      <div class="segmented">
        <button
          type="button"
          class="ghost"
          [class.active]="mode() === 'rooms'"
          [disabled]="!canUseImageTools()"
          (click)="modeChange.emit('rooms')"
        >
          Rooms
        </button>
        <button
          type="button"
          class="ghost"
          [class.active]="mode() === 'image'"
          [disabled]="!canUseImageTools()"
          (click)="modeChange.emit('image')"
        >
          Move image
        </button>
        <button
          type="button"
          class="ghost"
          [class.active]="mode() === 'crop'"
          [disabled]="!canUseImageTools()"
          (click)="modeChange.emit('crop')"
        >
          Crop
        </button>
      </div>

      <div class="tool-grid">
        <label>
          Scale
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.05"
            [ngModel]="draft().scale"
            (ngModelChange)="setScale($event)"
            [disabled]="!canUseImageTools()"
          />
        </label>
        <label>
          Scale value
          <input
            type="number"
            min="0.25"
            max="3"
            step="0.05"
            [ngModel]="draft().scale"
            (ngModelChange)="setScale($event)"
            [disabled]="!canUseImageTools()"
          />
        </label>
        <label>
          Offset X
          <input
            type="number"
            step="1"
            [ngModel]="draft().offsetX"
            (ngModelChange)="updateDraft({ offsetX: numberValue($event) })"
            [disabled]="!canUseImageTools()"
          />
        </label>
        <label>
          Offset Y
          <input
            type="number"
            step="1"
            [ngModel]="draft().offsetY"
            (ngModelChange)="updateDraft({ offsetY: numberValue($event) })"
            [disabled]="!canUseImageTools()"
          />
        </label>
      </div>

      <div class="actions">
        <button
          type="button"
          class="ghost"
          (click)="rotate.emit(-1)"
          [disabled]="!canUseImageTools()"
        >
          Rotate left
        </button>
        <button
          type="button"
          class="ghost"
          (click)="rotate.emit(1)"
          [disabled]="!canUseImageTools()"
        >
          Rotate right
        </button>
        <button type="button" class="ghost" (click)="reset.emit()" [disabled]="!canUseImageTools()">
          Reset edits
        </button>
        <button type="button" (click)="apply.emit()" [disabled]="!canApplyBackgroundEdits()">
          {{ processingBackground() ? 'Applying...' : 'Apply edits' }}
        </button>
      </div>

      <p class="muted tool-muted">{{ hint() }}</p>
    </section>
  `,
  styles: `
    .tool-section {
      display: grid;
      gap: 0.9rem;
      padding-top: 0.25rem;
      border-top: 1px solid rgba(31, 42, 51, 0.08);
    }

    .tool-grid {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .segmented {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .segmented .active {
      background: rgba(14, 116, 144, 0.1);
      border-color: rgba(14, 116, 144, 0.35);
      color: var(--ink);
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
    }

    .tool-muted {
      margin: 0;
    }
  `,
})
export class ImageManipulationToolsComponent {
  readonly mode = input.required<CanvasMode>();
  readonly draft = input.required<BackgroundImageEditDraft>();
  readonly canUseImageTools = input(false);
  readonly canApplyBackgroundEdits = input(false);
  readonly processingBackground = input(false);
  readonly hint = input('');

  readonly modeChange = output<CanvasMode>();
  readonly draftChange = output<BackgroundImageEditDraft>();
  readonly rotate = output<number>();
  readonly reset = output<void>();
  readonly apply = output<void>();

  protected setScale(value: number | string | null): void {
    this.updateDraft({ scale: clampBackgroundScale(Number(value)) });
  }

  protected numberValue(value: number | string | null): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  protected updateDraft(patch: Partial<BackgroundImageEditDraft>): void {
    this.draftChange.emit({ ...this.draft(), ...patch });
  }
}
