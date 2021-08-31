import { Model, model, prop } from 'mobx-keystone';
import { computed } from 'mobx';

import { closedPolygonPath } from '../../../../renderer/DielineViewer/util/shapes/generic';
import { getLineLineIntersection, lineLerp, RawPoint } from '../../../util/geom';
import { getBoundingBoxAttrs } from '../../../util/svg';

@model('BoundaryModel')
export class BoundaryModel extends Model({
  vertices: prop<RawPoint[]>(),
}) {
  @computed
  get boundingBoxAttrs() {
    return getBoundingBoxAttrs(this.pathD);
  }

  @computed
  get pathD() {
    return closedPolygonPath(this.vertices).getD();
  }

  @computed
  get centerPoint() {
    const mid1 = lineLerp(this.vertices[0], this.vertices[1], 0.5);
    const mid2 = lineLerp(this.vertices[1], this.vertices[2], 0.5);

    return getLineLineIntersection(this.vertices[0], mid2, this.vertices[2], mid1);
  }
}
