/**
 * LinkIdol Contract, copyright is owned by Andoromeda Foundation
 * @author: Frank Wei <frank@frankwei.xyz>
 * Last updated: 12:00 AM, May 30th
 * Test Net Contract Address: n1oecF9SK8wUKxAcTVCYfvsvG3P6TmHWdzW 
 * @version: 0.9 beta - need to find the potential bug
 */
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
        LocalContractStorage.defineProperties(this, { _name: null, })
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
    constructor() {
        super()
        LocalContractStorage.defineProperties(this, {
            _length: null,
            girlsList: null,
            // Changed `totalQty` before deploy!!!            
            totalQty: null
        })

        LocalContractStorage.defineMapProperties(this, { "admins": null })
    }


    init(name, symbol, initialGirlsList) {
        super.init(name, symbol)
        this._length = 0
        this.totalQty = 100
        this.girlsList = initialGirlsList
    }

    _issue(_to, _girlId) {
        var tokenId = this._length
        if (this.isSoldOut()) {
            throw new Error("Sorry, the card pool is empty now.")
        } else {
            this._mint(_to, tokenId)
            this.tokenToChara.set(tokenId, _girlId)
            this.totalQty -= 1;
            this._length += 1;
            return tokenId
        }
    }

    isSoldOut() {
        return this.totalQty <= 0
    }

    getCardsLeft() {
        return this.totalQty;
    }

    getCardIdByTokenId(_tokenId) {
        return this.tokenToChara.get(_tokenId)
    }

    getCardNameByTokenId(_tokenId) {
        const cardId = this.getCardIdByTokenId(_tokenId)
        return this.girlsList[cardId]
    }

    getGirlsList() {
        return this.girlsList
    }

    getTokenIDsByAddress(_address) {
        var result = []
        for (let id = 0; id < this._length; id += 1) {
            if (this.ownerOf(id) === _address) {
                result.push(id)
            }
        }
        return result
    }

    getTotalSupply() {
        return this._length
    }
}

class LinkIdolContract extends LinkIdolToken {
    constructor() {
        super()
        LocalContractStorage.defineProperties(this, {
            cardPrice: null,
            owner: null,
            referCut: null
        })
    }

    init(name, symbol, initialPrice, initialGirlsList) {
        const { from } = Blockchain.transaction
        super.init(name, symbol, initialGirlsList)
        this.admins.set(from, "true")
        this.cardPrice = initialPrice
        this.owner = from
        this.referCutPercentage = 5
    }

    onlyAdmins() {
        const { from } = Blockchain.transaction
        if (!this.admins.get(from)) {
            throw new Error("Sorry, You don't have the permission as admins.")
        }
    }

    setAdmins(address) {
        this.onlyContractOwner()
        this.admins.set(address, "true")
    }

    onlyContractOwner() {
        const { from } = Blockchain.transaction
        if (this.owner !== from) {
            throw new Error("Sorry, But you don't have the permission as owner.")
        }
    }

    getPrice() {
        return this.cardPrice
    }

    // For keeping price to fiat
    changePrice(value) {
        this.onlyAdmins()
        this.cardPrice = value
    }

    changeReferPercentage(value) {
        this.onlyAdmins()
        if (value > 100) {
            throw new Error("Refer Percentage above 100 is ridiculous, we are not selling for lost")
        } else {
            this.referCutPercentage = value
        }
    }

    withdraw(value) {
        this.onlyAdmins()
        // Only the owner can have the withdraw fund
        return Blockchain.transfer(this.owner, new BigNumber(value))
    }

    getReferPercentage() {
        return this.referCutPercentage
    }

    luckyDraw(referer) {
        var randomGirlId = parseInt(Math.random() * (this.girlsList.length + 1))
        var { from, value } = Blockchain.transaction
        if (value.eq(this.cardPrice)) {
            var tokenId = this._issue(from, randomGirlId)
            if (referer !== "") {
                Blockchain.transfer(referer, new BigNumber(value).dividedToIntegerBy(100 / this.referCutPercentage))
            }
            return tokenId
        } else {
            throw new Error("Price is not matching, please check your transaction details.")
        }
    }
}

module.exports = LinkIdolContract