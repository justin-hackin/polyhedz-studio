import { findChildren } from 'mobx-keystone';
import React from 'react';
import { INPUT_TYPE, TweakableModel } from '../types';
import { TweakableInput } from './TweakableInput';

const INPUT_TYPES_VALUES = Object.values(INPUT_TYPE);

type childrenFilter = (child: object)=>boolean;

export const TweakableChildrenInputs = (
  { parentNode, childrenFilter }:
  { parentNode: object, childrenFilter?: childrenFilter },
) => {
  if (!parentNode) { return null; }
  const children = findChildren(parentNode, (child) => (
    INPUT_TYPES_VALUES.includes((child as TweakableModel)?.metadata?.type)
    && (!childrenFilter || childrenFilter(child))));
  return (
    <>
      {Array.from(children).map(
        (node: TweakableModel) => <TweakableInput key={node.valuePath} node={node} />,
      )}
    </>
  );
};
