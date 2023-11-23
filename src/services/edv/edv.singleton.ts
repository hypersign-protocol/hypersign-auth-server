import { IEdvClientManager } from './edvClientManager';
import { EdvClientManagerFactoryService } from './edv.clientFactory';
import { VaultWallet } from './vaultWalletManager';

export class EdvClientKeysManager {
  static edvClientKeysManager: EdvClientKeysManager;
  constructor() {
    if (EdvClientKeysManager.edvClientKeysManager) {
      return EdvClientKeysManager.edvClientKeysManager;
    }
    EdvClientKeysManager.edvClientKeysManager = this;
  }

  async createVault(
    vaultwallet: VaultWallet,
    edvId?: string,
    edvUrl?: string
  ): Promise<IEdvClientManager> {
    return EdvClientManagerFactoryService.createEdvClientManger(
      vaultwallet,
      edvId,
      edvUrl
    );
  }
}
