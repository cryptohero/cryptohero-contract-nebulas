import { LocalContractStorage, Blockchain, StorageMap, Event } from "./System";
import { BigNumber } from "./bignumber";
import OwnableContract from "./OwnableContract";


const BigNumberStorageDescriptor = {
    parse(value: string | number) {
        return new BigNumber(value);
    },
    stringify(o: BigNumber) {
        return o.toString(10);
    }
}

const objectMapDescriptor = {
    parse(value: string) {
        return JSON.parse(value)
    },
    stringify(o: any) {
        return JSON.stringify(o)
    }
}

interface AllowProfile {
    [key: string]: BigNumber;
}

class Allowed {
    allowed: AllowProfile;
    constructor(obj?: any) {
        this.allowed = {};
        this.parse(obj);
    }

    toString() {
        return JSON.stringify(this.allowed);
    }

    parse(obj: any) {
        if (typeof obj != "undefined") {
            var data = JSON.parse(obj);
            for (var key in data) {
                this.allowed[key] = new BigNumber(data[key]);
            }
        }
    }

    get(key: string): BigNumber {
        return this.allowed[key];
    }

    set(key: string, value: BigNumber | number | string) {
        this.allowed[key] = new BigNumber(value);
    }
}

type possibleNumber = BigNumber | string | number

class NRC20Token extends OwnableContract {
    _name: string;
    _symbol: string;
    _decimals: number;
    _totalSupply: BigNumber;
    balances: StorageMap<BigNumber>;
    allowed: StorageMap<Allowed>;

    constructor() {
        super()
        LocalContractStorage.defineProperties(this, {
            _name: null,
            _symbol: null,
            _decimals: null,
            _totalSupply: BigNumberStorageDescriptor
        });

        LocalContractStorage.defineMapProperties(this, {
            "balances": BigNumberStorageDescriptor,
            "allowed": {
                parse(value) {
                    return new Allowed(value);
                },
                stringify(o) {
                    return o.toString();
                }
            }
        });
    }

    // Workaround for 
    // Property 'init' in type 'The Child Class' is not assignable
    // to the same property in base type 'The Father Class'
    _initNRC20Token(name: string, symbol: string, decimals: number, totalSupply: string | number) {
        super._initOwnableContract()
        this._name = name;
        this._symbol = symbol;
        this._decimals = decimals || 0;
        this._totalSupply = new BigNumber(totalSupply).mul(new BigNumber(10).pow(decimals));

        var from = Blockchain.transaction.from;
        this.balances!.set(from, this._totalSupply);
        this.transferEvent(true, from, from, this._totalSupply);
    }

    // Returns the name of the token
    name() {
        return this._name || '';
    }

    // Returns the symbol of the token
    symbol() {
        return this._symbol;
    }

    // Returns the number of decimals the token uses
    decimals() {
        return this._decimals;
    }

    totalSupply() {
        return this._totalSupply!.toString(10);
    }

    balanceOf(owner: string) {
        var balance = this.balances!.get(owner);
        if (balance instanceof BigNumber) {
            return balance.toString(10);
        } else {
            return "0";
        }
    }

    transfer(to: string, value: possibleNumber) {
        value = new BigNumber(value);
        if (value.lt(0)) {
            throw new Error("invalid value.");
        }

        var from = Blockchain.transaction.from;
        var balance = this.balances!.get(from) || new BigNumber(0);
        if (balance.lt(value)) {
            throw new Error("transfer failed.");
        }

        this.balances!.set(from, balance.sub(value));
        var toBalance = this.balances!.get(to) || new BigNumber(0);
        this.balances!.set(to, toBalance.add(value));

        this.transferEvent(true, from, to, value);
    }

    transferFrom(from: string, to: string, value: possibleNumber) {
        var spender = Blockchain.transaction.from;
        var balance = this.balances!.get(from) || new BigNumber(0);

        var allowed = this.allowed!.get(from) || new Allowed();
        var allowedValue = allowed.get(spender) || new BigNumber(0);
        value = new BigNumber(value);

        if (value.gte(0) && balance.gte(value) && allowedValue.gte(value)) {

            this.balances!.set(from, balance.sub(value));

            // update allowed value
            allowed.set(spender, allowedValue.sub(value));
            this.allowed!.set(from, allowed);

            var toBalance = this.balances!.get(to) || new BigNumber(0);
            this.balances!.set(to, toBalance.add(value));

            this.transferEvent(true, from, to, value);
        } else {
            throw new Error("transfer failed.");
        }
    }

    approveEvent(status: boolean, from: string, spender: string, value: possibleNumber) {
        Event.Trigger(this.name(), {
            Status: status,
            Action: "Approve",
            Approve: {
                owner: from,
                spender: spender,
                value: value
            }
        });
    }

    transferEvent(status: boolean, from: string, to: string, value: possibleNumber) {
        Event.Trigger(this.name(), {
            Status: status,
            Action: "Transfer",
            Transfer: {
                from,
                to,
                value
            }
        });
    }

    approve(spender: string, currentValue: possibleNumber, value: possibleNumber) {
        var from = Blockchain.transaction.from;
        var oldValue = this.allowance(from, spender);
        if (oldValue != currentValue.toString()) {
            throw new Error("current approve value mistake.");
        }

        var balance = new BigNumber(this.balanceOf(from));
        value = new BigNumber(value);
        if (value.lt(0) || balance.lt(value)) {
            throw new Error("invalid value.");
        }

        var owned = this.allowed!.get(from) || new Allowed();
        owned.set(spender, value);

        this.allowed!.set(from, owned);

        this.approveEvent(true, from, spender, value);
    }

    allowance(owner: string, spender: string) {
        var owned = this.allowed!.get(owner);
        if (owned instanceof Allowed) {
            let spend: BigNumber = owned.get(spender);
            if (typeof spend != "undefined") {
                return spend.toString(10);
            }
        }
        return "0";
    }

    _issue(_to: string, _amount: possibleNumber) {
        var amount = new BigNumber(_amount)
        var balance = this.balances!.get(_to) || new BigNumber(0)
        this._totalSupply = new BigNumber(this._totalSupply!).add(amount)
        this.balances!.set(_to, balance.add(amount))
    }

    _destroy(_from: string, _amount: possibleNumber) {
        var amount = new BigNumber(_amount)
        var balance = this.balances!.get(_from) || new BigNumber(0)
        this._totalSupply = new BigNumber(this._totalSupply!).sub(amount)
        this.balances!.set(_from, balance.sub(amount))
    }
}

export default NRC20Token;