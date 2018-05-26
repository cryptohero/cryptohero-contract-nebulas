// Copyright (C) 2017 go-nebulas authors
//
// This file is part of the go-nebulas library.
//
// the go-nebulas library is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// the go-nebulas library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with the go-nebulas library.  If not, see <http://www.gnu.org/licenses/>.
//
"use strict"

class Operator {
    constructor(obj) {
        this.operator = {}
        this.parse(obj)
    }
    toString() {
        return JSON.stringify(this.operator)
    }

    parse(obj) {
        if (typeof obj != "undefined") {
            var data = JSON.parse(obj)
            for (var key in data) {
                this.operator[key] = data[key]
            }
        }
    }

    get(key) {
        return this.operator[key]
    }

    set(key, value) {
        this.operator[key] = value
    }
}


class StandardNRC721Token {
    constructor() {
        // Contract Need to store on-chain data in LocalContractStorage
        LocalContractStorage.defineProperties(this, {
            _name: null,
            _length: null
        })
        LocalContractStorage.defineMapProperties(this, {
            "tokenOwner": null,
            "ownedTokensCount": {
                parse(value) {
                    return new BigNumber(value)
                },
                stringify(o) {
                    return o.toString(10)
                }
            },
            "tokenApprovals": null,
            "tokenToChara": null,
            "operatorApprovals": {
                parse(value) {
                    return new Operator(value)
                },
                stringify(o) {
                    return o.toString()
                }
            },
        })
    }

    init(name) {
        this._name = name
        this._length = 0
    }

    name() {
        return this._name
    }

    balanceOf(_owner) {
        var balance = this.ownedTokensCount.get(_owner)
        if (balance instanceof BigNumber) {
            return balance.toString(10)
        } else {
            return "0"
        }
    }

    ownerOf(_tokenId) {
        return this.tokenOwner.get(_tokenId)
    }

    approve(_to, _tokenId) {
        var from = Blockchain.transaction.from

        var owner = this.ownerOf(_tokenId)
        if (_to == owner) {
            throw new Error("invalid address in approve.")
        }
        // msg.sender == owner || isApprovedForAll(owner, msg.sender)
        if (owner == from || this.isApprovedForAll(owner, from)) {
            this.tokenApprovals.set(_tokenId, _to)
            this.approveEvent(true, owner, _to, _tokenId)
        } else {
            throw new Error("permission denied in approve.")
        }
    }
    getApproved(_tokenId) {
        return this.tokenApprovals.get(_tokenId)
    }

    setApprovalForAll(_to, _approved) {
        var from = Blockchain.transaction.from
        if (from == _to) {
            throw new Error("invalid address in setApprovalForAll.")
        }
        var operator = this.operatorApprovals.get(from) || new Operator()
        operator.set(_to, _approved)
        this.operatorApprovals.set(from, operator)
    }

    isApprovedForAll(_owner, _operator) {
        var operator = this.operatorApprovals.get(_owner)
        if (operator != null) {
            if (operator.get(_operator) === "true") {
                return true
            } else {
                return false
            }
        }
    }

    isApprovedOrOwner(_spender, _tokenId) {
        var owner = this.ownerOf(_tokenId)
        return _spender == owner || this.getApproved(_tokenId) == _spender || this.isApprovedForAll(owner, _spender)
    }

    rejectIfNotApprovedOrOwner(_tokenId) {
        var from = Blockchain.transaction.from
        if (!this.isApprovedOrOwner(from, _tokenId)) {
            throw new Error("permission denied in transferFrom.")
        }
    }
    transferFrom(_from, _to, _tokenId) {
        var from = Blockchain.transaction.from
        if (this.isApprovedOrOwner(from, _tokenId)) {
            this.clearApproval(_from, _tokenId)
            this.removeTokenFrom(_from, _tokenId)
            this._addTokenTo(_to, _tokenId)
            this.transferEvent(true, _from, _to, _tokenId)
        } else {
            throw new Error("permission denied in transferFrom.")
        }
    }

    clearApproval(_owner, _tokenId) {
        var owner = this.ownerOf(_tokenId)
        if (_owner != owner) {
            throw new Error("permission denied in clearApproval.")
        }
        this.tokenApprovals.del(_tokenId)
    }

    removeTokenFrom(_from, _tokenId) {
        if (_from != this.ownerOf(_tokenId)) {
            throw new Error("permission denied in removeTokenFrom.")
        }
        var tokenCount = this.ownedTokensCount.get(_from)
        if (tokenCount.lt(1)) {
            throw new Error("Insufficient account balance in removeTokenFrom.")
        }
        this.tokenOwner.delete(_tokenId)
        this.ownedTokensCount.set(_from, tokenCount - 1)
    }

    // These function can be directly called without underscore in the first letter
    _addTokenTo(_to, _tokenId) {
        this.tokenOwner.set(_tokenId, _to)
        var tokenCount = this.ownedTokensCount.get(_to) || new BigNumber(0)
        this.ownedTokensCount.set(_to, tokenCount + 1)
    }

    _mint(_to, _tokenId) {
        this._addTokenTo(_to, _tokenId)
        this.transferEvent(true, "", _to, _tokenId)
    }

    _burn(_owner, _tokenId) {
        this.clearApproval(_owner, _tokenId)
        this.removeTokenFrom(_owner, _tokenId)
        this.transferEvent(true, _owner, "", _tokenId)
    }

    transferEvent(status, _from, _to, _tokenId) {
        Event.Trigger(this.name(), {
            Status: status,
            Transfer: {
                from: _from,
                to: _to,
                tokenId: _tokenId
            }
        })
    }

    approveEvent(status, _owner, _spender, _tokenId) {
        Event.Trigger(this.name(), {
            Status: status,
            Approve: {
                owner: _owner,
                spender: _spender,
                tokenId: _tokenId
            }
        })
    }
}

class LinkIdolToken extends StandardNRC721Token {
    isContractOwner() {
        var from = Blockchain.transaction.from
        return this.owner === from
    }

    _issue(_to, _girlId) {
        var tokenId = this._length
        this._mint(_to, tokenId)
        this.tokenToChara.set(tokenId, _girlId)
        this._length += 1
        return this._length
    }
}

class LinkIdolContract extends LinkIdolToken {
    constructor() {
        super()
        LocalContractStorage.defineProperties(this, {
            cardPrice: null,
            owner: null,
            girlsList: null
        })
    }

    init(name, symbol, initialGirlsList) {
        const { from, value } = Blockchain.transaction
        super.init(name, symbol)
        this.cardPrice = value
        this.owner = from
        this.girlsList = initialGirlsList
    }

    isContractOwner() {
        return Blockchain.transaction.from === this.owner
    }

    changePrice(value) {
        if (this.isContractOwner()) {
            this.cardPrice = value
        } else {
            throw new Error("You don't have permission to change price.")
        }
    }

    withdraw(value) {
        var address = Blockchain.transaction.from
        if (this.isContractOwner()) {
            return Blockchain.transfer(address, new BigNumber(value))
        } else {
            throw new Error("You don't have permission to withdraw balance.")
        }
    }

    luckyDraw(referer) {
        var randomGirlId = parseInt(Math.random() * this.girlsList.length)
        var { from, value } = Blockchain.transaction
        if (`${this.cardPrice}` === `${value}`) {
            var tokenId = this._issue(from, randomGirlId)
            if (referer !== "") {
                Blockchain.transfer(referer, new BigNumber(value).dividedToIntegerBy(20))
            }
            return tokenId
        } else {
            throw new Error("Price is not matching, please check your transaction details.")
        }
    }
}

module.exports = LinkIdolContract

/**
 * Last updated: 12:45AM, May 26th
 * Test Net Contract Address: n1vNC95wk8wDW85jD1gPXjChpqFGdXmA4Yk 
 */