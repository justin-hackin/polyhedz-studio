// from texture editor send
import {
  Model, model, modelAction, prop,
} from 'mobx-keystone';

import { action, computed, observable } from 'mobx';
import { getBoundingBoxAttrs, getDestinationPoints, PathData } from 'fluent-svg-path-ts';
import { Dimensions, getNearestHistoryFromAncestorNode } from 'svg-widget-studio';
import {
  calculateTransformOriginChangeOffset,
  getOriginPoint,
  getTextureTransformMatrix,
  scalePoint,
  sumPoints,
} from '../../../common/util/geom';
import { TransformModel } from './TransformModel';
import { ImageFaceDecorationPatternModel } from './ImageFaceDecorationPatternModel';
import { PathFaceDecorationPatternModel } from './PathFaceDecorationPatternModel';

// TODO: move to util
const negativeMod = (n, m) => ((n % m) + m) % m;
const wrapDegrees = (deg) => negativeMod(deg, 360);

@model('PositionableFaceDecorationModel')
export class PositionableFaceDecorationModel extends Model({
  pattern: prop<PathFaceDecorationPatternModel | ImageFaceDecorationPatternModel | undefined>(
    () => undefined,
  ).withSetter(),
  transform: prop<TransformModel>(() => (new TransformModel({}))).withSetter(),
}) {
  @observable
    transformDiff = new TransformModel({});

  @computed
  get dimensions(): Dimensions | undefined {
    if (!this.pattern) { return undefined; }
    if (this.pattern instanceof PathFaceDecorationPatternModel) {
      const { pathD } = this.pattern as PathFaceDecorationPatternModel;
      const { width, height } = getBoundingBoxAttrs(pathD);
      return { width, height };
    }
    if (this.pattern instanceof ImageFaceDecorationPatternModel) {
      const { dimensions } = this.pattern as ImageFaceDecorationPatternModel;
      return dimensions;
    }
    throw new Error('unexpected pattern type');
  }

  @computed
  get transformOriginDragged() {
    return sumPoints(this.transform.transformOrigin, this.transformDiff.transformOrigin);
  }

  @computed
  get translateDragged() {
    return sumPoints(this.transform.translate, this.transformDiff.translate);
  }

  @computed
  get rotateDragged() {
    return wrapDegrees(this.transform.rotate + this.transformDiff.rotate);
  }

  @computed
  get scaleDragged() {
    return this.transform.scale * this.transformDiff.scale;
  }

  @computed
  get transformMatrixDragged() {
    return getTextureTransformMatrix(
      this.transform.transformOrigin,
      this.scaleDragged,
      this.rotateDragged,
      this.translateDragged,
    );
  }

  @computed
  get transformMatrixDraggedStr() {
    return this.transformMatrixDragged && this.transformMatrixDragged.toString();
  }

  @computed
  get destinationPoints() {
    if (this.pattern instanceof PathFaceDecorationPatternModel) {
      const { pathD } = this.pattern as PathFaceDecorationPatternModel;
      return getDestinationPoints(new PathData(pathD));
    }
    return null;
  }

  @computed
  get parentHistoryManager() {
    return getNearestHistoryFromAncestorNode(this);
  }

  @modelAction
  setScaleDiff(mux) {
    this.parentHistoryManager.withoutUndo(() => {
      this.transformDiff.setScale(mux);
    });
  }

  @modelAction
  reconcileScaleDiff() {
    this.parentHistoryManager.withGroup(() => {
      this.transform.scale *= this.transformDiff.scale;
      this.transformDiff.setScale(1);
    });
  }

  @modelAction
  setTranslateDiff(delta) {
    this.parentHistoryManager.withoutUndo(() => {
      this.transformDiff.setTranslate(delta);
    });
  }

  @modelAction
  reconcileTranslateDiff() {
    this.parentHistoryManager.withGroup(() => {
      this.transform.setTranslate(sumPoints(this.transform.translate, this.transformDiff.translate));
      this.transformDiff.setTranslate(getOriginPoint());
    });
  }

  @modelAction
  setRotateDiff(delta) {
    this.parentHistoryManager.withoutUndo(() => {
      this.transformDiff.setRotate(delta);
    });
  }

  @action
  reconcileRotateDiff() {
    this.parentHistoryManager.withGroup(() => {
      this.transform.setRotate(wrapDegrees(this.transform.rotate + this.transformDiff.rotate));
      this.transformDiff.setRotate(0.0);
    });
  }

  @modelAction
  setTransformOriginDiff(delta) {
    this.parentHistoryManager.withoutUndo(() => {
      this.transformDiff.setTransformOrigin(delta);
    });
  }

  @modelAction
  reconcileTransformOriginDiff() {
    const relativeDifference = calculateTransformOriginChangeOffset(
      this.transform.transformOrigin,
      this.transformOriginDragged,
      this.scaleDragged,
      this.rotateDragged,
      this.translateDragged,
    );

    this.parentHistoryManager.withGroup(() => {
      this.transform.setTransformOrigin(this.transformOriginDragged);
      this.transform.setTranslate(sumPoints(this.transform.translate, scalePoint(relativeDifference, -1)));
      this.transformDiff.setTransformOrigin(getOriginPoint());
    });
  }
}
