import * as fs from './fileSystem'
import * as remoteFs from './remoteFileReader'
import { useStore } from '../store'

export function getFs() {
  return useStore.getState().isRemoteProject ? remoteFs : fs
}
