import ReactDOMServer from 'react-dom/server';
import React from 'react';

import { modelAction, prop } from 'mobx-keystone';
import {
  action, computed, observable, reaction,
} from 'mobx';
import { persist } from 'mobx-keystone-persist';
import { chunk, flatten, range } from 'lodash-es';
import BrushIcon from '@mui/icons-material/Brush';
import {
  convertTransformObjectToDOMMatrixReadOnly,
  getBoundingBoxAttrs,
  getCurrentSegmentStart,
  getLastPosition,
  PartialTransformObject,
  PathData,
  RawPoint,
} from 'fluent-svg-path-ts';
import {
  PIXELS_PER_CM,
  RegisteredAssetsDefinition,
  sliderWithTextProp,
  WidgetModel,
  widgetModel,
} from 'svg-widget-studio';
import { assertNotNullish } from 'svg-widget-studio/src/helpers/assert';
import { LicenseWatermarkContent } from '@/widgets/LicenseWatermarkContent';
import { appendContinuationPath } from '@/widgets/PyramidNet/path';
import { RawFaceDecorationModel } from './RawFaceDecorationModel';
import {
  TextureEditorModel,
} from '../components/TextureEditorDrawer/components/TextureEditor/models/TextureEditorModel';
import { DashPatternModel, strokeDashPath } from '../../../common/shapes/strokeDashPath';
import { DecorationBoundarySVG } from '../components/DecorationBoundarySVG';
import { PrintLayer } from '../components/PrintLayer';
import { DielinesLayer } from '../components/DielinesLayer';
import { PyramidNetPreferencesModel } from './PyramidNetPreferencesModel';
import { PanelContent } from '../components/PanelContent';
import { PyramidModel } from './PyramidModel';
import {
  AscendantEdgeConnectionPaths,
  ascendantEdgeConnectionTabs,
  AscendantEdgeTabsModel,
} from '../ascendantEdgeConnectionTabs';
import { baseEdgeConnectionTab, BaseEdgeTabsModel } from '../baseEdgeConnectionTab';
import { PositionableFaceDecorationModel } from './PositionableFaceDecorationModel';
import {
  degToRad,
  hingedPlot,
  hingedPlotByProjectionDistance,
  offsetPolygonPoints,
  polygonPointsGivenAnglesAndSides,
  radToDeg,
  scalePoint,
  sumPoints,
  triangleAnglesGivenSides,
} from '../../../common/util/geom';
import { appendCurvedLineSegments, closedPolygonPath, roundedEdgePath } from '../../../common/shapes/generic';
import { PathFaceDecorationPatternModel } from './PathFaceDecorationPatternModel';
import { getBoundedTexturePathD } from '../../../common/util/path-boolean';
import { additionalFileMenuItemsFactory } from '../components/additionalFileMenuItemsFactory';
import previewIcon from '../static/widget-preview.png';
import { DEFAULT_SLIDER_STEP } from '@/common/constants';

const PREFERENCES_LOCALSTORE_NAME = 'PyramidNetPreferencesModel';

export const FACE_FIRST_EDGE_NORMALIZED_SIZE = 2000;

const applyFlap = (
  path: PathData,
  flapDirectionIsUp: boolean,
  handleFlapDepth: number,
  testTabHandleFlapRounding: number,
) => {
  const startPt = getLastPosition(path.commands);
  const endPt = getCurrentSegmentStart(path.commands);
  const startFlapEdge = { x: 0, y: (flapDirectionIsUp ? 1 : -1) * handleFlapDepth };
  assertNotNullish(startPt);
  assertNotNullish(endPt);
  appendCurvedLineSegments(path, [
    sumPoints(startPt, startFlapEdge),
    sumPoints(endPt, startFlapEdge),
  ], testTabHandleFlapRounding, true);
};

export const POLYHEDRAL_NET_MODEL_TYPE = 'PolyhedralNet';

@widgetModel(POLYHEDRAL_NET_MODEL_TYPE, previewIcon)
export class PyramidNetWidgetModel extends WidgetModel({
  pyramid: prop<PyramidModel>(() => (new PyramidModel({}))),
  ascendantEdgeTabsSpec: prop<AscendantEdgeTabsModel>(() => (new AscendantEdgeTabsModel({}))),
  baseEdgeTabsSpec: prop<BaseEdgeTabsModel>(() => (new BaseEdgeTabsModel({}))),
  shapeHeight: sliderWithTextProp(20 * PIXELS_PER_CM, {
    min: 20 * PIXELS_PER_CM, max: 60 * PIXELS_PER_CM, step: DEFAULT_SLIDER_STEP, useUnits: true,
  }),
  faceDecoration: prop<PositionableFaceDecorationModel | RawFaceDecorationModel>(
    () => new PositionableFaceDecorationModel({}),
  ).withSetter(),
  useDottedStroke: prop(false).withSetter(),
  baseScoreDashSpec: prop<DashPatternModel>(() => (new DashPatternModel({}))).withSetter(),
  interFaceScoreDashSpec: prop<DashPatternModel>(() => (new DashPatternModel({}))).withSetter(),
}) {
  @observable
    textureEditorOpen = false;

  @observable
    importFaceDialogActive = false;

  @action
  activateImportFaceDialog() {
    this.importFaceDialogActive = true;
  }

  @action
  deactivateImportFaceDialog() {
    this.importFaceDialogActive = false;
  }

  @observable
    preferences = new PyramidNetPreferencesModel({});

  @observable
    textureEditor = new TextureEditorModel(this);

  testTabHandleFlapDepth = 2;

  testTabHandleFlapRounding = 0.5;

  @computed
  get tabIntervalRatios() {
    const {
      tabsCount: { value: tabsCount },
      tabStartGapToTabDepth: { value: tabStartGapToTabDepth },
      tabDepthToTraversalLength: { value: tabDepthToTraversalLength },
      holeWidthRatio: { value: holeWidthRatio },
    } = this.ascendantEdgeTabsSpec;
    const offsetRatio = tabDepthToTraversalLength * tabStartGapToTabDepth;
    const intervalRatio = (1 - offsetRatio) / tabsCount;
    const tabWidthRatio = intervalRatio * holeWidthRatio;
    return range(tabsCount)
      .map((index) => [
        offsetRatio + index * intervalRatio,
        offsetRatio + index * intervalRatio + tabWidthRatio,
      ]);
  }

  @computed
  get relativeFaceEdgeLengths() {
    if (this.pyramid.geometry.uniqueFaceEdgeLengths.length === 3) {
      return this.pyramid.geometry.uniqueFaceEdgeLengths;
    }
    const firstLength = this.pyramid.geometry.uniqueFaceEdgeLengths[0];
    if (this.pyramid.geometry.uniqueFaceEdgeLengths.length === 2) {
      return [...this.pyramid.geometry.uniqueFaceEdgeLengths, firstLength];
    }
    return [firstLength, firstLength, firstLength];
  }

  @computed
  get tabGapIntervalRatios() {
    return chunk([0, ...flatten(this.tabIntervalRatios), 1], 2);
  }

  @computed
  get faceEdgeNormalizer() {
    return FACE_FIRST_EDGE_NORMALIZED_SIZE / this.relativeFaceEdgeLengths[0];
  }

  @computed
  get normalizedFaceEdgeLengths() {
    return this.relativeFaceEdgeLengths.map(
      (val) => val * this.faceEdgeNormalizer,
    );
  }

  @computed
  get faceInteriorAngles(): number[] {
    return triangleAnglesGivenSides(this.normalizedFaceEdgeLengths);
  }

  @computed
  get faceBoundaryPoints() {
    return polygonPointsGivenAnglesAndSides(this.faceInteriorAngles, this.actualFaceEdgeLengths);
  }

  @computed
  get normalizedDecorationBoundaryPoints():RawPoint[] {
    return polygonPointsGivenAnglesAndSides(
      this.faceInteriorAngles,
      this.normalizedFaceEdgeLengths,
    );
  }

  // factor to scale face lengths such that the first edge will be equal to 1
  @computed
  get faceLengthAdjustRatio() {
    const { diameter } = this.pyramid.geometry;
    const firstSideLengthInPx = ((this.shapeHeight.value * this.relativeFaceEdgeLengths[0]) / diameter);
    return firstSideLengthInPx / FACE_FIRST_EDGE_NORMALIZED_SIZE;
  }

  @computed
  get actualFaceEdgeLengths() {
    return this.normalizedFaceEdgeLengths.map((len) => len * this.faceLengthAdjustRatio);
  }

  @computed
  get ascendantEdgeTabDepth() {
    const {
      ascendantEdgeTabsSpec: {
        tabDepthToTraversalLength: { value: tabDepthToTraversalLength },
      },
    } = this;
    return this.traversalLength * tabDepthToTraversalLength * 0.6;
  }

  @computed
  get borderToInsetRatio() {
    const insetPolygonPoints = offsetPolygonPoints(this.faceBoundaryPoints, -this.ascendantEdgeTabDepth);
    return getBoundingBoxAttrs(closedPolygonPath(this.faceBoundaryPoints).getD()).width
      / getBoundingBoxAttrs(closedPolygonPath(insetPolygonPoints).getD()).width;
  }

  @computed
  get insetToBorderOffset() {
    const normalizedInsetPoints = offsetPolygonPoints(
      this.normalizedDecorationBoundaryPoints,
      -this.ascendantEdgeTabDepth / this.faceLengthAdjustRatio,
    );
    return scalePoint(normalizedInsetPoints[0], -this.borderToInsetRatio);
  }

  @computed
  get faceTabFenceposts() {
    const { pyramid: { facesPerNet } } = this;
    const { faceBoundaryPoints, faceInteriorAngles, actualFaceEdgeLengths } = this;
    return range(facesPerNet + 1).map(
      (index) => hingedPlot(
        faceBoundaryPoints[1],
        faceBoundaryPoints[0],
        Math.PI * 2 - index * faceInteriorAngles[2],
        index % 2 ? actualFaceEdgeLengths[2] : actualFaceEdgeLengths[0],
      ),
    );
  }

  @computed
  get baseTabDepth() {
    return this.baseEdgeTabsSpec.tabDepthToAscendantTabDepth.value * this.ascendantEdgeTabDepth;
  }

  @computed
  get masterBaseTab() {
    return baseEdgeConnectionTab(
      this.faceBoundaryPoints[1],
      this.faceBoundaryPoints[2],
      this.baseTabDepth,
      this.baseEdgeTabsSpec,
      this.baseScoreDashSpecForDashing,
    );
  }

  @computed
  get masterBaseTabCut() {
    return (new PathData()).concatPath(this.masterBaseTab.innerCut).concatPath(this.masterBaseTab.boundaryCut);
  }

  @computed
  get masterBaseTabScore() {
    return this.masterBaseTab.score;
  }

  @computed
  get testBaseTab() {
    const endPt = { x: this.actualFaceEdgeLengths[1], y: 0 };
    const { boundaryCut, innerCut, score } = baseEdgeConnectionTab(
      this.faceBoundaryPoints[0],
      endPt,
      this.baseTabDepth,
      this.baseEdgeTabsSpec,
      this.baseScoreDashSpecForDashing,
    );
    const cut = (new PathData()).concatPath(innerCut).concatPath(boundaryCut);
    applyFlap(
      cut,
      false,
      this.testTabHandleFlapDepth * this.baseTabDepth,
      this.testTabHandleFlapRounding,
    );
    return { cut, score };
  }

  // length of first 2 face edges
  @computed
  get traversalLength() {
    return this.actualFaceEdgeLengths[0] + this.actualFaceEdgeLengths[1];
  }

  @computed
  get testAscendantTab(): AscendantEdgeConnectionPaths {
    const startPt = this.faceBoundaryPoints[0];
    const endPt = { x: this.actualFaceEdgeLengths[0], y: 0 };

    const { male, female } = ascendantEdgeConnectionTabs(
      startPt,
      endPt,
      this.ascendantEdgeTabsSpec,
      this.interFaceScoreDashSpecForDashing,
      this.tabIntervalRatios,
      this.tabGapIntervalRatios,
      this.ascendantEdgeTabDepth,
    );
    female.cut
      .concatPath(this.testTabFemaleAscendantFlap);

    applyFlap(
      male.cut,
      false,
      this.testTabHandleFlapDepth * this.baseTabDepth,
      this.testTabHandleFlapRounding,
    );
    applyFlap(
      female.cut,
      true,
      this.testTabHandleFlapDepth * this.baseTabDepth,
      this.testTabHandleFlapRounding,
    );
    return { male, female };
  }

  computeFemaleAscendantFlap(start, end) {
    // female tab outer flap
    const remainderGapAngle = 2 * Math.PI - this.faceInteriorAngles[2] * this.pyramid.geometry.faceCount;
    if (remainderGapAngle < 0) {
      throw new Error('too many faces: the sum of angles at apex is greater than 360 degrees');
    }
    const FLAP_APEX_IMPINGE_MARGIN = Math.PI / 12;
    const FLAP_BASE_ANGLE = degToRad(60);

    const flapApexAngle = Math.min(remainderGapAngle - FLAP_APEX_IMPINGE_MARGIN, this.faceInteriorAngles[2]);
    const outerPt1 = hingedPlotByProjectionDistance(end, start, flapApexAngle, -this.ascendantEdgeTabDepth);
    const outerPt2 = hingedPlotByProjectionDistance(start, end, -FLAP_BASE_ANGLE, this.ascendantEdgeTabDepth);

    return roundedEdgePath(
      [start, outerPt1, outerPt2, end],
      this.ascendantEdgeTabsSpec.flapRoundingDistanceRatio.value,
    );
  }

  @computed
  get femaleAscendantFlap() {
    return this.computeFemaleAscendantFlap(this.faceBoundaryPoints[0], this.faceBoundaryPoints[1]);
  }

  @computed
  get testTabFemaleAscendantFlap() {
    return this.computeFemaleAscendantFlap({ x: this.actualFaceEdgeLengths[0], y: 0 }, this.faceBoundaryPoints[0]);
  }

  @computed
  get interFaceScoreDashSpecForDashing() {
    return this.useDottedStroke ? this.interFaceScoreDashSpec : undefined;
  }

  @computed
  get baseScoreDashSpecForDashing() {
    return this.useDottedStroke ? this.baseScoreDashSpec : undefined;
  }

  @computed
  get nonTabbedAscendantScores() {
    // inter-face scoring
    return this.faceTabFenceposts.slice(1, -1).reduce((path, endPt) => {
      const pathData = strokeDashPath(this.faceBoundaryPoints[0], endPt, this.interFaceScoreDashSpecForDashing);
      return path.concatPath(pathData);
    }, (new PathData()));
  }

  @computed
  get ascendantEdgeTabs() {
    const ascendantTabs = ascendantEdgeConnectionTabs(
      this.faceBoundaryPoints[1],
      this.faceBoundaryPoints[0],
      this.ascendantEdgeTabsSpec,
      this.interFaceScoreDashSpecForDashing,
      this.tabIntervalRatios,
      this.tabGapIntervalRatios,
      this.ascendantEdgeTabDepth,
    );
    const rotationTransform = { rotate: radToDeg(-this.pyramid.facesPerNet * this.faceInteriorAngles[2]) };
    ascendantTabs.male.cut.transformByObject(rotationTransform);
    ascendantTabs.male.score.transformByObject(rotationTransform);
    return ascendantTabs;
  }

  @computed
  get netPaths() {
    const { baseScoreDashSpecForDashing, baseEdgeTabsSpec } = this;
    const { baseTabDepth, faceTabFenceposts } = this;
    const score = new PathData();
    const innerCut = new PathData();
    const boundaryCut = new PathData();

    score.concatPath(this.nonTabbedAscendantScores);
    boundaryCut.concatPath(this.femaleAscendantFlap);
    // base edge tabs
    faceTabFenceposts.slice(0, -1).forEach((edgePt1, index) => {
      const edgePt2 = faceTabFenceposts[index + 1];
      const baseEdgeTab = baseEdgeConnectionTab(
        edgePt1,
        edgePt2,
        baseTabDepth,
        baseEdgeTabsSpec,
        baseScoreDashSpecForDashing,
      );
      appendContinuationPath(boundaryCut, baseEdgeTab.boundaryCut);
      innerCut.concatPath(baseEdgeTab.innerCut);
      score.concatPath(baseEdgeTab.score);
    });
    // male tabs
    appendContinuationPath(boundaryCut, this.ascendantEdgeTabs.male.cut, true);
    score.concatPath(this.ascendantEdgeTabs.male.score);

    // female inner
    innerCut.concatPath(this.ascendantEdgeTabs.female.cut);
    score.concatPath(this.ascendantEdgeTabs.female.score);
    const cut = (new PathData()).concatPath(innerCut).concatPath(boundaryCut);
    return { cut, score };
  }

  @computed
  get decorationCutPath():PathData | null {
    if (!this.texturePathD) { return null; }
    const cut = new PathData();
    const insetDecorationPath = (new PathData(this.texturePathD))
      .transformByObject({ scale: this.faceLengthAdjustRatio })
      .transformByObject(this.borderInsetFaceHoleTransformObject);
    for (const trans of this.faceDecorationTransformMatrices) {
      const tiledDecorationPath = insetDecorationPath.clone().transformByMatrix(trans);
      cut.concatPath(tiledDecorationPath);
    }
    return cut;
  }

  @computed
  get borderInsetFaceHoleTransformObject(): PartialTransformObject {
    const scale = 1 / this.borderToInsetRatio;
    const insetPolygonPoints = offsetPolygonPoints(this.faceBoundaryPoints, -this.ascendantEdgeTabDepth);
    const { x: inX, y: inY } = insetPolygonPoints[0];
    return { translate: [inX, inY], scale };
  }

  @computed
  get borderInsetFaceHoleTransformMatrix(): DOMMatrixReadOnly {
    return convertTransformObjectToDOMMatrixReadOnly(this.borderInsetFaceHoleTransformObject);
  }

  @computed
  get textureBorderWidth() {
    return this.ascendantEdgeTabsSpec.tabDepthToTraversalLength.value
      * FACE_FIRST_EDGE_NORMALIZED_SIZE * this.borderToInsetRatio;
  }

  @computed
  get pathScaleMatrix(): DOMMatrixReadOnly {
    return (new DOMMatrixReadOnly()).scale(this.faceLengthAdjustRatio, this.faceLengthAdjustRatio);
  }

  @computed
  get texturePathD() {
    if (!this.faceDecoration) { return null; }

    if (this.faceDecoration instanceof PositionableFaceDecorationModel) {
      const { pattern, transform: { transformObject } } = this.faceDecoration as PositionableFaceDecorationModel;
      if (pattern instanceof PathFaceDecorationPatternModel) {
        const { pathD, isPositive } = pattern as PathFaceDecorationPatternModel;
        return getBoundedTexturePathD(
          closedPolygonPath(this.normalizedDecorationBoundaryPoints).getD(),
          pathD,
          transformObject,
          isPositive,
        );
      }
    } else if (this.faceDecoration instanceof RawFaceDecorationModel) {
      return this.faceDecoration.dValue;
    }
    // invalid types caught by runtime mst type checking, for linting only
    return null;
  }

  @computed
  get faceDecorationTransformMatrices(): DOMMatrixReadOnly[] {
    const matrices: DOMMatrixReadOnly[] = [];

    for (let i = 0; i < this.pyramid.facesPerNet; i += 1) {
      const isMirrored = !!(i % 2) && !this.pyramid.faceIsSymmetrical;
      const xScale = isMirrored ? -1 : 1;
      const asymmetryNudge = isMirrored
        ? this.faceInteriorAngles[2] - 2 * ((Math.PI / 2) - this.faceInteriorAngles[0]) : 0;
      const baseTabRotationRad = -1 * i * this.faceInteriorAngles[2];
      const decorationRotationRad = xScale * baseTabRotationRad + asymmetryNudge;
      matrices.push((new DOMMatrixReadOnly())
        .scale(xScale, 1).rotate(radToDeg(decorationRotationRad)));
    }
    return matrices;
  }

  @computed
  get faceDecorationSourceFileName(): string | undefined {
    return this.faceDecoration instanceof RawFaceDecorationModel
      ? this.faceDecoration.sourceFileName
      : this.faceDecoration?.pattern?.sourceFileName;
  }

  onAttachedToRootStore() {
    this.persistPreferences();
    // history initialized in onInit
    this.history!.withoutUndo(() => {
      this.applyShapeBasedDefaults();
    });

    const disposers = [
      reaction(() => [this.pyramid.shapeName.value], () => {
        // all geometries have 1 as option, but different shapes have different divisors > 1
        this.pyramid.netsPerPyramid.setValue(1);
        this.applyShapeBasedDefaults();
        this.textureEditor.refitTextureToFace();
      }),
    ];

    return () => {
      for (const disposer of disposers) {
        disposer();
      }
    };
  }

  @modelAction
  resetFaceDecoration() {
    this.faceDecoration = new PositionableFaceDecorationModel({});
  }

  @modelAction
  applyShapeBasedDefaults() {
    // the taller the face triangle, the larger the holeBreadthToHalfWidth value
    const rangeTraversalRatio = (min, max, value) => (value - min) / (max - min);
    const interpolateBetween = (min, max, ratio) => (min + ratio * (max - min));
    const MAX_INVERSE_ASPECT = 2;
    const MIN_INVERSE_ASPECT = 0.5;
    const MIN_BREADTH = 0.3;
    const MAX_BREADTH = 0.6;
    const actualInverseAspect = this.faceBoundaryPoints[1].y / this.actualFaceEdgeLengths[1];
    const clampedInverseAspect = Math.min(Math.max(actualInverseAspect, MIN_INVERSE_ASPECT), MAX_INVERSE_ASPECT);
    const inverseAspectRatio = rangeTraversalRatio(MIN_INVERSE_ASPECT, MAX_INVERSE_ASPECT, clampedInverseAspect);
    this.baseEdgeTabsSpec.holeBreadthToHalfWidth.setValue(
      interpolateBetween(MIN_BREADTH, MAX_BREADTH, inverseAspectRatio),
    );
    this.baseEdgeTabsSpec.finOffsetRatio.setValue(interpolateBetween(0, 0.8, 1 - inverseAspectRatio));
  }

  @computed
  get boundingBox() {
    return getBoundingBoxAttrs(this.netPaths.cut.getD());
  }

  BOUNDARY_MARGIN = 0.1;

  @computed
  get documentArea() {
    return this.netPaths.cut.getBoundingBox();
  }

  @computed
  get assetDefinition() {
    return new RegisteredAssetsDefinition(
      this.documentArea,
      [
        {
          name: 'Print',
          Component: () => (<PrintLayer widgetStore={this} />),
          copies: this.pyramid.copiesNeeded,
        },
        {
          name: 'Dielines',
          Component: () => (<DielinesLayer widgetStore={this} />),
          copies: this.pyramid.copiesNeeded,
        },
      ],
    );
  }

  @action
  setTextureEditorOpen(isOpen) {
    if (this.faceDecoration instanceof RawFaceDecorationModel) {
      // texture editor directly references faceDecoration and will not render TextureSvg if it is Raw
      this.resetFaceDecoration();
    }
    this.textureEditorOpen = isOpen;
  }

  renderDecorationBoundaryToString():string {
    return ReactDOMServer.renderToString(
      <DecorationBoundarySVG normalizedDecorationBoundaryPoints={this.normalizedDecorationBoundaryPoints} />,
    );
  }

  get fileBasename() {
    return `${
      this.pyramid.shapeName.value || 'shape'
    }__${
      this.faceDecorationSourceFileName || 'undecorated'
    }`;
  }

  @action
  persistPreferences() {
    return persist(PREFERENCES_LOCALSTORE_NAME, this.preferences)
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('Failed to persist preferences, likely due to data schema changes, '
          + 'resetting preferences to defaults: ', e.message);
        this.resetPreferences();
        return persist(PREFERENCES_LOCALSTORE_NAME, this.preferences);
      });
  }

  @action
  resetPreferences() {
    localStorage.removeItem(PREFERENCES_LOCALSTORE_NAME);
    this.preferences = new PyramidNetPreferencesModel({});
    this.persistPreferences();
  }

  PanelContent = PanelContent;

  additionalToolbarContent = [{
    tooltipText: 'Open texture editor',
    ButtonIcon: BrushIcon,
    action: () => { this.setTextureEditorOpen(true); },
  }];

  additionalFileMenuItems = additionalFileMenuItemsFactory(this);

  WatermarkContent = LicenseWatermarkContent;
}
