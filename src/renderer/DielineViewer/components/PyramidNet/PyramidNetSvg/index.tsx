// @ts-ignore
import React from 'react';
import { range } from 'lodash';
import { getType } from 'mobx-state-tree';
import { observer } from 'mobx-react';
import { IPreferencesModel } from '../../../models/PreferencesModel';
import { IPyramidNetFactoryModel } from '../../../models/PyramidNetMakerStore';
import {
  lineLerp, matrixWithTransformOrigin, radToDeg,
// eslint-disable-next-line import/named
} from '../../../../common/util/geom';
import {
  IImageFaceDecorationPatternModel,
  ImageFaceDecorationPatternModel,
  ITextureFaceDecorationModel, TextureFaceDecorationModel,
} from '../../../models/PyramidNetStore';
import { closedPolygonPath } from '../../../util/shapes/generic';
import { theme } from '../../../../TextureTransformEditor';

const DielineGroup = ({ children }) => (
  <g {...{
    id: 'dielines',
    'inkscape:groupmode': 'layer',
    'inkscape:label': 'Dielines',
  }}
  >
    {children}
  </g>
);

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

const PrintLayer = observer(({
  widgetStore, preferencesStore,
}:{
  preferencesStore: IPreferencesModel, widgetStore: IPyramidNetFactoryModel,
}) => {
  if (!preferencesStore || !widgetStore) { return null; }
  const {
    fitToCanvasTranslationStr,
    pyramidNetSpec: {
      borderInsetFaceHoleTransformMatrix, faceInteriorAngles,
      faceDecoration,
      faceLengthAdjustRatio,
      faceBoundaryPoints,
      pyramid: { geometry: { faceCount } },
    },
  } = widgetStore;

  if (!faceDecoration || getType(faceDecoration) !== TextureFaceDecorationModel) { return null; }
  const { pattern, transformMatrix } = faceDecoration as ITextureFaceDecorationModel;
  if (getType(pattern) !== ImageFaceDecorationPatternModel) { return null; }

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
          range(faceCount).map((index) => {
            const isOdd = !!(index % 2);
            const xScale = isOdd ? -1 : 1;
            const asymmetryNudge = isOdd ? faceInteriorAngles[2] - 2 * ((Math.PI / 2) - faceInteriorAngles[0]) : 0;
            const decorationRotationRad = -1 * index * faceInteriorAngles[2] * xScale + asymmetryNudge;

            const cloneTransformMatrix = (new DOMMatrixReadOnly())
              .scale(xScale, 1).rotate(radToDeg(decorationRotationRad));
            // noinspection HtmlDeprecatedTag
            return index === 0
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
                  transform={
                    cloneTransformMatrix.toString()
                  }
                />
              );
          })
        }
      </g>
    </PrintGroup>
  );
});

export const DielinesLayer = observer(({
  widgetStore, preferencesStore,
}:{
  preferencesStore: IPreferencesModel, widgetStore: IPyramidNetFactoryModel,
}) => {
  if (!preferencesStore || !widgetStore) { return null; }
  const {
    fitToCanvasTranslationStr,
    pyramidNetSpec: {
      masterBaseTab,
      makePaths: { cut, score },
      useClones, texturePathD, pathScaleMatrix, borderInsetFaceHoleTransformMatrix, faceInteriorAngles,
      faceBoundaryPoints,
      pyramid: { geometry: { faceCount } },
      femaleAscendantFlap, ascendantEdgeTabs, nonTabbedAscendantScores,
    },
  } = widgetStore;

  const { cutProps, scoreProps } = preferencesStore;
  const allCutProps = { ...cutProps, fill: 'none' };
  const allScoreProps = { ...scoreProps, fill: 'none' };

  const CloneContent = () => {
    const CUT_HOLES_ID = 'cut-holes';
    const BASE_TAB_ID = 'base-tab';
    const faceMasterBaseMidpoint = lineLerp(faceBoundaryPoints[1], faceBoundaryPoints[2], 0.5);

    return (
      <>
        <path d={ascendantEdgeTabs.male.score.getD()} {...allScoreProps} />
        <path d={ascendantEdgeTabs.male.cut.getD()} {...allCutProps} />
        <path d={ascendantEdgeTabs.female.score.getD()} {...allScoreProps} />
        <path d={ascendantEdgeTabs.female.cut.getD()} {...allCutProps} />
        <path d={femaleAscendantFlap.getD()} {...allCutProps} />
        <path d={nonTabbedAscendantScores.getD()} {...allScoreProps} />

        {range(faceCount).map((index) => {
          const isOdd = !!(index % 2);
          const xScale = isOdd ? -1 : 1;
          const asymmetryNudge = isOdd ? faceInteriorAngles[2] - 2 * ((Math.PI / 2) - faceInteriorAngles[0]) : 0;
          const baseTabRotationRad = -1 * index * faceInteriorAngles[2];
          const decorationRotationRad = xScale * baseTabRotationRad + asymmetryNudge;
          const cloneTransformMatrix = (new DOMMatrixReadOnly())
            .scale(xScale, 1).rotate(radToDeg(decorationRotationRad));

          return index === 0
            ? (
              <>
                <g key={index} id={CUT_HOLES_ID} transform={borderInsetFaceHoleTransformMatrix.toString()}>
                  {texturePathD && (
                  <path d={texturePathD} transform={pathScaleMatrix.toString()} {...allCutProps} />
                  )}
                </g>
                <g id={BASE_TAB_ID}>
                  <path d={masterBaseTab.cut.getD()} {...allCutProps} />
                  <path d={masterBaseTab.score.getD()} {...allScoreProps} />
                </g>
              </>
            ) : (
              <>
                <use
                  key={`${index}-decoration`}
                  xlinkHref={`#${CUT_HOLES_ID}`}
                  transform={
                  cloneTransformMatrix.toString()
                }
                />
                <g key={`${index}-base-tab`} transform={cloneTransformMatrix.toString()}>
                  <use
                    xlinkHref={`#${BASE_TAB_ID}`}
                    transform={matrixWithTransformOrigin(
                      faceMasterBaseMidpoint,
                      (new DOMMatrixReadOnly()).scale(isOdd ? -1 : 1, 1),
                    ).toString()}
                  />
                </g>
              </>
            );
        })}
      </>
    );
  };

  return (
    <>
      <DielineGroup>
        <g transform={fitToCanvasTranslationStr}>
          {useClones ? (<CloneContent />) : (
            <>
              <path className="score" {...allScoreProps} d={score.getD()} />
              <path className="cut" {...allCutProps} d={cut.getD()} />
            </>
          )}
        </g>
      </DielineGroup>
    </>
  );
});

export const PyramidNet = ({
  widgetStore, preferencesStore,
}:{
  preferencesStore: IPreferencesModel, widgetStore: IPyramidNetFactoryModel,
}) => (
  <>
    <DielinesLayer preferencesStore={preferencesStore} widgetStore={widgetStore} />
    <PrintLayer preferencesStore={preferencesStore} widgetStore={widgetStore} />
  </>
);
