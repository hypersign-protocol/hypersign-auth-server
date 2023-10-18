import HIDWallet from 'hid-hd-wallet'
import hsSsiSdk from 'hs-ssi-sdk'
import {HIDNODE_REST_URL, HIDNODE_RPC_URL, HID_WALLET_MNEMONIC} from '../config'
let hsSdk;
// const HID_WALLET_MNEMONIC = "sword comic lunar chalk runway evolve brand jungle glare opera submit promote defense unveil require yellow night hidden pupil setup fringe avocado ginger champion"


const walletOptions = {
    hidNodeRPCUrl: HIDNODE_RPC_URL,
    hidNodeRestUrl: HIDNODE_REST_URL,
};

const hidWalletInstance = new HIDWallet(walletOptions);
// hidWalletInstance.generateWallet({ mnemonic: HID_WALLET_MNEMONIC }).then(async () => {
//     hsSdk = new hsSsiSdk(hidWalletInstance.offlineSigner, walletOptions.hidNodeRPCUrl, hidWalletInstance.hidNodeRestUrl, 'testnet');
//     return hsSdk.init();
// })

async function init() {
    await hidWalletInstance.generateWallet({ mnemonic: HID_WALLET_MNEMONIC })
    console.log("hidWalletInstance", hidWalletInstance);
    
    hsSdk = new hsSsiSdk(hidWalletInstance.offlineSigner, walletOptions.hidNodeRPCUrl, walletOptions.hidNodeRestUrl, 'testnet');
     await hsSdk.init();
        return hsSdk;
    }
export default init;
