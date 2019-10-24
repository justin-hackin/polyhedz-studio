import { subtract } from '@flatten-js/boolean-op';
import { Point, Polygon } from '@flatten-js/core';
import React from 'react';
import range from 'lodash-es/range';
import {
  radToDeg,
  degToRad, hingedPlot,
  hingedPlotByProjectionDistance,
  insetPoints,
  triangleAnglesGivenSides,
} from '../util/geom';
import { PathData } from '../util/path';
import {
  ascendantEdgeConnectionTabs,
  baseEdgeConnectionTab,
  roundedEdgePath,
} from '../util/shapes';

export const PyramidNet = ({ netSpec }) => {
  const { faceEdgeLengths, faceCount } = netSpec;
  const faceInteriorAngles = triangleAnglesGivenSides(faceEdgeLengths);

  const p1 = new Point(0, 0);
  const p2 = p1.add(new Point(faceEdgeLengths[0], 0));

  const v1 = Point.fromPolar([Math.PI - faceInteriorAngles[0], faceEdgeLengths[1]]);

  const subtractPointsArrays = (pts1, pts2) => {
    const polygon1 = new Polygon();
    polygon1.addFace(pts1);

    const polygon2 = new Polygon();
    polygon2.addFace(pts2);

    return subtract(polygon1, polygon2);
  };

  v1.y *= -1;
  const p3 = p2.add(v1);
  const boundaryPoints = [p1, p2, p3];
  const tabThickness = 2;
  const inset = insetPoints(boundaryPoints, tabThickness);

  const borderOverlay = subtractPointsArrays(boundaryPoints, inset);

  const retractionDistance = 2;
  const tabRoundingDistance = 0.3;
  const outerPt1 = hingedPlotByProjectionDistance(p2, p1, faceInteriorAngles[2], -tabThickness);
  const outerPt2 = hingedPlotByProjectionDistance(p1, p2, degToRad(-60), tabThickness);
  const connectionTabsInst = ascendantEdgeConnectionTabs(p2, p1, tabThickness, tabRoundingDistance);
  const plotProps = { fill: 'none', strokeWidth: 0.1 };
  const CUT_COLOR = '#FF244D';
  const SCORE_COLOR = '#BDFF48';
  const cutProps = { ...plotProps, stroke: CUT_COLOR };
  const scoreProps = { ...plotProps, stroke: SCORE_COLOR };

  const faceTabFenceposts = range(faceCount + 1).map(
    (index) => hingedPlot(
      p2, p1, Math.PI * 2 - index * faceInteriorAngles[2],
      index % 2 ? faceEdgeLengths[2] : faceEdgeLengths[0],
    ),
  );

  const borderMaskPathAttrs = borderOverlay.pathAttrs({ stroke: 'none', fill: '#EF9851' });

  const baseEdgeTab = baseEdgeConnectionTab(p2, p3, 5, tabRoundingDistance * 5);
  return (
    <g overflow="visible">
      <symbol id="face-tile" overflow="visible">
        <g>
          <path {...borderMaskPathAttrs} />
        </g>
      </symbol>

      <path {...scoreProps} d={baseEdgeTab.score.getD()} />
      <path {...cutProps} d={baseEdgeTab.cut.getD()} />

      {range(faceCount).map((index) => {
        const isOdd = index % 2;
        const yScale = isOdd ? -1 : 1;
        const rotation = ((index + (isOdd ? 1 : 0)) * faceInteriorAngles[2] * 360 * (isOdd ? 1 : -1)) / (2 * Math.PI);
        return <use key={index} transform={`scale(1 ${yScale}) rotate(${rotation})`} xlinkHref="#face-tile" />;
      })}
      <g transform={`rotate(${radToDeg(-faceCount * faceInteriorAngles[2])})`}>
        <path {...cutProps} d={connectionTabsInst.tabs.getD()} />
      </g>
      <path {...cutProps} d={roundedEdgePath([p1, outerPt1, outerPt2, p2], retractionDistance).getD()} />
      <path {...scoreProps} d={connectionTabsInst.scores.getD()} />
      <path {...cutProps} d={connectionTabsInst.holes.getD()} />
      {}
      {/* eslint-disable-next-line arrow-body-style */}
      {faceTabFenceposts.slice(1, -1).map((endPt, index) => {
        // eslint-disable-next-line react/no-array-index-key
        return (<path key={index} {...scoreProps} d={(new PathData()).move(p1).line(endPt).getD()} />);
      })}
      {faceTabFenceposts.slice(0, -1).map((edgePt1, index) => {
        const edgePt2 = faceTabFenceposts[index + 1];
        const tabPaths = baseEdgeConnectionTab(edgePt1, edgePt2, 5, tabRoundingDistance * 5);
        return (
          <g>
            <path {...cutProps} d={tabPaths.cut.getD()} />
            <path {...scoreProps} d={tabPaths.score.getD()} />
          </g>
        );
      })}
    </g>
  );
};
