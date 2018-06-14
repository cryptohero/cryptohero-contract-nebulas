import { Transaction, Account } from "nebulas";

const networkSetting = {
    "mainnet": 1,
    "testnet": 1001,
}

export function innerDeploy({network = "testnet", address}) {
    var chainID = networkSetting[network]
    var gasPrice = getGasPrice()
    new Transaction({chainID: 1, from: address, to:address, value: 0, nonce, gasPrice, gasLimit})
}