import { LocalContractStorage, Blockchain, StorageMap, DynamicParameter } from "./System";
import { BigNumber } from "./bignumber";

class OwnableContract {
    owner: string;
    myAddress: string;
    admins: StorageMap<string>;
    constructor() {
        LocalContractStorage.defineProperties(this, {
            owner: null,
            myAddress: null
        })
        LocalContractStorage.defineMapProperties(this, { "admins": null })
    }

    // Workaround for 
    // Property 'init' in type 'The Child Class' is not assignable
    // to the same property in base type 'The Father Class'
    _initOwnableContract() {
        const { from } = Blockchain.transaction
        this.admins.set(from, "true")
        this.owner = from
    }

    onlyAdmins() {
        const { from } = Blockchain.transaction
        if (!this.admins.get(from)) {
            throw new Error("Sorry, You don't have the permission as admins.")
        }
    }

    onlyContractOwner() {
        const { from } = Blockchain.transaction
        if (this.owner !== from) {
            throw new Error("Sorry, But you don't have the permission as owner.")
        }
    }

    getContractOwner() {
        return this.owner
    }

    getAdmins() {
        return this.admins
    }

    setAdmins(address: string) {
        this.onlyContractOwner()
        this.admins.set(address, "true")
    }

    withdraw(value: number | string | BigNumber) {
        this.onlyAdmins()
        // Only the owner can have the withdraw fund, so be careful
        return Blockchain.transfer(this.owner, new BigNumber(value))
    }

    withdrawAll() {
        this.withdraw(this.getContractBalance())
    }

    setMyAddress() {
        this.onlyContractOwner()
        this.myAddress = Blockchain.transaction.to
    }

    getContractBalance() {
        var balance = new BigNumber(Blockchain.getAccountState(this.myAddress).balance);
        return balance
    }
}

export default OwnableContract