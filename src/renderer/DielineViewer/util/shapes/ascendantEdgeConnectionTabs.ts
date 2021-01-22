// @ts-ignore
import { range } from 'lodash';
import { Instance, types } from 'mobx-state-tree';

import { PathData } from '../PathData';
import {
  distanceFromOrigin, hingedPlot,
  lineLerp,
  RawPoint,
  subtractPoints,
  symmetricHingePlotByProjectionDistance,
} from '../../../common/util/geom';
import { IDashPatternModel, strokeDashPathRatios } from './strokeDashPath';
import { subtractRangeSet } from '../../data/range';
import { connectedLineSegments } from './generic';

export const AscendantEdgeTabsModel = types.model({
  flapRoundingDistanceRatio: types.number,
  holeFlapTaperAngle: types.number,
  holeReachToTabDepth: types.number,
  holeWidthRatio: types.number,
  midpointDepthToTabDepth: types.number,
  tabDepthToTraversalLength: types.number,
  tabStartGapToTabDepth: types.number,
  tabControlPointsProtrusion: types.number,
  tabControlPointsAngle: types.number,
  tabEdgeEndpointsIndentation: types.number,
  tabsCount: types.integer,
});

export interface IAscendantEdgeTabsModel extends Instance<typeof AscendantEdgeTabsModel> {
}

export const ascendantEdgeConnectionTabs = (
  start: RawPoint, end: RawPoint,
  tabSpec: IAscendantEdgeTabsModel, scoreDashSpec: IDashPatternModel, tabIntervalRatios, tabGapIntervalRatios,
): AscendantEdgeConnectionPaths => {
  const {
    holeFlapTaperAngle,
    holeReachToTabDepth,
    tabDepthToTraversalLength,
    tabsCount,
    tabControlPointsProtrusion,
    tabControlPointsAngle,
    tabEdgeEndpointsIndentation,
  } = tabSpec;

  const getTabBaseInterval = (tabNum) => [
    lineLerp(start, end, tabIntervalRatios[tabNum][0]),
    lineLerp(start, end, tabIntervalRatios[tabNum][1]),
  ];

  const commands = {
    female: {
      cut: (new PathData()),
      score: (new PathData()),
    },
    male: {
      cut: (new PathData()).move(start),
      score: (new PathData()),
    },
  };
  const vector = subtractPoints(end, start);
  const vectorLength = distanceFromOrigin(vector);
  const tabDepth = tabDepthToTraversalLength * vectorLength;
  range(0, tabsCount).forEach((tabNum) => {
    const [tabBaseStart, tabBaseEnd] = getTabBaseInterval(tabNum);
    const [holeEdgeStart, holeEdgeEnd] = symmetricHingePlotByProjectionDistance(
      tabBaseStart, tabBaseEnd, -Math.PI / 2 + holeFlapTaperAngle, holeReachToTabDepth * -tabDepth,
    );
    const [tabEdgeStartUnindented, tabEdgeEndUnindented] = symmetricHingePlotByProjectionDistance(
      tabBaseStart, tabBaseEnd, Math.PI / 2, tabDepth,
    );
    const controlPointDistance = tabDepth * tabControlPointsProtrusion;
    const edgeInsetDistance = tabEdgeEndpointsIndentation * tabDepth;
    const baseControlAngleMux = tabControlPointsAngle * (Math.PI / 2);
    const tabEdgeStart = hingedPlot(tabEdgeEndUnindented, tabEdgeStartUnindented, 0, edgeInsetDistance);
    const tabEdgeEnd = hingedPlot(tabEdgeStartUnindented, tabEdgeEndUnindented, 0, edgeInsetDistance);
    const baseControlPointStart = hingedPlot(
      tabBaseEnd, tabBaseStart, Math.PI - baseControlAngleMux, controlPointDistance,
    );
    const baseControlPointEnd = hingedPlot(
      tabBaseStart, tabBaseEnd, Math.PI + baseControlAngleMux, controlPointDistance,
    );
    const edgeControlPointStart = hingedPlot(tabEdgeEnd, tabEdgeStart, Math.PI, controlPointDistance);
    const edgeControlPointEnd = hingedPlot(tabEdgeStart, tabEdgeEnd, Math.PI, controlPointDistance);

    commands.male.cut.line(tabBaseStart)
      .cubicBezier(baseControlPointStart, edgeControlPointStart, tabEdgeStart)
      .line(tabEdgeEnd)
      .cubicBezier(edgeControlPointEnd, baseControlPointEnd, tabBaseEnd);

    commands.female.cut.concatPath(connectedLineSegments(
      [tabBaseStart, holeEdgeStart, holeEdgeEnd, tabBaseEnd],
    ));
  });

  commands.male.cut.line(end);
  const dashRatios = strokeDashPathRatios(start, end, scoreDashSpec);
  const tabDashRatios = subtractRangeSet(dashRatios, tabIntervalRatios);
  const tabGapDashRatios = subtractRangeSet(dashRatios, tabGapIntervalRatios);

  for (const [femaleStart, femaleEnd] of tabDashRatios) {
    commands.female.score.move(lineLerp(start, end, femaleStart)).line(lineLerp(start, end, femaleEnd));
  }
  for (const [maleStart, maleEnd] of tabGapDashRatios) {
    commands.male.score.move(lineLerp(start, end, maleStart)).line(lineLerp(start, end, maleEnd));
  }
  return commands;
};

interface AscendantEdgeConnectionPaths {
  female: {
    cut: PathData,
    score: PathData,
  }
  male: {
    cut: PathData,
    score: PathData,
  }
}
