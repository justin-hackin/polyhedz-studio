import React from 'react';
import { observer } from 'mobx-react';
import { expandBoundingBoxAttrs, toRectangleCoordinatesAttrs } from 'svg-widget-studio';
import { lineLerp, matrixWithTransformOrigin } from '../../../common/util/geom';
import { registrationMarksPath } from '../../../common/util/svg';
import type { PyramidNetWidgetModel } from '../models/PyramidNetWidgetStore';
import { ImageFaceDecorationPatternModel } from '../models/ImageFaceDecorationPatternModel';
import { PositionableFaceDecorationModel } from '../models/PositionableFaceDecorationModel';
import { PRINT_REGISTRATION_TYPES } from '@/widgets/PyramidNet/types';

function DielineGroup({ children }) {
  return (
    <g {...{
      id: 'dielines',
      'inkscape:groupmode': 'layer',
      'inkscape:label': 'Dielines',
    }}
    >
      {children}
    </g>
  );
}

export const DielinesLayer = observer(({
  widgetStore,
}: {
  widgetStore: PyramidNetWidgetModel,
}) => {
  if (!widgetStore) {
    return null;
  }
  const {
    textureEditor: { faceDecoration } = {},
    boundingBox,
    faceLengthAdjustRatio,
    masterBaseTabCut,
    masterBaseTabScore,
    netPaths: { cut, score },
    pyramid: { faceIsSymmetrical },
    decorationCutPath,
    faceDecorationTransformMatrices,
    texturePathD, pathScaleMatrix, borderInsetFaceHoleTransformMatrix,
    faceBoundaryPoints,
    femaleAscendantFlap, ascendantEdgeTabs, nonTabbedAscendantScores,
    preferences: {
      outerCutProps, innerCutProps, scoreProps,
      useClonesForBaseTabs: { value: useClonesForBaseTabs },
      useClonesForDecoration: { value: useClonesForDecoration },
      printRegistrationType: { value: printRegistrationType },
      registrationPadding: { value: registrationPadding },
      registrationStrokeColor: { value: registrationStrokeColor },
      registrationMarkLength: { value: registrationMarkLength },
    },
  } = widgetStore;

  const printRegistrationBB = printRegistrationType === PRINT_REGISTRATION_TYPES.NONE
    ? boundingBox : expandBoundingBoxAttrs(boundingBox, registrationPadding);
  // graphtec type frames with rectangle but laser type has registration L marks facing outward

  function DecorationContent() {
    if (!texturePathD || !decorationCutPath) {
      return null;
    }
    const DECORATION_CUT_ID = 'face-decoration-cut';
    if (!useClonesForDecoration) {
      return (<path id={DECORATION_CUT_ID} {...innerCutProps} d={decorationCutPath.getD()} />);
    }
    const CUT_HOLES_ID = 'cut-holes-master';
    return (
      <g id={DECORATION_CUT_ID}>
        {faceDecorationTransformMatrices.map((cloneTransformMatrix, index) => (index === 0
          ? (
            <g key={`${index}-decoration`} id={CUT_HOLES_ID} transform={borderInsetFaceHoleTransformMatrix.toString()}>
              {texturePathD && (
              <path
                d={texturePathD}
                transform={pathScaleMatrix.toString()}
                {
                ...{ ...innerCutProps, strokeWidth: innerCutProps.strokeWidth / faceLengthAdjustRatio }
              }
              />
              )}
            </g>
          ) : (
            <use
              key={`${index}-decoration`}
              xlinkHref={`#${CUT_HOLES_ID}`}
              transform={
                    cloneTransformMatrix.toString()
                  }
            />
          )))}
      </g>
    );
  }

  function ClonePyramidNetContent() {
    const BASE_TAB_ID = 'base-tab';
    const faceMasterBaseMidpoint = lineLerp(faceBoundaryPoints[1], faceBoundaryPoints[2], 0.5);

    return (
      <>
        <path d={ascendantEdgeTabs.male.score.getD()} {...scoreProps} />
        <path d={ascendantEdgeTabs.male.cut.getD()} {...outerCutProps} />
        <path d={ascendantEdgeTabs.female.score.getD()} {...scoreProps} />
        <path d={ascendantEdgeTabs.female.cut.getD()} {...outerCutProps} />
        <path d={femaleAscendantFlap.getD()} {...outerCutProps} />
        <path d={nonTabbedAscendantScores.getD()} {...scoreProps} />

        {faceDecorationTransformMatrices.map((cloneTransformMatrix, index) => {
          const isMirrored = !!(index % 2) && !faceIsSymmetrical;
          const key = `${index}-base-tab`;
          return index === 0
            ? (
              <g key={key} id={BASE_TAB_ID}>
                <path d={masterBaseTabCut.getD()} {...outerCutProps} />
                <path d={masterBaseTabScore.getD()} {...scoreProps} />
              </g>
            ) : (
              <g key={key} transform={cloneTransformMatrix.toString()}>
                <use
                  xlinkHref={`#${BASE_TAB_ID}`}
                  transform={matrixWithTransformOrigin(
                    faceMasterBaseMidpoint,
                    (new DOMMatrixReadOnly()).scale(isMirrored ? -1 : 1, 1),
                  ).toString()}
                />
              </g>
            );
        })}
      </>
    );
  }

  return (
    <DielineGroup>
      <g>
        {
            faceDecoration instanceof PositionableFaceDecorationModel
            && faceDecoration?.pattern instanceof ImageFaceDecorationPatternModel
          && (printRegistrationType === PRINT_REGISTRATION_TYPES.GRAPHTEC_OPTICAL ? (
            <rect stroke="black" fill="none" {...toRectangleCoordinatesAttrs(printRegistrationBB)} />
          ) : (
            <path
              className="dieline-registration-marks"
              stroke={registrationStrokeColor}
              fill="none"
              strokeWidth={1}
              d={registrationMarksPath(printRegistrationBB, registrationMarkLength, true).getD()}
            />
          ))
          }
        <DecorationContent />
        {useClonesForBaseTabs ? (<ClonePyramidNetContent />) : (
          <>
            <path className="net-score" {...scoreProps} d={score.getD()} />
            <path className="net-cut" {...outerCutProps} d={cut.getD()} />
          </>
        )}
      </g>
    </DielineGroup>
  );
});
