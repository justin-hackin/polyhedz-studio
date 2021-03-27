import React from 'react';
import uuid from 'uuid/v1';
import { startCase } from 'lodash';
import FormControl from '@material-ui/core/FormControl';
import Typography from '@material-ui/core/Typography';
import { Switch } from '@material-ui/core';
import { observer } from 'mobx-react';

import { useStyles } from '../style/style';
import { mstDataToProps } from '../util/mst';

export const PanelSwitchUncontrolled = observer(({
  value, valuePath, onChange, label,
}) => {
  const classes = useStyles();
  const labelId = uuid();
  if (value === undefined) { return null; }

  return (
    <FormControl className={classes.formControl}>
      <Typography id={labelId} gutterBottom>
        {label}
      </Typography>
      <Switch
        value={value}
        name={valuePath}
        aria-labelledby={labelId}
        color="primary"
        onChange={onChange}
      />
    </FormControl>
  );
});

export const PanelSwitch = ({ node, property, label = undefined }) => {
  const {
    value, setValue, valuePath,
  } = mstDataToProps(node, property);
  if (value === undefined) { return null; }
  const resolvedLabel = `${label || startCase(property)}`;
  return (
    <PanelSwitchUncontrolled
      value={value}
      label={resolvedLabel}
      valuePath={valuePath}
      onChange={(e) => {
        setValue(e.target.checked);
      }}
    />
  );
};
