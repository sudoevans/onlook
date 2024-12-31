import { MainChannels } from '@onlook/models/constants';
import { DeployState, VersionStatus, type DeploymentStatus } from '@onlook/models/hosting';
import { exec } from 'node:child_process';
import { mainWindow } from '..';
import { PersistentStorage } from '../storage';

class HostingManager {
    private static instance: HostingManager;
    private userId: string | null = null;
    private state: DeployState = DeployState.NONE;

    private constructor() {
        this.restoreSettings();
    }

    public static getInstance(): HostingManager {
        if (!HostingManager.instance) {
            HostingManager.instance = new HostingManager();
        }
        return HostingManager.instance;
    }

    private restoreSettings() {
        const settings = PersistentStorage.USER_SETTINGS.read() || {};
        this.userId = settings.id || null;
    }

    async getEnv(envId: string) {
        try {
            return await this.zonke.getPreviewEnvironment(envId);
        } catch (error) {
            console.error('Failed to get preview environment', error);
            return null;
        }
    }

    async publishEnv(envId: string, folderPath: string, buildScript: string) {
        console.log('Publishing environment', {
            envId,
            folderPath,
            buildScript,
        });

        // TODO: Infer this from project
        const BUILD_OUTPUT_PATH = folderPath + '/.next';

        try {
            this.setState(DeployState.BUILDING, 'Building project');
            const success = await this.runBuildScript(folderPath, buildScript);
            if (!success) {
                this.setState(DeployState.ERROR, 'Build failed');
                return null;
            }

            this.setState(DeployState.DEPLOYING, 'Deploying to preview environment');
            const version = await this.zonke.deployToPreviewEnvironment({
                message: 'New deployment',
                environmentId: envId,
                buildOutputDirectory: BUILD_OUTPUT_PATH,
            });

            console.log('Version', version);
            this.pollDeploymentStatus(envId, version.versionId);
            return version;
        } catch (error) {
            console.error('Failed to deploy to preview environment', error);
            this.setState(DeployState.ERROR, 'Deployment failed');
            return null;
        }
    }

    pollDeploymentStatus(envId: string, versionId: string) {
        const interval = 3000;
        const timeout = 300000;
        const startTime = Date.now();

        const intervalId = setInterval(async () => {
            try {
                const status = await this.getDeploymentStatus(envId, versionId);

                if (status === VersionStatus.SUCCESS) {
                    clearInterval(intervalId);
                    const env = await this.getEnv(envId);
                    this.setState(DeployState.DEPLOYED, 'Deployment successful', env?.endpoint);
                } else if (status === VersionStatus.FAILED) {
                    clearInterval(intervalId);
                    this.setState(DeployState.ERROR, 'Deployment failed');
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(intervalId);
                    this.setState(DeployState.ERROR, 'Deployment timed out');
                }
            } catch (error) {
                clearInterval(intervalId);
                this.setState(DeployState.ERROR, `Failed to check deployment status: ${error}`);
            }
        }, interval);

        setTimeout(() => {
            clearInterval(intervalId);
        }, timeout);
    }

    async getDeploymentStatus(envId: string, versionId: string): Promise<VersionStatus> {
        return VersionStatus.IN_PROGRESS;
    }

    runBuildScript(folderPath: string, buildScript: string): Promise<boolean> {
        this.setState(DeployState.BUILDING, 'Building project');

        return new Promise((resolve, reject) => {
            exec(
                buildScript,
                { cwd: folderPath, env: { ...process.env, NODE_ENV: 'production' } },
                (error: Error | null, stdout: string, stderr: string) => {
                    if (error) {
                        console.error(`Build script error: ${error}`);
                        this.setState(DeployState.ERROR, `Build script error: ${error}`);
                        resolve(false);
                        return;
                    }

                    if (stderr) {
                        console.warn(`Build script stderr: ${stderr}`);
                        this.setState(DeployState.ERROR, `Build script stderr: ${stderr}`);
                    }
                    this.setState(DeployState.BUILDING, 'Build successful with output: ', stdout);
                    resolve(true);
                },
            );
        });
    }

    setState(state: DeployState, message?: string, endpoint?: string) {
        this.state = state;
        mainWindow?.webContents.send(MainChannels.DEPLOY_STATE_CHANGED, {
            state,
            message,
            endpoint,
        });
    }

    getState(): DeploymentStatus {
        return { state: this.state };
    }
}

export default HostingManager.getInstance();
