import { observer } from 'mobx-react';
import uuid from 'uuid/v1';
import Typography from '@mui/material/Typography';
import { Switch } from '@mui/material';
import React, { ChangeEvent } from 'react';
import { FormControlStyled } from '../../style/style';

export const SimpleSwitch = observer(({
  value,
  name,
  onChange,
  label,
  className,
}: {
  value: boolean,
  name: string,
  onChange: (event: ChangeEvent<HTMLInputElement>, checked: boolean) => void,
  label: string,
  className?: string
}) => {
  const labelId = uuid();

  return (
    <FormControlStyled className={className}>
      <Typography id={labelId} gutterBottom>
        {label}
      </Typography>
      <Switch
        checked={value}
        name={name}
        aria-labelledby={labelId}
        onChange={onChange}
      />
    </FormControlStyled>
  );
});
