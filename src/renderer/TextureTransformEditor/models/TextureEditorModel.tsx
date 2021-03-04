import { inRange } from 'lodash';
import {
  getParentOfType,
  getSnapshot, Instance, resolvePath, types,
} from 'mobx-state-tree';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import npot from 'nearest-power-of-two';
import { reaction, when } from 'mobx';
import {
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import OrbitControls from 'threejs-orbit-controls';
import ReactDOMServer from 'react-dom/server';
import React from 'react';
import Canvg, { presets } from 'canvg';

import { BoundaryModel } from './BoundaryModel';
import { TextureModel } from './TextureModel';
import { DimensionsModel } from '../../../common/models/DimensionsModel';
import { EVENTS } from '../../../main/ipc';
import { ModifierTrackingModel } from './ModifierTrackingModel';
import {
  calculateTransformOriginChangeOffset, getOriginPoint, scalePoint, sumPoints, transformPoint,
} from '../../common/util/geom';
import {
  IImageFaceDecorationPatternModel,
  ImageFaceDecorationPatternModel,
  PathFaceDecorationPatternModel,
} from '../../DielineViewer/models/PyramidNetStore';
import { UndoManagerWithGroupState } from '../../common/components/UndoManagerWithGroupState';
import requireStatic from '../../requireStatic';
import { TextureSvgUnobserved } from '../components/TextureSvg';
import { viewBoxAttrsToString } from '../../../common/util/svg';

// TODO: put in preferences
const DEFAULT_IS_POSITIVE = true;
const DEFAULT_VIEW_SCALE = 0.8;

const getCoverScale = (bounds, image) => {
  const widthScale = bounds.width / image.width;
  const heightScale = bounds.height / image.height;
  const widthIsClamp = widthScale >= heightScale;
  return {
    widthIsClamp,
    scale: widthIsClamp ? widthScale : heightScale,
  };
};

const getFitScale = (bounds, image) => {
  if (!bounds || !image) {
    return null;
  }
  const widthIsClamp = (bounds.width / bounds.height) <= (image.width / image.height);
  return {
    widthIsClamp,
    scale: widthIsClamp ? bounds.width / image.width : bounds.height / image.height,
  };
};

export const TextureEditorModel = types
  .model('TextureTransformEditor', {
    shapeName: types.maybe(types.string),
    decorationBoundary: types.maybe(BoundaryModel),
    texture: types.maybe(TextureModel),
    // since both controls and matrix function require degrees, use degrees as unit instead of radians
    placementAreaDimensions: types.maybe(DimensionsModel),
    viewScale: types.optional(types.number, DEFAULT_VIEW_SCALE),
    history: types.optional(UndoManagerWithGroupState, {}),
    modifierTracking: types.optional(ModifierTrackingModel, {}),
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    shapePreview: types.optional(types.late(() => ShapePreviewModel), {}),
  })
  .volatile(() => ({
    // amount of scaling required to make the decoration area match the size of the face boundary
    borderToInsetRatio: null,
    // translation required to bring the decoration area first corner to the face boundary first corner
    insetToBorderOffset: null,
    viewScaleDiff: 1,
    autoRotatePreview: false,
    showNodes: false,
    nodeScaleMux: 1,
    selectedTextureNodeIndex: null,
    MIN_VIEW_SCALE: 0.3,
    MAX_VIEW_SCALE: 3,
    disposers: [],
  }))
  .views((self) => ({
    get imageCoverScale() {
      if (!self.decorationBoundary || !self.texture) {
        return undefined;
      }
      return getCoverScale(self.decorationBoundary.viewBoxAttrs, self.texture.dimensions);
    },
    get faceFittingScale() {
      if (!self.placementAreaDimensions || !self.decorationBoundary) {
        return undefined;
      }
      return getFitScale(self.placementAreaDimensions, self.decorationBoundary.viewBoxAttrs);
    },
    get minImageScale() {
      return this.imageCoverScale && (0.1 * this.imageCoverScale.scale);
    },
    get maxImageScale() {
      return this.imageCoverScale && (5 * this.imageCoverScale.scale);
    },
    get viewScaleDragged() {
      return self.viewScale && (self.viewScale * self.viewScaleDiff);
    },
    get viewScaleCenterPercentStr() {
      return this.viewScaleDragged && `${((1 - this.viewScaleDragged) * 100) / 2}%`;
    },
    get viewScalePercentStr() {
      return this.viewScaleDragged && `${this.viewScaleDragged * 100}%`;
    },
    get selectedTextureNode() {
      return (self.selectedTextureNodeIndex !== null && self.texture)
        && self.texture.destinationPoints[self.selectedTextureNodeIndex];
    },
    get faceBoundary() {
      if (!self.decorationBoundary || !self.borderToInsetRatio) { return undefined; }
      // TODO: no more dirty type checking
      const textureIsBordered = self.texture
        ? (self.texture.pattern as IImageFaceDecorationPatternModel).isBordered : null;
      if (textureIsBordered === false) {
        return self.decorationBoundary;
      }
      const vertices = self.decorationBoundary.vertices
        .map((pt) => sumPoints(scalePoint(pt, self.borderToInsetRatio), self.insetToBorderOffset));
      return BoundaryModel.create({ vertices });
    },
  })).actions((self) => ({
    setFaceBorderData(borderToInsetRatio, insetToBorderOffset) {
      self.borderToInsetRatio = borderToInsetRatio;
      self.insetToBorderOffset = insetToBorderOffset;
    },

    setPlacementAreaDimensions(placementAreaDimensions) {
      self.history.withoutUndo(() => {
        self.placementAreaDimensions = placementAreaDimensions;
      });
    },
    setViewScaleDiff(mux) {
      if (inRange(mux * self.viewScale, self.MIN_VIEW_SCALE, self.MAX_VIEW_SCALE)) {
        self.history.withoutUndo(() => { self.viewScaleDiff = mux; });
      }
    },
    reconcileViewScaleDiff() {
      self.viewScale = self.viewScaleDragged;
      self.viewScaleDiff = 1;
    },
    setSelectedTextureNodeIndex(index) {
      self.selectedTextureNodeIndex = index;
    },
    setShowNodes(showNodes) {
      self.showNodes = showNodes;
      if (!self.showNodes) { self.selectedTextureNodeIndex = undefined; }
    },
    setNodeScaleMux(mux) {
      self.nodeScaleMux = mux;
    },
    setAutoRotatePreview(shouldRotate) {
      self.autoRotatePreview = shouldRotate;
    },
    fitTextureToFace() {
      const { viewBoxAttrs } = self.decorationBoundary;
      const { dimensions: textureDimensions } = self.texture;
      if (!self.texture || !self.decorationBoundary) {
        return;
      }
      const { height, width, xmin } = viewBoxAttrs;
      const { scale, widthIsClamp } = self.imageCoverScale;
      self.texture.translate = widthIsClamp
        ? { x: xmin, y: (height - (textureDimensions.height * scale)) / 2 }
        : { x: xmin + (width - (textureDimensions.width * scale)) / 2, y: 0 };
      self.texture.scale = self.imageCoverScale.scale;
    },
    resetNodesEditor() {
      self.showNodes = false;
      self.selectedTextureNodeIndex = null;
    },
    setTexture(pattern) {
      this.resetNodesEditor();

      self.texture = TextureModel.create({
        pattern,
        scale: 1,
        rotate: 0,
        translate: getOriginPoint(),
        transformOrigin: getOriginPoint(),
      });
      this.fitTextureToFace();
      this.repositionOriginOverCorner(0);
    },

    setTexturePath(pathD, sourceFileName) {
      this.setTexture(PathFaceDecorationPatternModel.create({
        pathD, sourceFileName, isPositive: DEFAULT_IS_POSITIVE,
      }));
    },
    setTextureImage(imageData, dimensions, sourceFileName) {
      this.setTexture(ImageFaceDecorationPatternModel.create({
        imageData, dimensions, sourceFileName,
      }));
    },
    // TODO: duplicated in PyramidNetMakerStore, consider a common model prototype across BrowserWindows
    getFileBasename() {
      return `${self.shapeName || 'shape'}__${resolvePath(self, '/texture/pattern/sourceFileName') || 'undecorated'}`;
    },

    // TODO: add limits for view scale and
    // these seem like the domain of the texture model but setters for
    // textureScaleDiff (and more to follow) need boundary
    textureEditorUpdateHandler(decorationBoundaryVertices, shapeName, faceDecoration) {
      // eslint-disable-next-line no-shadow
      const thisAction = () => {
        self.shapeName = shapeName;
        // @ts-ignore
        self.decorationBoundary = BoundaryModel.create({ vertices: decorationBoundaryVertices });

        if (faceDecoration) {
          self.texture = TextureModel.create(faceDecoration);
        } else {
          self.texture = undefined;
        }
      };

      // if decoration boundary is currently set
      // ensure undo history starts after first setting of boundary and texture
      if (!self.decorationBoundary) {
        self.history.withoutUndo(thisAction);
      } else {
        thisAction();
      }
    },
    absoluteMovementToSvg(absCoords) {
      return scalePoint(absCoords, 1 / (self.viewScaleDragged * self.faceFittingScale.scale));
    },
    translateAbsoluteCoordsToRelative(absCoords) {
      return transformPoint(
        ((new DOMMatrixReadOnly())
          .scale(self.texture.scaleDragged, self.texture.scaleDragged)
          .rotate(self.texture.rotateDragged)
          .inverse()),
        this.absoluteMovementToSvg(absCoords),
      );
    },
    repositionTextureWithOriginOverCorner(vertexIndex) {
      if (!self.texture || !self.decorationBoundary) {
        return;
      }
      const originAbsolute = transformPoint(
        self.texture.transformMatrixDragged, self.texture.transformOrigin,
      );
      self.texture.translate = sumPoints(
        self.texture.translate,
        scalePoint(originAbsolute, -1),
        self.decorationBoundary.vertices[vertexIndex],
      );
    },
    repositionSelectedNodeOverCorner(vertexIndex) {
      if (!self.texture || !self.decorationBoundary) {
        return;
      }
      const svgTextureNode = transformPoint(
        self.texture.transformMatrixDragged, self.selectedTextureNode,
      );
      const diff = sumPoints(svgTextureNode, scalePoint(self.decorationBoundary.vertices[vertexIndex], -1));
      self.texture.translate = sumPoints(scalePoint(diff, -1), self.texture.translate);
    },
    repositionOriginOverCorner(vertexIndex) {
      if (!self.texture || !self.decorationBoundary) {
        return;
      }
      const relVertex = transformPoint(
        self.texture.transformMatrix.inverse(), self.decorationBoundary.vertices[vertexIndex],
      );
      const delta = scalePoint(sumPoints(scalePoint(relVertex, -1), self.texture.transformOrigin), -1);
      const newTransformOrigin = sumPoints(delta, self.texture.transformOrigin);
      self.texture.translate = sumPoints(
        self.texture.translate,
        scalePoint(calculateTransformOriginChangeOffset(self.texture.transformOrigin, newTransformOrigin,
          self.texture.scale, self.texture.rotate, self.texture.translate), -1),
      );
      self.texture.transformOrigin = newTransformOrigin;
    },

    sendTexture() {
      if (!self.texture) { return; }
      globalThis.ipcRenderer.send(EVENTS.UPDATE_DIELINE_VIEWER, getSnapshot(self.texture));
    },
    saveTextureArrangement() {
      if (!self.texture) { return; }
      const fileData = {
        shapeName: self.shapeName,
        textureSnapshot: getSnapshot(self.texture),
      };
      globalThis.ipcRenderer.invoke(EVENTS.SAVE_JSON, fileData, {
        message: 'Save texture arrangement',
        defaultPath: `${self.shapeName}__${self.texture.pattern.sourceFileName}--TEXTURE.json`,
      });
    },
    setTextureFromSnapshot(textureSnapshot) {
      self.texture = TextureModel.create(textureSnapshot);
    },
    openTextureArrangement() {
      globalThis.ipcRenderer.invoke(EVENTS.DIALOG_LOAD_JSON, {
        message: 'Import texture arrangement',
      }).then((res) => {
        // TODO: snackbar error alerts
        if (!res) { return; }

        const { fileData: { shapeName, textureSnapshot } } = res;
        if (!textureSnapshot) {
          return;
        }
        if (shapeName !== self.shapeName) {
          globalThis.ipcRenderer.send(EVENTS.REQUEST_SHAPE_CHANGE, shapeName);
          // TODO: this is a dirty trick, disentangle calculation of boundary points from dieline editor
          // and/or enable async ipc across multiple windows so requesting updates can be done in one ipc event
          // (which provides an optional shape override)
          self.disposers.push(when(() => (self.shapeName === shapeName), () => {
            setTimeout(() => {
              this.setTextureFromSnapshot(textureSnapshot);
            }, 100);
          }));
        } else {
          this.setTextureFromSnapshot(textureSnapshot);
        }
      });
    },
  }))
  .actions((self) => {
    const shapeDecorationHandler = (_,
      decorationBoundaryVertices, shapeName,
      faceDecoration, borderToInsetRatio, insetToBorderOffset) => {
      self.setFaceBorderData(borderToInsetRatio, insetToBorderOffset);
      self.textureEditorUpdateHandler(decorationBoundaryVertices, shapeName, faceDecoration);
    };

    return {
      afterCreate() {
        globalThis.ipcRenderer.on(EVENTS.UPDATE_TEXTURE_EDITOR_SHAPE_DECORATION, shapeDecorationHandler);
      },
      beforeDestroy() {
        globalThis.ipcRenderer.removeListener(EVENTS.UPDATE_TEXTURE_EDITOR_SHAPE_DECORATION, shapeDecorationHandler);
        for (const disposer of self.disposers) {
          disposer();
        }
      },
    };
  });

const ShapePreviewModel = types.model({
}).volatile(() => ({
  gltfExporter: new GLTFExporter(),
  gltfLoader: new GLTFLoader(),
  renderer: null,
  scene: new Scene(),
  shapeScene: null,
  shapeMesh: null,
  camera: null,
  controls: null,
  animationFrame: null,
  IDEAL_RADIUS: 60,
  TEXTURE_BITMAP_SCALE: 0.2,
  disposers: [],
})).views((self) => ({
  get canvasDimensions() {
    const { width, height } = this.parentTextureEditor.placementAreaDimensions || {};
    return width ? { width, height } : undefined;
  },
  get parentTextureEditor() {
    return getParentOfType(self, TextureEditorModel);
  },
})).actions((self) => ({
  setup(rendererContainer) {
    self.renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    rendererContainer.appendChild(self.renderer.domElement);
    self.renderer.setPixelRatio(window.devicePixelRatio);
    self.camera = new PerspectiveCamera(
      30, self.canvasDimensions.width / self.canvasDimensions.height, 0.1, 2000,
    );
    self.camera.position.set(0, 0, 200);
    self.controls = new OrbitControls(self.camera, self.renderer.domElement);

    // update renderer dimensions
    self.disposers.push(reaction(() => [self.canvasDimensions, self.renderer], () => {
      if (self.renderer) {
        const { width, height } = self.canvasDimensions;
        self.renderer.setSize(width, height);
        self.camera.aspect = width / height;
        self.camera.updateProjectionMatrix();
      }
    }, { fireImmediately: true }));

    // auto rotate update controls
    self.disposers.push(reaction(() => [self.parentTextureEditor.autoRotatePreview], () => {
      self.controls.autoRotate = self.parentTextureEditor.autoRotatePreview;
    }, { fireImmediately: true }));

    // shape change
    self.disposers.push(reaction(() => [self.parentTextureEditor.shapeName], () => {
      this.setShape(self.parentTextureEditor.shapeName);
    }, { fireImmediately: true }));

    self.animationFrame = requestAnimationFrame(((renderer, controls, camera, scene) => {
      const animate = () => {
        controls.update();
        renderer.render(scene, camera);
        window.requestAnimationFrame(animate);
      };
      return animate;
    })(self.renderer, self.controls, self.camera, self.scene));

    self.disposers.push(reaction(() => {
      const {
        texture: {
          // @ts-ignore
          scale, rotate, translate,
          // @ts-ignore
          faceBoundary: { pathD: boundaryPathD } = {},
          pattern: {
            isPositive = undefined, pathD: patternPathD = undefined, imageData = undefined, isBordered = undefined,
          } = {},
        } = {},
      } = self.parentTextureEditor;
      return [
        self.shapeMesh, scale, rotate, translate, boundaryPathD, isPositive, patternPathD, imageData, isBordered,
      ];
    }, () => {
      const { shapeMesh, parentTextureEditor: { faceBoundary: { viewBoxAttrs } } } = self;
      if (!shapeMesh || !viewBoxAttrs) { return; }
      const textureCanvas = new window.OffscreenCanvas(viewBoxAttrs.width, viewBoxAttrs.height);
      // TODO: throw if material not MeshPhong
      // @ts-ignore
      const ctx = textureCanvas.getContext('2d');
      // @ts-ignore
      const svgStr = ReactDOMServer.renderToString(
        React.createElement(TextureSvgUnobserved, {
          viewBox: viewBoxAttrsToString(viewBoxAttrs),
          store: self.parentTextureEditor,
        }),
      );
      // @ts-ignore
      Canvg.from(ctx, svgStr, presets.offscreen()).then(async (v) => {
        const {
          width: vbWidth,
          height: vbHeight,
        } = viewBoxAttrs;
        v.resize(
          npot(vbWidth * self.TEXTURE_BITMAP_SCALE),
          npot(vbHeight * self.TEXTURE_BITMAP_SCALE), 'none',
        );
        await v.render();
        this.setShapeTexture(textureCanvas.transferToImageBitmap());
      });
    }));
  },
  beforeDestroy() {
    if (self.animationFrame) {
      cancelAnimationFrame(self.animationFrame);
    }
    for (const disposer of self.disposers) {
      disposer();
    }
  },
  async downloadShapeGLTF() {
    return self.gltfExporter
      .parse(self.shapeMesh, (shapeGLTF) => {
        globalThis.ipcRenderer.invoke(EVENTS.SAVE_GLB, shapeGLTF, {
          message: 'Save shape preview',
          defaultPath: `${self.parentTextureEditor.getFileBasename()}.glb`,
        });
      }, { binary: true });
  },
  setShapeMesh(shape) {
    self.shapeMesh = shape;
  },
  setShapeScene(scene) {
    self.shapeScene = scene;
  },

  setShape(shapeName) {
    const modelUrl = requireStatic(`models/${shapeName}.gltf`);
    self.gltfLoader.load(
      // resource URL
      modelUrl,
      ({ scene: importScene }) => {
        if (self.shapeScene) {
          self.scene.remove(self.shapeScene);
        }
        self.scene.add(importScene);
        this.setShapeScene(importScene);

        self.scene.traverse((child) => {
          const meshChild = (child as Mesh);
          if (meshChild.isMesh) {
            const normalizingScale = self.IDEAL_RADIUS / meshChild.geometry.boundingSphere.radius;
            meshChild.scale.fromArray([normalizingScale, normalizingScale, normalizingScale]);
            const oldMaterial = meshChild.material;
            meshChild.material = new MeshBasicMaterial();
            // @ts-ignore
            meshChild.material.map = oldMaterial.map;
            this.setShapeMesh(child);
          }
        });
      },
    );
  },
  setShapeTexture(imageBitmap) {
    if (!self.shapeMesh) { throw new Error('setShapeTexture: shapeMesh does not exist'); }
    const { material }: {material: MeshPhongMaterial} = self.shapeMesh;
    material.map.image = imageBitmap;
    material.map.needsUpdate = true;
  },
}));

export interface ITextureEditorModel extends Instance<typeof TextureEditorModel> {}
