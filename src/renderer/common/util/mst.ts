import { startCase } from 'lodash';
import {
  applyPatch, getPath, getRoot, joinJsonPath,
} from 'mobx-state-tree';

import { CURRENT_UNIT } from './geom';

const pxAtEndRegex = new RegExp('__PX$');
const isUnitValue = (val) => pxAtEndRegex.test(val);
const convertPropertyToLabel = (prop: string) => (isUnitValue(prop)
  ? `${startCase(prop.replace(pxAtEndRegex, ''))} (${CURRENT_UNIT})` : startCase(prop));

export const mstDataToProps = (node, property, labelOverride = undefined) => {
  const value = node[property];
  const valuePath = joinJsonPath([getPath(node), property]);
  const setValue = (val) => {
    applyPatch(node, {
      op: 'replace',
      path: `/${property}`,
      value: val,
    });
  };
  const useUnits = isUnitValue(property);
  const label = (() => {
    if (labelOverride) {
      return `${labelOverride}${useUnits ? ` (${CURRENT_UNIT})` : ''}`;
    }
    return convertPropertyToLabel(property);
  })();
  return {
    value,
    valuePath,
    setValue,
    useUnits,
    label,
  };
};

// @ts-ignore
export const getHistory: IUndoManagerWithGroupState = (node) => getRoot(node).history;