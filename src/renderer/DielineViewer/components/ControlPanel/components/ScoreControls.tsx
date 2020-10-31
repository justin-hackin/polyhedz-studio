import React from 'react';
import { observer } from 'mobx-react';

import { VERY_SMALL_NUMBER } from '../../../../common/util/geom';
import { PanelSelect } from '../../../../common/components/PanelSelect';
import { PanelSlider } from '../../../../common/components/PanelSlider';
import { ControlElement } from './ControlElement';
import { ratioSliderProps } from './constants';
import { PanelSwitch } from '../../../../common/components/PanelSwitch';
import { useMst } from '../../../models';

const strokeLengthProps = { min: 1, max: 3000, step: VERY_SMALL_NUMBER };

export const ScoreControls = observer(() => {
  const {
    pyramidNetSpec: {
      useDottedStroke, setUseDottedStroke,
      interFaceScoreDashSpec, baseScoreDashSpec, setInterFaceScoreDashSpecPattern, setBaseScoreDashSpecPattern,
    } = {}, dashPatterns,
  } = useMst();
  const dashPatternOptions = dashPatterns.map(({ label, id }) => ({ value: id, label }));
  return (
    <>
      <PanelSwitch
        value={useDottedStroke}
        valuePath="pyramidNetSpec.useDottedStroke"
        setter={(val) => { setUseDottedStroke(val); }}
        label="Use dotted stroke"
      />
      {useDottedStroke && (
        <>

          <PanelSelect
            value={interFaceScoreDashSpec.strokeDashPathPattern.id}
            label="Inter-face stroke dash pattern"
            setter={(id) => {
              setInterFaceScoreDashSpecPattern(id);
            }}
            options={dashPatternOptions}
          />
          <ControlElement
            component={PanelSlider}
            valuePath="pyramidNetSpec.interFaceScoreDashSpec.strokeDashLength"
            label="Inter-face Stroke Dash Length"
            {...strokeLengthProps}
          />
          <ControlElement
            component={PanelSlider}
            valuePath="pyramidNetSpec.interFaceScoreDashSpec.strokeDashOffsetRatio"
            label="Inter-face Stroke Dash Offset Ratio"
            {...ratioSliderProps}
          />
          <PanelSelect
            value={baseScoreDashSpec.strokeDashPathPattern.id}
            label="Base Stroke Dash Pattern"
            setter={(id) => {
              setBaseScoreDashSpecPattern(id);
            }}
            options={dashPatternOptions}
          />
          <ControlElement
            component={PanelSlider}
            valuePath="pyramidNetSpec.baseScoreDashSpec.strokeDashLength"
            label="Base Stroke Dash Length"
            {...strokeLengthProps}
          />
          <ControlElement
            component={PanelSlider}
            valuePath="pyramidNetSpec.baseScoreDashSpec.strokeDashOffsetRatio"
            label="Base Stroke Dash Offset Ratio"
            {...ratioSliderProps}
          />
        </>
      )}
    </>
  );
});
// } {
// } {
// }]
//   // @ts-ignore
//   .map(ControlElement);
