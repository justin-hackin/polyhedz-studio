import React from 'react';
import Divider from '@material-ui/core/Divider';
import { Paper, Tab, Tabs } from '@material-ui/core';

import { useWorkspaceMst } from '../../../models/WorkspaceModel';
import { IPyramidNetFactoryModel } from '../../../models/PyramidNetMakerStore';
import { useStyles } from '../../../style';
import { ControlElement } from '../../../../common/components/ControlElement';
import { BaseEdgeTabControls } from '../PyramidNetControlPanel/components/BaseEdgeTabControls';
import { AscendantEdgeTabsControls } from '../PyramidNetControlPanel/components/AscendantEdgeTabsControls';
import { ScoreControls } from '../PyramidNetControlPanel/components/ScoreControls';
import { StyleControls } from '../PyramidNetControlPanel/components/StyleControls';
import { PanelSwitch } from '../../../../common/components/PanelSwitch';
import { ShapeSelect } from '../../../../common/components/ShapeSelect';
import { CM_TO_PIXELS_RATIO } from '../../../../common/util/geom';
import { PanelSliderUnitView } from '../../../../common/components/PanelSliderUnitView';

const controlsTabs = [
  {
    label: 'Base',
    title: 'Base Edge Tab',
    component: BaseEdgeTabControls,
  },
  {
    label: 'Asc.',
    title: 'Ascendant Edge Tab',
    component: AscendantEdgeTabsControls,
  },
  {
    label: 'Score',
    title: 'Score Pattern',
    component: ScoreControls,
  },
  {
    label: 'Style',
    title: 'Dieline Style',
    component: StyleControls,
  },
];

export const PanelContent = () => {
  const workspaceStore = useWorkspaceMst();
  const store = workspaceStore.selectedStore as IPyramidNetFactoryModel;
  const classes = useStyles();
  const { pyramidNetSpec } = store;
  if (!pyramidNetSpec) { return null; }

  const [activeControlsIndex, setActiveControlsIndex] = React.useState(0);

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setActiveControlsIndex(newValue);
  };

  return (
    <>
      <div className={classes.shapeSection}>
        <ControlElement
          component={ShapeSelect}
          node={pyramidNetSpec.pyramid}
          property="shapeName"
          onChange={(e) => {
            pyramidNetSpec.setPyramidShapeName(e.target.value);
          }}
          label="Polyhedron"
        />
        <ControlElement
          component={PanelSwitch}
          node={pyramidNetSpec}
          property="useClones"
        />
        <ControlElement
          component={PanelSliderUnitView}
          node={pyramidNetSpec}
          property="shapeHeight__PX"
          min={20 * CM_TO_PIXELS_RATIO}
          max={60 * CM_TO_PIXELS_RATIO}
        />
      </div>
      <Divider />
      <Paper square>
        <Tabs
          value={activeControlsIndex}
          indicatorColor="primary"
          textColor="primary"
          centered
          onChange={handleTabChange}
        >
          {controlsTabs.map(({ label }, index) => (
            <Tab className={classes.dielineToolbarTab} label={label} key={index} />))}
        </Tabs>
      </Paper>
      <div className={classes.tabContent}>
        <h3>{controlsTabs[activeControlsIndex].title}</h3>
        {React.createElement(controlsTabs[activeControlsIndex].component)}
      </div>
    </>
  );
};
