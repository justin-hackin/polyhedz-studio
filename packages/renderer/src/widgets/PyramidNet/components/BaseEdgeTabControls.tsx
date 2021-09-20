import React from 'react';
import { observer } from 'mobx-react';
import { PyramidNetPluginModel } from '../models/PyramidNetMakerStore';
import { BendGuideValleyModel } from '../baseEdgeConnectionTab';
import { TweakableChildrenInputs }
  from '../../../common/keystone-tweakables/material-ui-controls/TweakableChildrenInputs';
import { SimpleSwitch } from '../../../common/keystone-tweakables/material-ui-controls/SimpleSwitch';
import { useWorkspaceMst } from '../../../WidgetWorkspace/models/WorkspaceModel';

export const BaseEdgeTabControls = observer(() => {
  const workspaceStore = useWorkspaceMst();
  const {
    pyramidNetSpec: {
      baseEdgeTabsSpec,
    } = {},
  } = workspaceStore.selectedStore as PyramidNetPluginModel;

  return (
    <>
      <TweakableChildrenInputs parentNode={baseEdgeTabsSpec} />

      <SimpleSwitch
        label="Use Bend Guide Valley"
        name="BaseEdgeTabControls__useBendGuideValley"
        value={!!baseEdgeTabsSpec.bendGuideValley}
        onChange={(e) => {
          if (e.target.checked) {
            baseEdgeTabsSpec.resetBendGuideValleyToDefault();
          } else {
            baseEdgeTabsSpec.unsetBendGuideValley();
          }
        }}
      />
      {baseEdgeTabsSpec.bendGuideValley instanceof BendGuideValleyModel && (
        <>
          <TweakableChildrenInputs parentNode={baseEdgeTabsSpec.bendGuideValley} />
        </>
      )}
    </>
  );
});