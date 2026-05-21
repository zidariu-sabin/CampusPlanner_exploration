import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import {
  MapEditorFormComponent,
  type MapEditorWorkflow,
} from '../components/map-editor-form.component';

@Component({
  selector: 'app-map-editor-page',
  standalone: true,
  imports: [CommonModule, MapEditorFormComponent],
  template: `
    <div class="page editor-page">
      <app-map-editor-form [mapId]="mapId" [workflow]="workflow" />
    </div>
  `,
  styles: `
    .editor-page {
      display: grid;
      gap: 1.5rem;
    }
  `,
})
export class MapEditorPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly mapId = this.route.snapshot.paramMap.get('mapId');
  protected readonly workflow = (this.route.snapshot.data['workflow'] ??
    'map') as MapEditorWorkflow;
}
