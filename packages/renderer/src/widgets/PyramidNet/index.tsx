import { PyramidNet } from './PyramidNetSvg';
import { PyramidNetWidgetModel } from './models/PyramidNetMakerStore';
import { AdditionalToolbarContent } from './components/AdditionalToolbarContent';
import { AdditionalFileMenuItems } from './components/AdditionalFileMenuItems';
import { PanelContent } from './components/PanelContent';
import { TextureEditorDrawer } from './components/TextureEditorDrawer';
import { WidgetOptions } from '../../WidgetWorkspace/types';

export const PyramidNetOptionsInfo: WidgetOptions = {
  RawSvgComponent: PyramidNet,
  controlPanelProps: {
    AdditionalToolbarContent,
    AdditionalFileMenuItems,
    PanelContent,
  },
  WidgetModel: PyramidNetWidgetModel,
  AdditionalMainContent: TextureEditorDrawer,
  specFileExtension: 'pns',
  specFileExtensionName: 'Pyramid net spec',
};
