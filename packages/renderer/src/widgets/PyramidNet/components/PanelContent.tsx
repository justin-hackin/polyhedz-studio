import React from 'react';
import Divider from '@material-ui/core/Divider';
import { Paper, Tab, Tabs } from '@material-ui/core';
import { observer } from 'mobx-react';

import { useWorkspaceMst } from '../../../WidgetWorkspace/models/WorkspaceModel';
import { useStyles } from '../../../common/style/style';
import { BaseEdgeTabControls } from './BaseEdgeTabControls';
import { AscendantEdgeTabsControls } from './AscendantEdgeTabsControls';
import { ScoreControls } from './ScoreControls';
import { ShapeSelect } from './ShapeSelect';
import { PyramidNetWidgetModel } from '../models/PyramidNetWidgetStore';
import { TweakableInput } from '../../../common/keystone-tweakables/material-ui-controls/TweakableInput';

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
];

export const PanelContent = observer(() => {
  const workspaceStore = useWorkspaceMst();
  const store = workspaceStore.selectedStore as PyramidNetWidgetModel;
  const classes = useStyles();
  const { savedModel } = store;
  const { pyramid } = savedModel;

  if (!savedModel) { return null; }

  const [activeControlsIndex, setActiveControlsIndex] = React.useState(0);

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setActiveControlsIndex(newValue);
  };

  return (
    <>
      <div className={classes.shapeSection}>
        <ShapeSelect
          className={classes.shapeSelect}
          node={savedModel.pyramid.shapeName}
        />
        <TweakableInput
          className={classes.shapeHeightFormControl}
          node={savedModel.shapeHeight}
        />
        <TweakableInput node={pyramid.netsPerPyramid} />
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
            <Tab label={label} key={index} />))}
        </Tabs>
      </Paper>
      <div className={classes.tabContent}>
        <h3>{controlsTabs[activeControlsIndex].title}</h3>
        {React.createElement(controlsTabs[activeControlsIndex].component)}
      </div>
    </>
  );
});
