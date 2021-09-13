import React from 'react';
import { observer } from 'mobx-react';
import { TweakablePrimitiveWithOptionsModel } from '../keystone-tweakables/models/TweakablePrimitiveWithOptionsModel';
import { RadioMetadata } from '../keystone-tweakables/types';
import { SimpleRadio } from './SimpleRadio';

export const TweakableRadio = observer((
  { node }: { node: TweakablePrimitiveWithOptionsModel<any, RadioMetadata<any>> },
) => (
  <SimpleRadio
    {...{
      onChange: (e) => {
        node.setValue(e.target.value);
      },
      options: node.options,
      row: node.metadata.isRow,
      value: node.value,
      label: node.label,
      name: node.valuePath,
    }}
  />
));
