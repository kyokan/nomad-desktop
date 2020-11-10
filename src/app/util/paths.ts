import {app} from 'electron';
import * as path from 'path';

export function resourcesPath (): string {
  if (process.env.NODE_ENV === 'production') {
    return process.resourcesPath;
  }

  // this is the build directory in dev
  return path.join(app.getAppPath(), '..', 'resources');
}

export function appRootPath () {
  if (process.env.NODE_ENV === 'production') {
    return './build';
  }

  return app.getAppPath();
}

export function joinAppRootPath (...parts: string[]) {
  return path.join(appRootPath(), ...parts);
}

export function joinAppDataPath(...parts: string[]) {
  return path.join(app.getPath('userData'), ...parts);
}
