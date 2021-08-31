import {
  AnyModel, applyPatches, findParent, getRootPath, isRoot, Path, resolvePath, UndoManager,
} from 'mobx-keystone';

export function tryResolvePath<T>(object: object, path: Path): T | undefined {
  const res = resolvePath<T>(object, path);
  return res.resolved ? res.value : undefined;
}

export const mstDataToProps = (node, property) => {
  const value = node[property];

  const valuePath = [...getRootPath(node).path, property].join('/');
  const setValue = (val) => {
    applyPatches(node, [{
      op: 'replace',
      path: [property],
      value: val,
    }]);
  };

  return {
    value,
    valuePath,
    setValue,
  };
};

interface NodeWithHistory extends AnyModel {
  history: UndoManager
}

export function getNearestHistoryFromAncestorNode(node): UndoManager {
  if (isRoot(node)) { return null; }
  return findParent(node, (parentNode) => (parentNode as NodeWithHistory).history instanceof UndoManager);
}
