import { EdvClientManger, IEdvClientManager } from './edvClientManager';
import { VaultWallet } from './vaultWalletManager';

export class EdvClientManagerFactoryService {
  // It can either accept keys, diddoc or it can except a mnemonic.
  static async createEdvClientManger(
    vaultwallet: VaultWallet,
    edvId?: string,
    edvUrl?: string,
  ): Promise<IEdvClientManager> {
    return new EdvClientManger(vaultwallet, edvId, edvUrl).initate();
  }
}
