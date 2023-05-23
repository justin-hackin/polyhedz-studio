import React from 'react';
import { SVGWrapper } from '@/common/components/SVGWrapper';
import { RawPoint } from '@/common/PathData';
import { closedPolygonPath } from '../../../common/shapes/generic';
import { pathDToViewBoxStr } from '../../../common/util/svg';

export function DecorationBoundarySVG(
  { normalizedDecorationBoundaryPoints }: { normalizedDecorationBoundaryPoints: RawPoint[] },
) {
  const normalizedDecorationBoundaryPathD = closedPolygonPath(normalizedDecorationBoundaryPoints)
    .getD();

  return (
    <SVGWrapper documentAreaProps={{ viewBox: pathDToViewBoxStr(normalizedDecorationBoundaryPathD) }}>
      <path fill="#FFD900" stroke="#000" d={normalizedDecorationBoundaryPathD} />
    </SVGWrapper>
  );
}
