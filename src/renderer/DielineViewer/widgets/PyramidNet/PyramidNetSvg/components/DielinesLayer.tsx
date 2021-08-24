import React from 'react';
import { observer } from 'mobx-react';
import { IPreferencesModel, PRINT_REGISTRATION_TYPES } from '../../../../models/PreferencesModel';
import { IPyramidNetPluginModel } from '../../../../models/PyramidNetMakerStore';
import {
  lineLerp,
  matrixWithTransformOrigin,
  pointToTranslateString,
  scalePoint,
} from '../../../../../../common/util/geom';
import {
  boundingBoxMinPoint,
  expandBoundingBoxAttrs, registrationMarksPath,
  toRectangleCoordinatesAttrs,
} from '../../../../../../common/util/svg';

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
export const DielinesLayer = observer(({
  widgetStore, preferencesStore,
}: {
  preferencesStore: IPreferencesModel, widgetStore: IPyramidNetPluginModel,
}) => {
  if (!preferencesStore || !widgetStore) {
    return null;
  }
  const {
    textureEditor: { texture },
    boundingBox,
    pyramidNetSpec: {
      masterBaseTabCut,
      masterBaseTabScore,
      netPaths: { cut, score },
      pyramid: { faceIsSymmetrical },
      decorationCutPath,
      faceDecorationTransformMatricies,
      texturePathD, pathScaleMatrix, borderInsetFaceHoleTransformMatrix,
      faceBoundaryPoints,
      femaleAscendantFlap, ascendantEdgeTabs, nonTabbedAscendantScores,
    },
  } = widgetStore;

  const {
    cutProps, scoreProps, useClonesForBaseTabs, useClonesForDecoration,
    printRegistrationType, registrationPadding, registrationStrokeColor, registrationMarkLength,
  } = preferencesStore;

  const printRegistrationBB = printRegistrationType === PRINT_REGISTRATION_TYPES.NONE
    ? boundingBox : expandBoundingBoxAttrs(boundingBox, registrationPadding);
  // graphtec type frames with rectangle but laser type has registration L marks facing outward
  // TODO: consider making DRY with PrintLayer
  const dielineRegistrationBB = printRegistrationType === PRINT_REGISTRATION_TYPES.LASER_CUTTER
    ? expandBoundingBoxAttrs(printRegistrationBB, registrationMarkLength) : printRegistrationBB;
  const fittingBB = (!texture || texture.hasPathPattern) ? boundingBox : dielineRegistrationBB;
  const fitToCanvasTranslationStr = pointToTranslateString(scalePoint(boundingBoxMinPoint(fittingBB), -1));

  const DecorationContent = () => {
    if (!texturePathD) {
      return null;
    }
    const DECORATION_CUT_ID = 'face-decoration-cut';
    if (!useClonesForDecoration) {
      return (<path id={DECORATION_CUT_ID} {...cutProps} d={decorationCutPath.getD()} />);
    }
    const CUT_HOLES_ID = 'cut-holes-master';
    return (
      <g id={DECORATION_CUT_ID}>
        {faceDecorationTransformMatricies.map((cloneTransformMatrix, index) => (index === 0
          ? (
            <g key={index} id={CUT_HOLES_ID} transform={borderInsetFaceHoleTransformMatrix.toString()}>
              {texturePathD && (
              <path d={texturePathD} transform={pathScaleMatrix.toString()} {...cutProps} />
              )}
            </g>

          ) : (
            <>
              <use
                key={`${index}-decoration`}
                xlinkHref={`#${CUT_HOLES_ID}`}
                transform={
                    cloneTransformMatrix.toString()
                  }
              />
            </>
          )))}
      </g>
    );
  };

  const ClonePyramidNetContent = () => {
    const BASE_TAB_ID = 'base-tab';
    const faceMasterBaseMidpoint = lineLerp(faceBoundaryPoints[1], faceBoundaryPoints[2], 0.5);

    return (
      <>
        <path d={ascendantEdgeTabs.male.score.getD()} {...scoreProps} />
        <path d={ascendantEdgeTabs.male.cut.getD()} {...cutProps} />
        <path d={ascendantEdgeTabs.female.score.getD()} {...scoreProps} />
        <path d={ascendantEdgeTabs.female.cut.getD()} {...cutProps} />
        <path d={femaleAscendantFlap.getD()} {...cutProps} />
        <path d={nonTabbedAscendantScores.getD()} {...scoreProps} />

        {faceDecorationTransformMatricies.map((cloneTransformMatrix, index) => {
          const isMirrored = !!(index % 2) && !faceIsSymmetrical;
          const key = `${index}-base-tab`;
          return index === 0
            ? (
              <g key={key} id={BASE_TAB_ID}>
                <path d={masterBaseTabCut.getD()} {...cutProps} />
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
  };

  return (
    <>
      <DielineGroup>
        <g transform={fitToCanvasTranslationStr}>
          {(texture && !texture.hasPathPattern && printRegistrationType !== PRINT_REGISTRATION_TYPES.NONE)
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
          ))}
          {useClonesForBaseTabs ? (<ClonePyramidNetContent />) : (
            <>
              <path className="net-score" {...scoreProps} d={score.getD()} />
              <path className="net-cut" {...cutProps} d={cut.getD()} />
              <DecorationContent />
            </>
          )}
        </g>
      </DielineGroup>
    </>
  );
});
