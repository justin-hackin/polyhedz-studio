import { inRange } from 'lodash-es';
import fileDownload from 'js-file-download';
import {
  fromSnapshot, getSnapshot, Model, model, modelAction, prop,
} from 'mobx-keystone';
import {
  action, computed, makeObservable, observable,
} from 'mobx';
import { RawPoint } from 'fluent-svg-path-ts';
import { assertNotNullish, Dimensions, sliderProp } from 'svg-widget-studio';
import { BoundaryModel } from './BoundaryModel';
import { ModifierTrackingModel } from './ModifierTrackingModel';
import {
  calculateTransformOriginChangeOffset,
  scalePoint,
  sumPoints,
  transformPoint,
} from '../../../../../../../common/util/geom';
import { ShapePreviewModel } from './ShapePreviewModel';
import { tryResolvePath } from '../../../../../../../common/util/mobx-keystone';
import { TransformModel } from '../../../../../models/TransformModel';
import type { PyramidNetWidgetModel } from '../../../../../models/PyramidNetWidgetStore';
import { ImageFaceDecorationPatternModel } from '../../../../../models/ImageFaceDecorationPatternModel';
import { PositionableFaceDecorationModel } from '../../../../../models/PositionableFaceDecorationModel';
import { extractCutHolesFromSvgString } from '../../../../../../../common/util/svg';
import { PathFaceDecorationPatternModel } from '../../../../../models/PathFaceDecorationPatternModel';
import { PatternInfo } from '@/widgets/PyramidNet/types';
import { DEFAULT_SLIDER_STEP } from '@/common/constants';

const DEFAULT_IS_POSITIVE = true;
const DEFAULT_VIEW_SCALE = 0.7;

const getCoverScale = (bounds, image) => {
  const widthScale = bounds.width / image.width;
  const heightScale = bounds.height / image.height;
  const widthIsClamp = widthScale >= heightScale;
  return {
    widthIsClamp,
    scale: widthIsClamp ? widthScale : heightScale,
  };
};

const getFitScale = (bounds, image) => {
  if (!bounds || !image) {
    return null;
  }
  const widthIsClamp = (bounds.width / bounds.height) <= (image.width / image.height);
  return {
    widthIsClamp,
    scale: widthIsClamp ? bounds.width / image.width : bounds.height / image.height,
  };
};

const MIN_VIEW_SCALE = 0.3;

const MAX_VIEW_SCALE = 3;

@model('TextureEditorViewerModel')
export class TextureEditorViewerModel extends Model({
  viewScale: prop<number>(DEFAULT_VIEW_SCALE).withSetter(),
  modifierTracking: prop<ModifierTrackingModel>(() => new ModifierTrackingModel({})),
  nodeScaleMux: sliderProp(1, {
    labelOverride: 'Node size', min: 0.1, max: 10, step: DEFAULT_SLIDER_STEP,
  }),
}) {
  @observable
    viewScaleDiff = 1;

  @computed
  get viewScaleDragged() {
    return this.viewScale && (this.viewScale * this.viewScaleDiff);
  }

  @computed
  get viewScaleCenterPercentStr() {
    return this.viewScaleDragged && `${((1 - this.viewScaleDragged) * 100) / 2}%`;
  }

  @computed
  get viewScalePercentStr() {
    return this.viewScaleDragged && `${this.viewScaleDragged * 100}%`;
  }

  @modelAction
  setViewScaleDiffClamped(mux) {
    if (inRange(mux * this.viewScale, MIN_VIEW_SCALE, MAX_VIEW_SCALE)) {
      this.viewScaleDiff = mux;
    }
  }

  @modelAction
  reconcileViewScaleDiff() {
    this.setViewScale(this.viewScaleDragged);
    this.setViewScaleDiffClamped(1);
  }
}

export class TextureEditorModel {
  constructor(parentPyramidNetWidgetModel: PyramidNetWidgetModel) {
    this.parentPyramidNetWidgetModel = parentPyramidNetWidgetModel;
    makeObservable(this);
  }

  @observable
    parentPyramidNetWidgetModel: PyramidNetWidgetModel;

  @observable
    viewerModel = new TextureEditorViewerModel({});

  @observable
    shapePreviewIsFullScreen = false;

  @observable
    placementAreaDimensions: Dimensions | null = null;

  @observable
    autoRotatePreview = false;

  @observable
    showNodes = false;

  @observable
    selectedTextureNodeIndex: number | undefined = undefined;

  @observable
    shapePreview:ShapePreviewModel | undefined;

  @observable
    importTextureArrangementDialogActive = false;

  @action
  activateImportTextureArrangementDialog() {
    this.importTextureArrangementDialogActive = true;
  }

  @action
  deactivateImportTextureArrangementDialog() {
    this.importTextureArrangementDialogActive = false;
  }

  SEND_ANALYTICS_INTERVAL_MS = 10000;

  // if faceDecoration is Raw before opening texture editor, it is reset to PositionableFaceDecorationModel
  @computed
  get faceDecoration() {
    return this.parentPyramidNetWidgetModel.faceDecoration as PositionableFaceDecorationModel;
  }

  @computed
  get decorationBoundary() {
    return new BoundaryModel(this.parentPyramidNetWidgetModel.normalizedDecorationBoundaryPoints);
  }

  @computed
  get shapeName() {
    return this.parentPyramidNetWidgetModel.pyramid.shapeName;
  }

  @computed
  get imageCoverScale() {
    if (!this.faceDecoration?.pattern) {
      return undefined;
    }
    return getCoverScale(this.decorationBoundary.boundingBoxAttrs, this.faceDecoration.dimensions);
  }

  @computed
  get faceFittingScale() {
    if (!this.placementAreaDimensions || !this.decorationBoundary) {
      return undefined;
    }
    return getFitScale(this.placementAreaDimensions, this.decorationBoundary.boundingBoxAttrs);
  }

  @computed
  get shapePreviewDimensions() {
    if (!this.placementAreaDimensions) { return null; }
    return this.shapePreviewIsFullScreen
      ? { width: window.innerWidth, height: window.innerHeight }
      : this.placementAreaDimensions;
  }

  @computed
  get minImageScale() {
    return this.imageCoverScale && (0.1 * this.imageCoverScale.scale);
  }

  @computed
  get maxImageScale() {
    return this.imageCoverScale && (5 * this.imageCoverScale.scale);
  }

  @computed
  get selectedTextureNode() {
    if (this.selectedTextureNodeIndex === undefined || !this.faceDecoration.destinationPoints) {
      return undefined;
    }
    return this.faceDecoration.destinationPoints[this.selectedTextureNodeIndex];
  }

  // faceBoundary = decorationBoundary + border (if any)
  @computed
  get faceBoundary() {
    if (!this.decorationBoundary || !this.borderToInsetRatio) { return undefined; }
    // TODO: no more dirty type checking
    if (
      this.faceDecoration?.pattern instanceof ImageFaceDecorationPatternModel
      && !this.faceDecoration.pattern.isBordered
    ) {
      return this.decorationBoundary;
    }
    const vertices = this.decorationBoundary.vertices
      .map((pt) => sumPoints(scalePoint(pt, this.borderToInsetRatio), this.insetToBorderOffset));
    return new BoundaryModel(vertices);
  }

  @computed
  get borderToInsetRatio() {
    return this.parentPyramidNetWidgetModel.borderToInsetRatio;
  }

  @computed
  get insetToBorderOffset() {
    return this.parentPyramidNetWidgetModel.insetToBorderOffset;
  }

  @action
  setPlacementAreaDimensions(placementAreaDimensions: Dimensions) {
    this.placementAreaDimensions = placementAreaDimensions;
  }

  @action
  setSelectedTextureNodeIndex(index: number | undefined) {
    this.selectedTextureNodeIndex = index;
  }

  @action
  setShowNodes(showNodes) {
    this.showNodes = showNodes;
    if (!this.showNodes) { this.setSelectedTextureNodeIndex(undefined); }
  }

  @action
  fitTextureToFace() {
    const { boundingBoxAttrs } = this.decorationBoundary;
    const { dimensions: textureDimensions } = this.faceDecoration;
    if (!this.faceDecoration?.pattern || !this.decorationBoundary || !this.imageCoverScale || !textureDimensions) {
      return;
    }
    const { height, width, xmin } = boundingBoxAttrs;
    const { scale, widthIsClamp } = this.imageCoverScale;
    this.faceDecoration.setTransform(new TransformModel({
      translate: widthIsClamp
        ? { x: xmin, y: (height - (textureDimensions.height * scale)) / 2 }
        : { x: xmin + (width - (textureDimensions.width * scale)) / 2, y: 0 },
      scale,
    }));
  }

  @action
  refitTextureToFace() {
    if (this.faceDecoration?.pattern) {
      this.fitTextureToFace();
      this.repositionOriginOverFaceCenter();
    }
  }

  @action
  resetNodesEditor() {
    this.setShowNodes(false);
    this.setSelectedTextureNodeIndex(undefined);
  }

  @action
  clearTexturePattern() {
    this.faceDecoration.setPattern(undefined);
    this.faceDecoration.setTransform(new TransformModel({}));
  }

  @action
  setTextureFromPattern(pattern) {
    this.resetNodesEditor();
    this.faceDecoration.setPattern(pattern);
    this.fitTextureToFace();
    this.repositionOriginOverFaceCenter();
  }

  @action
  setTexturePath(pathD, sourceFileName) {
    this.setTextureFromPattern(new PathFaceDecorationPatternModel({
      pathD, sourceFileName, isPositive: DEFAULT_IS_POSITIVE,
    }));
  }

  @action
  setTextureImage(imageData, dimensions, sourceFileName) {
    this.setTextureFromPattern(new ImageFaceDecorationPatternModel({
      imageData, dimensions, sourceFileName,
    }));
  }

  @action
  setShapePreviewIsFullScreen(isFullScreen) {
    this.shapePreviewIsFullScreen = isFullScreen;
  }

  @computed
  get fileBasename() {
    return `${this.shapeName.value || 'shape'}__${
      tryResolvePath(this, ['texture', 'pattern', 'sourceFileName']) || 'undecorated'}`;
  }

  @action
  absoluteMovementToSvg(absCoords) {
    assertNotNullish(this.faceFittingScale);
    return scalePoint(absCoords, 1 / (this.viewerModel.viewScaleDragged * this.faceFittingScale.scale));
  }

  @action
  translateAbsoluteCoordsToRelative(absCoords) {
    return transformPoint(
      ((new DOMMatrixReadOnly())
        .scale(this.faceDecoration.scaleDragged, this.faceDecoration.scaleDragged)
        .rotate(this.faceDecoration.rotateDragged)
        .inverse()),
      this.absoluteMovementToSvg(absCoords),
    );
  }

  @action
  repositionTextureWithOriginOverPoint(point) {
    if (!this.faceDecoration || !this.decorationBoundary) {
      return;
    }
    const originAbsolute = transformPoint(
      this.faceDecoration.transformMatrixDragged,
      this.faceDecoration.transform.transformOrigin,
    );
    this.faceDecoration.transform.setTranslate(sumPoints(
      this.faceDecoration.transform.translate,
      scalePoint(originAbsolute, -1),
      point,
    ));
  }

  @action
  repositionTextureWithOriginOverCorner(vertexIndex) {
    this.repositionTextureWithOriginOverPoint(this.decorationBoundary.vertices[vertexIndex]);
  }

  @action
  repositionTextureWithOriginOverFaceCenter() {
    this.repositionTextureWithOriginOverPoint(this.decorationBoundary.centerPoint);
  }

  @action
  repositionSelectedNodeOverPoint(point) {
    if (!this.faceDecoration || !this.decorationBoundary || !this.selectedTextureNode) {
      return;
    }
    const svgTextureNode = transformPoint(this.faceDecoration.transformMatrixDragged, this.selectedTextureNode);
    const diff = sumPoints(svgTextureNode, scalePoint(point, -1));
    this.faceDecoration.transform.setTranslate(
      sumPoints(scalePoint(diff, -1), this.faceDecoration.transform.translate),
    );
  }

  @action
  repositionSelectedNodeOverCorner(vertexIndex) {
    this.repositionSelectedNodeOverPoint(this.decorationBoundary.vertices[vertexIndex]);
  }

  @action
  repositionSelectedNodeOverFaceCenter() {
    this.repositionSelectedNodeOverPoint(this.decorationBoundary.centerPoint);
  }

  @action
  repositionOriginOverPoint(point: RawPoint) {
    if (!this.faceDecoration || !this.decorationBoundary) {
      return;
    }
    this.repositionOriginOverRelativePoint(
      transformPoint(this.faceDecoration.transform.transformMatrix.inverse(), point),
    );
  }

  @action
  repositionOriginOverRelativePoint(pointRelativeToTexture: RawPoint) {
    const delta = scalePoint(sumPoints(
      scalePoint(pointRelativeToTexture, -1),
      this.faceDecoration.transform.transformOrigin,
    ), -1);
    const {
      transformOrigin, translate, scale, rotate,
    } = this.faceDecoration.transform;
    const newTransformOrigin = sumPoints(delta, transformOrigin);
    this.faceDecoration.transform.setTranslate(sumPoints(
      translate,
      scalePoint(calculateTransformOriginChangeOffset(
        transformOrigin,
        newTransformOrigin,
        scale,
        rotate,
        translate,
      ), -1),
    ));
    this.faceDecoration.transform.setTransformOrigin(newTransformOrigin);
  }

  @action
  repositionOriginOverCorner(vertexIndex) {
    this.repositionOriginOverPoint(this.decorationBoundary.vertices[vertexIndex]);
  }

  @action
  repositionOriginOverFaceCenter() {
    assertNotNullish(this.decorationBoundary?.centerPoint);
    this.repositionOriginOverPoint(this.decorationBoundary.centerPoint);
  }

  @action
  repositionOriginOverTextureCenter() {
    assertNotNullish(this.faceDecoration.dimensions);
    const { width, height } = this.faceDecoration.dimensions;
    this.repositionOriginOverRelativePoint({ x: width / 2, y: height / 2 });
  }

  @action
  saveTextureArrangement() {
    assertNotNullish(this.faceDecoration.pattern);
    const fileData = {
      shapeName: this.shapeName.value,
      textureSnapshot: getSnapshot(this.faceDecoration),
    };
    const defaultBasename = `${this.shapeName.value}__${this.faceDecoration.pattern.sourceFileName}`;
    fileDownload(JSON.stringify(fileData), `${defaultBasename}.json`, 'application/json');
  }

  @action
  setTextureFromSnapshot(textureSnapshot) {
    this.parentPyramidNetWidgetModel.setFaceDecoration(fromSnapshot<PositionableFaceDecorationModel>(textureSnapshot));
  }

  @action
  assignTextureFromPatternInfo(patternInfo: PatternInfo) {
    if (patternInfo) {
      if (patternInfo.isPath === true) {
        const { svgString, sourceFileName } = patternInfo;
        const pathD = extractCutHolesFromSvgString(svgString);
        this.setTexturePath(pathD, sourceFileName);
      } else {
        const { imageData, dimensions, sourceFileName } = patternInfo.pattern;
        this.setTextureImage(imageData, dimensions, sourceFileName);
      }
    }
  }

  @action
  setTextureArrangementFromFileData(fileData) {
    const { shapeName, textureSnapshot } = fileData;
    if (!textureSnapshot) {
      return;
    }
    if (shapeName !== this.shapeName.value) {
      this.parentPyramidNetWidgetModel.pyramid.shapeName.setValue(shapeName);
    }
    this.setTextureFromSnapshot(textureSnapshot);
  }

  @action
  setAutoRotatePreview(shouldRotate) {
    this.autoRotatePreview = shouldRotate;
  }

  @action
  createShapePreview(rendererContainer: HTMLElement) {
    this.shapePreview = new ShapePreviewModel(rendererContainer);
  }
}
