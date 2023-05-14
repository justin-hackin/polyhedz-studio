import { FC, ReactElement } from 'react';

import { dimensions } from '../../common/util/data';
import { RegisteredAssetsDefinition } from './RegisteredAssetsDefinition';
import { DisjunctAssetsDefinition } from './DisjunctAssetsDefinition';
import { SolitaryAssetDefinition } from './SolitaryAssetDefinition';
import { TxtFileInfo } from '../../common/types';

export interface viewBoxProps { viewBox: string }

export interface AdditionalFileMenuItemsProps {
  resetFileMenuRef: ()=>void,
}

export type WidgetSVGComponent = FC<any>;
export type DocumentAreaProps = (dimensions | viewBoxProps);

export interface BaseAssetDefinition {
  WorkspaceView: ReactElement<any, any>;
  getAssetsFileData(fileBaseName: string): TxtFileInfo[];
}

export const filePathConstructor = (
  fileBaseName: string,
  assetName: string | undefined,
  copies: number | undefined,
) => `${fileBaseName}${assetName ? `__${assetName}` : ''}${copies ? `__X${copies}` : ''}.svg`;

export type AssetDefinition = DisjunctAssetsDefinition | RegisteredAssetsDefinition | SolitaryAssetDefinition;