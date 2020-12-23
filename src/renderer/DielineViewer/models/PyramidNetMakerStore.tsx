/* eslint-disable max-classes-per-file,no-param-reassign */
import { range } from 'lodash';
import {
  Instance, types, tryResolve,
} from 'mobx-state-tree';
import ReactDOMServer from 'react-dom/server';
import React from 'react';

import {
  degToRad,
  hingedPlot,
  hingedPlotByProjectionDistance, radToDeg,
} from '../../common/util/geom';
import { polyhedra } from '../data/polyhedra';
import { defaultModelData, PyramidNetModel } from './PyramidNetStore';
import { closedPolygonPath, roundedEdgePath } from '../util/shapes/generic';
import { boundingViewBoxAttrs, pathDToViewBoxStr } from '../../../common/util/svg';
import { dashPatterns, DashPatternsModel } from '../data/dash-patterns';
import { EVENTS } from '../../../main/ipc';
import { PathData } from '../util/PathData';
import { strokeDashPath } from '../util/shapes/strokeDashPath';
import { baseEdgeConnectionTab } from '../util/shapes/baseEdgeConnectionTab';
import { ascendantEdgeConnectionTabs } from '../util/shapes/ascendantEdgeConnectionTabs';
import { UndoManagerWithGroupState } from '../../common/components/UndoManagerWithGroupState';

export const DecorationBoundarySVG = ({ store }: { store: IPyramidNetFactoryModel }) => {
  const {
    // @ts-ignore
    pyramidNetSpec: { normalizedDecorationBoundaryPoints },
  } = store;
  const normalizedDecorationBoundaryPathD = closedPolygonPath(normalizedDecorationBoundaryPoints).getD();

  return (
    <svg viewBox={pathDToViewBoxStr(normalizedDecorationBoundaryPathD)}>
      <path fill="#FFD900" stroke="#000" d={normalizedDecorationBoundaryPathD} />
    </svg>
  );
};

export const PyramidNetFactoryModel = types.model('PyramidNetFactory', {
  pyramidNetSpec: types.optional(PyramidNetModel, defaultModelData),
  polyhedraPyramidGeometries: types.frozen(polyhedra),
  dashPatterns: types.optional(DashPatternsModel, dashPatterns),
  // TODO: make a prototype with history as property and use on all undoable models
  history: types.optional(UndoManagerWithGroupState, {}),
}).views((self) => ({
  get shapeDefinition() {
    return self.pyramidNetSpec;
  },
  get makePaths() {
    const {
      pyramid: {
        geometry: { faceCount },
      },
      interFaceScoreDashSpec, baseScoreDashSpec,
      ascendantEdgeTabsSpec, baseEdgeTabsSpec,
      tabIntervalRatios, tabGapIntervalRatios,
      faceBoundaryPoints, faceInteriorAngles,
      actualFaceEdgeLengths, ascendantEdgeTabDepth,
    } = self.pyramidNetSpec;
    const cut = new PathData();
    const score = new PathData();
    // inter-face scoring
    const faceTabFenceposts = range(faceCount + 1).map(
      (index) => hingedPlot(
        faceBoundaryPoints[1], faceBoundaryPoints[0], Math.PI * 2 - index * faceInteriorAngles[2],
        index % 2 ? actualFaceEdgeLengths[2] : actualFaceEdgeLengths[0],
      ),
    );
    faceTabFenceposts.slice(1, -1).forEach((endPt) => {
      const pathData = strokeDashPath(faceBoundaryPoints[0], endPt, interFaceScoreDashSpec);
      score.concatPath(pathData);
    });

    // female tab outer flap
    const remainderGapAngle = 2 * Math.PI - faceInteriorAngles[2] * faceCount;
    if (remainderGapAngle < 0) {
      throw new Error('too many faces: the sum of angles at apex is greater than 360 degrees');
    }
    const FLAP_APEX_IMPINGE_MARGIN = Math.PI / 12;
    const FLAP_BASE_ANGLE = degToRad(60);

    const flapApexAngle = Math.min(remainderGapAngle - FLAP_APEX_IMPINGE_MARGIN, faceInteriorAngles[2]);
    const outerPt1 = hingedPlotByProjectionDistance(
      faceBoundaryPoints[1], faceBoundaryPoints[0], flapApexAngle, -ascendantEdgeTabDepth,
    );
    const outerPt2 = hingedPlotByProjectionDistance(
      faceBoundaryPoints[0], faceBoundaryPoints[1], -FLAP_BASE_ANGLE, ascendantEdgeTabDepth,
    );

    cut.concatPath(
      roundedEdgePath(
        [faceBoundaryPoints[0], outerPt1, outerPt2, faceBoundaryPoints[1]],
        ascendantEdgeTabsSpec.flapRoundingDistanceRatio,
      ),
    );

    // base edge tabs
    faceTabFenceposts.slice(0, -1).forEach((edgePt1, index) => {
      const edgePt2 = faceTabFenceposts[index + 1];
      const baseEdgeTab = baseEdgeConnectionTab(
        edgePt1, edgePt2, ascendantEdgeTabDepth, baseEdgeTabsSpec, baseScoreDashSpec,
      );
      cut.concatPath(baseEdgeTab.cut);
      score.concatPath(baseEdgeTab.score);
    });

    // male tabs
    const ascendantTabs = ascendantEdgeConnectionTabs(
      faceBoundaryPoints[1], faceBoundaryPoints[0],
      ascendantEdgeTabsSpec, interFaceScoreDashSpec, tabIntervalRatios, tabGapIntervalRatios,
    );
    const rotationMatrix = `rotate(${radToDeg(-faceCount * faceInteriorAngles[2])})`;
    ascendantTabs.male.cut.transform(rotationMatrix);
    ascendantTabs.male.score.transform(rotationMatrix);
    cut.concatPath(ascendantTabs.male.cut);
    score.concatPath(ascendantTabs.male.score);

    // female inner
    cut.concatPath(ascendantTabs.female.cut);
    score.concatPath(ascendantTabs.female.score);
    const { activeCutHolePatternD } = self.pyramidNetSpec;
    if (activeCutHolePatternD) {
      const insetDecorationPath = (new PathData(activeCutHolePatternD))
        .transform(`${
          self.pyramidNetSpec.borderInsetFaceHoleTransformMatrix.toString()} ${
          self.pyramidNetSpec.pathScaleMatrix.toString()}`);
      range(faceCount).forEach((index) => {
        const isOdd = !!(index % 2);
        const xScale = isOdd ? -1 : 1;
        const asymetryNudge = isOdd ? faceInteriorAngles[2] - 2 * ((Math.PI / 2) - faceInteriorAngles[0]) : 0;
        const rotationRad = -1 * xScale * index * faceInteriorAngles[2] + asymetryNudge;
        const tiledDecorationPath = (new PathData()).concatPath(insetDecorationPath)
          .transform(`scale(${xScale}, 1) rotate(${radToDeg(rotationRad)})`);
        cut.concatPath(tiledDecorationPath);
      });
    }
    return { cut, score };
  },
  get fitToCanvasTranslation() {
    const { xmin, ymin } = boundingViewBoxAttrs(this.makePaths.cut.getD());
    return { x: -xmin, y: -ymin };
  },
})).actions((self) => ({
  sendShapeUpdate() {
    // @ts-ignore
    self.pyramidNetSpec.sendTextureUpdate();
    self.pyramidNetSpec.sendTextureBorderData();
  },
  renderDecorationBoundaryToString():string {
    // @ts-ignore
    return ReactDOMServer.renderToString(React.createElement(DecorationBoundarySVG, { store: self }));
  },

  getFileBasename() {
    return `${
      tryResolve(self, '/pyramidNetSpec/pyramid/shapeName') || 'shape'
    }__${
      tryResolve(self, '/pyramidNetSpec/faceDecoration/pattern/sourceFileName') || 'undecorated'
    }`;
  },
})).actions((self) => {
  const updateDielineHandler = (e, faceDecoration) => {
    self.pyramidNetSpec.setFaceDecoration(faceDecoration);
  };
  const sendShapeUpdateHandler = () => { self.sendShapeUpdate(); };

  return {
    afterCreate() {
      globalThis.ipcRenderer.on(EVENTS.REQUEST_SHAPE_UPDATE, sendShapeUpdateHandler);
      globalThis.ipcRenderer.on(EVENTS.UPDATE_DIELINE_VIEWER, updateDielineHandler);
    },
    beforeDestroy() {
      globalThis.ipcRenderer.removeListener(EVENTS.UPDATE_DIELINE_VIEWER, updateDielineHandler);
      globalThis.ipcRenderer.removeListener(EVENTS.REQUEST_SHAPE_UPDATE, updateDielineHandler);
    },
  };
});

export interface IPyramidNetFactoryModel extends Instance<typeof PyramidNetFactoryModel> {}
