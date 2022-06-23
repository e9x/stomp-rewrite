import { resolve } from 'path';
import { realpath } from 'fs/promises';
import { cwd, env } from 'process';

const appDirectory = await realpath(cwd());
const resolveApp = relativePath => resolve(appDirectory, relativePath);

export const dotenv = resolveApp('.env');
export const appPath = resolveApp('.');
export const appDist = resolveApp(env.BUILD_PATH || 'dist');
export const appPackageJson = resolveApp('package.json');
export const appSrc = resolveApp('src');
export const proxySetup = resolveApp('src/setupProxy.js');
export const appNodeModules = resolveApp('node_modules');
export const appWebpackCache = resolveApp('node_modules/.cache');
