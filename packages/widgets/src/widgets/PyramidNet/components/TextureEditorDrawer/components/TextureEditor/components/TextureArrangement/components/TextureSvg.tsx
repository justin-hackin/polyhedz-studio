import React from 'react';
import { observer } from 'mobx-react';

import { HookReturnType, UseDragConfig } from 'react-use-gesture/dist/types';
import { RawPoint } from 'fluent-svg-path-ts';
import { assertNotNullish, useSelectedStore } from 'svg-widget-studio';
import { scalePoint } from '../../../../../../../../../common/util/geom';
import { TexturePathNodes } from './TexturePathNodes';
import type { PyramidNetWidgetModel } from '../../../../../../../models/PyramidNetWidgetStore';
import { ImageFaceDecorationPatternModel } from '../../../../../../../models/ImageFaceDecorationPatternModel';
import type { TextureEditorModel } from '../../../models/TextureEditorModel';
import { RawFaceDecorationModel } from '../../../../../../../models/RawFaceDecorationModel';
import { PathFaceDecorationPatternModel } from '../../../../../../../models/PathFaceDecorationPatternModel';

const normalizedBoxCoords:RawPoint[] = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }];
const HOLES_COLOR = '#000';
const WHITE = '#fff';
const MUTED_WHITE = '#aaa';

export function TextureSvgUnobserved({
  viewBox = undefined,
  textureTransformationUseDrag = undefined,
  transformOriginUseDrag = undefined,
  store = undefined,
}: {
  textureTransformationUseDrag?: (...args: any[]) => HookReturnType<UseDragConfig>,
  transformOriginUseDrag?: (...args: any[]) => HookReturnType<UseDragConfig>,
  viewBox?: string,
  store?: TextureEditorModel,
}) {
  // must avoid calling useMst (hooks) when using server-side rendering (results in errors about useLayoutEffect)
  const selectedTextureEditor = (useSelectedStore<PyramidNetWidgetModel>()).textureEditor;
  let targetStore;
  if (store) {
    targetStore = store;
  } else {
    assertNotNullish(selectedTextureEditor);
    targetStore = selectedTextureEditor;
  }
  const {
    decorationBoundary: { pathD: decorationBoundaryPathD = '' } = {},
    faceDecoration,
    faceBoundary,
    faceFittingScale,
    placementAreaDimensions,
  } = targetStore;
  if (
    !decorationBoundaryPathD || faceDecoration instanceof RawFaceDecorationModel
    || !faceBoundary || !decorationBoundaryPathD || !placementAreaDimensions || !faceFittingScale
  ) { return null; }

  const isOnScreen = !store;
  const materialColor = isOnScreen ? MUTED_WHITE : WHITE;

  const {
    scaleDragged, transformOriginDragged, transformMatrixDraggedStr, pattern,
  } = faceDecoration || {};

  const scaleAdjust = (scaleDragged * faceFittingScale.scale);
  const FACE_OUTLINE_STROKE = (faceFittingScale.widthIsClamp
    ? placementAreaDimensions.width
    : placementAreaDimensions.height) / 200;
  const CENTER_MARKER_RADIUS = 30 / scaleAdjust;
  const CENTER_MARKER_STROKE = 2 / scaleAdjust;
  const OPACITY = 0.3;
  const CROSSHAIR_START_RATIO = 0.2;
  const DOT_RADIUS_TO_WHOLE = 0.05;
  const TEXTURE_CLIP_ID = 'texture-clip';

  const faceBoundaryFill = (!pattern || pattern instanceof PathFaceDecorationPatternModel)
    ? materialColor : HOLES_COLOR;

  const designBoundaryFill = (() => {
    if (!pattern) {
      return HOLES_COLOR;
    }
    if (pattern instanceof PathFaceDecorationPatternModel) {
      return pattern.isPositive ? HOLES_COLOR : materialColor;
    }
    // some of the color shines through at the edge of design boundary
    return isOnScreen ? MUTED_WHITE : HOLES_COLOR;
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
          stroke={(() => {
            if (!isOnScreen) {
              return faceBoundaryFill;
            }
            // TODO: no magic colors, themify
            return pattern instanceof ImageFaceDecorationPatternModel ? '#ddd' : HOLES_COLOR;
          })()}
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
              if (pattern instanceof PathFaceDecorationPatternModel) {
                const { pathD, isPositive } = pattern;
                return (
                  <path
                    {...(textureTransformationUseDrag ? textureTransformationUseDrag() : undefined)}
                    fill={isPositive ? materialColor : HOLES_COLOR}
                    d={pathD}
                  />
                );
              }
              if (pattern instanceof ImageFaceDecorationPatternModel) {
                const { imageData, dimensions } = pattern;
                // pointerEvents: 'none' solves problem of ghost-drag image
                // see: https://stackoverflow.com/a/26792179/2780052
                return (
                  <image
                    style={{ pointerEvents: 'none' }}
                    xlinkHref={imageData}
                    {...dimensions}
                    {...(textureTransformationUseDrag ? textureTransformationUseDrag() : undefined)}
                  />
                );
              }
              throw new Error('unexpected pattern type');
            })() }

            {isOnScreen && pattern instanceof PathFaceDecorationPatternModel && (<TexturePathNodes />)}

            {isOnScreen && (
              <g
                {...(transformOriginUseDrag ? transformOriginUseDrag() : undefined)}
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
      <path
        fill="none"
        strokeWidth={FACE_OUTLINE_STROKE}
        stroke={isOnScreen ? '#ff0000' : faceBoundaryFill}
        strokeOpacity={isOnScreen ? 0.4 : 1}
        d={decorationBoundaryPathD}
      />
    </svg>
  );
}
export const TextureSvg = observer(TextureSvgUnobserved);
