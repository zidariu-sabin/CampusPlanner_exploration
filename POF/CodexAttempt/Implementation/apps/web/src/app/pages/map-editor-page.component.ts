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
      <app-map-editor-form
        [mapId]="mapId"
        [buildingId]="buildingId"
        [seedCampusId]="seedCampusId"
        [seedPlaceId]="seedPlaceId"
        [workflow]="workflow"
      />
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
  protected readonly buildingId = this.route.snapshot.paramMap.get('buildingId');
  protected readonly seedCampusId = this.route.snapshot.queryParamMap.get('campusId');
  protected readonly seedPlaceId = this.route.snapshot.queryParamMap.get('placeId');
  protected readonly workflow = (this.route.snapshot.data['workflow'] ??
    'map') as MapEditorWorkflow;
}
