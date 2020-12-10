import React from 'react';
import { observer } from 'mobx-react';

import { RawPoint, scalePoint } from '../../common/util/geom';
import { TexturePathNodes } from './TexturePathNodes';
import { useMst } from '../models';
import {
  IImageFaceDecorationPatternModel,
  IPathFaceDecorationPatternModel,
} from '../../DielineViewer/models/PyramidNetStore';

const normalizedBoxCoords:RawPoint[] = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }];
const HOLES_COLOR = '#222';
const MATERIAL_COLOR = '#ffaa00';
const IMAGE_TEXTURE_DESIGN_BOUNDARY_FILL = '#00ff00';

export const TextureSvgUnobserved = ({
  viewBox = undefined,
  textureTranslationUseDrag = () => {},
  transformOriginUseDrag = () => {},
  store = undefined,
}) => {
  // must avoid calling useMst (hooks) when using server-side rendering (results in errors about useLayoutEffect)
  const {
    decorationBoundary: { pathD: decorationBoundaryPathD = '' } = {},
    texture,
    faceBoundary,
    faceFittingScale,
    placementAreaDimensions,
  } = store || useMst();
  const isOnScreen = !store;

  // TODO: consider if passing props from parent is more apt than useMst
  if (!decorationBoundaryPathD) { return null; }
  const {
    scale: textureScale, transformOriginDragged, transformMatrixDraggedStr, hasPathPattern, pattern,
  } = texture || {};

  if (!faceBoundary || !decorationBoundaryPathD) { return null; }
  const scaleAdjust = (textureScale * faceFittingScale.scale);
  const FACE_OUTLINE_STROKE = (faceFittingScale.widthIsClamp
    ? placementAreaDimensions.width
    : placementAreaDimensions.height) / 200;
  const CENTER_MARKER_RADIUS = 30 / scaleAdjust;
  const CENTER_MARKER_STROKE = 2 / scaleAdjust;
  const OPACITY = 0.3;
  const CROSSHAIR_START_RATIO = 0.2;
  const DOT_RADIUS_TO_WHOLE = 0.05;
  const TEXTURE_CLIP_ID = 'texture-clip';

  const faceBoundaryFill = (!pattern || hasPathPattern) ? MATERIAL_COLOR : HOLES_COLOR;

  const designBoundaryFill = (() => {
    if (!pattern) {
      return HOLES_COLOR;
    }
    if (hasPathPattern) {
      return pattern.isPositive ? HOLES_COLOR : MATERIAL_COLOR;
    }
    // some of the color shines through at the edge of design boundary
    return isOnScreen ? IMAGE_TEXTURE_DESIGN_BOUNDARY_FILL : HOLES_COLOR;
  })();

  return (
    <svg {...{
      xmlns: 'http://www.w3.org/2000/svg',
      xmlnsXlink: 'http://www.w3.org/1999/xlink',
      overflow: 'visible',
      viewBox,
    }}
    >
      <defs>
        <marker
          style={{ overflow: 'visible' }}
          id="Arrow1Lend"
          refX="0"
          refY="0"
          orient="auto"
        >
          <path
            transform="translate(-4, 0) scale(-0.3, 0.3)"
            style={{
              fill: '#000000',
              fillOpacity: 1,
              fillRule: 'evenodd',
              stroke: '#000000',
              strokeWidth: '1pt',
              strokeOpacity: 1,
            }}
            d="M 0,0 5,-5 -12.5,0 5,5 Z"
            id="path838"
          />
        </marker>
      </defs>

      <clipPath id={TEXTURE_CLIP_ID}>
        <path d={decorationBoundaryPathD} />
      </clipPath>

      {faceBoundary
      && (
        <path
          stroke={hasPathPattern === false ? '#ddd' : HOLES_COLOR}
          strokeWidth={FACE_OUTLINE_STROKE}
          fill={faceBoundaryFill}
          d={faceBoundary.pathD}
        />
      )}

      <path
        fill={designBoundaryFill}
        d={decorationBoundaryPathD}
      />

      {pattern && (
        <g clipPath={isOnScreen ? undefined : `url(#${TEXTURE_CLIP_ID})`}>
          <g transform={transformMatrixDraggedStr}>
            { (() => {
              if (hasPathPattern) {
                const { pathD, isPositive } = pattern as IPathFaceDecorationPatternModel;
                return (
                  <path
                    pointerEvents="bounding-box"
                    {...textureTranslationUseDrag()}
                    fill={isPositive ? MATERIAL_COLOR : HOLES_COLOR}
                    d={pathD}
                  />
                );
              }
              const { imageData, dimensions } = pattern as IImageFaceDecorationPatternModel;
              return (
                <image
                  xlinkHref={imageData}
                  pointerEvents="bounding-box"
                  {...dimensions}
                  {...textureTranslationUseDrag()}
                />
              );
            })() }

            {isOnScreen && hasPathPattern && (<TexturePathNodes />)}

            {isOnScreen && (
              <g
                {...transformOriginUseDrag()}
                transform={`translate(${transformOriginDragged.x}, ${transformOriginDragged.y})`}
              >
                <circle
                  r={CENTER_MARKER_RADIUS}
                  fill="red"
                  fillOpacity={OPACITY}
                  stroke="red"
                  strokeOpacity={1 - OPACITY}
                  strokeWidth={CENTER_MARKER_STROKE}
                  cx={0}
                  cy={0}
                />
                {normalizedBoxCoords.map((coords, index) => {
                  const end = scalePoint(coords, CENTER_MARKER_RADIUS);
                  const start = scalePoint(coords, CENTER_MARKER_RADIUS * CROSSHAIR_START_RATIO);
                  return (
                    <line
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      key={index}
                      stroke="#000"
                      opacity={OPACITY + 0.4}
                      markerEnd={index === 2 ? 'url(#Arrow1Lend)' : ''}
                      strokeWidth={CENTER_MARKER_STROKE}
                    />
                  );
                })}
                <circle
                  r={DOT_RADIUS_TO_WHOLE * CENTER_MARKER_RADIUS}
                  fill="black"
                  cx={0}
                  cy={0}
                  opacity={OPACITY + 0.4}
                />
              </g>
            )}
          </g>
        </g>
      )}
      {isOnScreen && (
        <path
          fill="none"
          strokeWidth={FACE_OUTLINE_STROKE}
          stroke="#ff0000"
          strokeOpacity={0.4}
          d={decorationBoundaryPathD}
        />
      )}
    </svg>
  );
};
export const TextureSvg = observer(TextureSvgUnobserved);
