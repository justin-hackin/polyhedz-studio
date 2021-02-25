import { observer } from 'mobx-react';
import { getType } from 'mobx-state-tree';
import React from 'react';
import { IPreferencesModel } from '../../../../models/PreferencesModel';
import { IPyramidNetFactoryModel } from '../../../../models/PyramidNetMakerStore';
import {
  IImageFaceDecorationPatternModel,
  ImageFaceDecorationPatternModel,
  ITextureFaceDecorationModel,
  TextureFaceDecorationModel,
} from '../../../../models/PyramidNetStore';
import { theme } from '../../../../../TextureTransformEditor';
import { closedPolygonPath } from '../../../../util/shapes/generic';

const PrintGroup = ({ children }) => (
  <g {...{
    id: 'print',
    'inkscape:groupmode': 'layer',
    'inkscape:label': 'Print',
  }}
  >
    {children}
  </g>
);
export const PrintLayer = observer(({
  widgetStore, preferencesStore,
}: {
  preferencesStore: IPreferencesModel, widgetStore: IPyramidNetFactoryModel,
}) => {
  if (!preferencesStore || !widgetStore) {
    return null;
  }
  const {
    fitToCanvasTranslationStr,
    pyramidNetSpec: {
      borderInsetFaceHoleTransformMatrix,
      faceDecoration,
      faceDecorationTransformMatricies,
      faceLengthAdjustRatio,
      faceBoundaryPoints,
    },
  } = widgetStore;

  if (!faceDecoration || getType(faceDecoration) !== TextureFaceDecorationModel) {
    return null;
  }
  const { pattern, transformMatrix } = faceDecoration as ITextureFaceDecorationModel;
  if (getType(pattern) !== ImageFaceDecorationPatternModel) {
    return null;
  }

  const { imageData, dimensions } = pattern as IImageFaceDecorationPatternModel;
  const PRINT_IMAGE_ID = 'print-image';
  const CLIP_PATH_ID = 'clip-path';
  const BLUR_ID = 'blur-filter';
  const FACE_BOUNDARY_PATH_ID = 'face-boundary-path';
  const borderFill = theme.palette.grey['900'];
  const faceBoundaryPath = closedPolygonPath(faceBoundaryPoints);
  const faceBoundaryPathD = faceBoundaryPath.getD();
  const decorationBoundaryPathD = faceBoundaryPath.transform(borderInsetFaceHoleTransformMatrix.toString()).getD();

  return (
    <PrintGroup>
      <defs>
        <path id={FACE_BOUNDARY_PATH_ID} d={faceBoundaryPathD} fill={borderFill} />
        <clipPath id={CLIP_PATH_ID}>
          <use xlinkHref={`#${FACE_BOUNDARY_PATH_ID}`} />
        </clipPath>
        <filter id={BLUR_ID}>
          <feGaussianBlur stdDeviation={0.5} />
        </filter>
      </defs>
      <g transform={fitToCanvasTranslationStr}>
        {
          faceDecorationTransformMatricies.map((cloneTransformMatrix, index) => (index === 0
            ? (
              <g key={index} id={PRINT_IMAGE_ID}>
                <use id="border-fill" xlinkHref={`#${FACE_BOUNDARY_PATH_ID}`} />
                <use
                  id="bleed-stroke"
                  xlinkHref={`#${FACE_BOUNDARY_PATH_ID}`}
                  fill="none"
                  stroke={borderFill}
                  strokeWidth={faceLengthAdjustRatio * 20}
                  strokeLinejoin="round"
                />
                <use
                  id="outer-glow"
                  xlinkHref={`#${FACE_BOUNDARY_PATH_ID}`}
                  fill="none"
                  stroke={theme.palette.grey['50']}
                  strokeWidth={faceLengthAdjustRatio}
                  filter={`url(#${BLUR_ID})`}
                  clipPath={`url(#${CLIP_PATH_ID})`}
                />
                <path
                  id="inner-glow"
                  d={decorationBoundaryPathD}
                  fill="none"
                  stroke={theme.palette.grey['50']}
                  strokeWidth={faceLengthAdjustRatio}
                  filter={`url(#${BLUR_ID})`}
                />

                <g transform={borderInsetFaceHoleTransformMatrix.toString()}>
                  <g clipPath={`url(#${CLIP_PATH_ID})`}>
                    <image
                      xlinkHref={imageData}
                      pointerEvents="bounding-box"
                      {...dimensions}
                      transform={
                          (new DOMMatrixReadOnly())
                            .scale(faceLengthAdjustRatio, faceLengthAdjustRatio)
                            .multiply(transformMatrix)
                            .toString()
                        }
                    />
                  </g>
                </g>
              </g>
            ) : (
              <use
                key={`${index}-decoration`}
                xlinkHref={`#${PRINT_IMAGE_ID}`}
                transform={cloneTransformMatrix.toString()}
              />
            )))
        }
      </g>
    </PrintGroup>
  );
});