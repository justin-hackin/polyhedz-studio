import React from 'react';
import uuid from 'uuid/v1';
import FormControl from '@material-ui/core/FormControl';
import Typography from '@material-ui/core/Typography';
import { ChromePicker } from 'react-color';

import { useStyles } from '../style/style';

export const NodeColorPicker = ({
  node, ...rest
}) => {
  const classes = useStyles();
  const labelId = uuid();
  if (node.value === undefined) { return null; }
  return (
    <FormControl className={classes.formControl}>
      <Typography id={labelId} gutterBottom>
        {node.label}
      </Typography>

      <ChromePicker
        className={classes.panelChromePicker}
        name={labelId}
        color={node.value}
        onChangeComplete={(color) => {
          node.setValue(color.hex);
        }}
        {...rest}
      />
    </FormControl>
  );
};
