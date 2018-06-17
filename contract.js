/**
 * CryptoHero Contract Nebulas Version
 * ©️ Andoromeda Foundation All Right Reserved.
 * @author: Frank Wei <frank@frankwei.xyz>
 * @version: 1.0
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

class Tool {
    static fromNasToWei(value) {
        return new BigNumber("1000000000000000000").times(value)
    }
    static fromWeiToNas(value) {
        if (value instanceof BigNumber) {
            return value.dividedBy("1000000000000000000")
        } else {
            return new BigNumber(value).dividedBy("1000000000000000000")
        }
    }
    static getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }
}


class StandardNRC721Token {
    constructor() {
        // Contract Need to store on-chain data in LocalContractStorage
        LocalContractStorage.defineProperties(this, {
            _name: null,
            _symbol: null
        })
        LocalContractStorage.defineMapProperties(this, {
            "tokenOwner": null,
            "ownedTokensCount": null,
            "tokenApprovals": null,
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

    init(name, symbol) {
        this._name = name
        this._symbol = symbol
    }

    name() {
        return this._name
    }

    symbol() {
        return this._symbol
    }

    balanceOf(_owner) {
        var balance = this.ownedTokensCount.get(_owner)
        return balance
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
        if (tokenCount < 1) {
            throw new Error("Insufficient account balance in removeTokenFrom.")
        }
        this.tokenOwner.delete(_tokenId)
        this.ownedTokensCount.set(_from, tokenCount - 1)
    }

    // These function can be directly called without underscore in the first letter
    _addTokenTo(_to, _tokenId) {
        this.tokenOwner.set(_tokenId, _to)
        var tokenCount = this.ownedTokensCount.get(_to) || 0
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

class CryptoHeroToken extends StandardNRC721Token {
    constructor() {
        super()
        LocalContractStorage.defineProperties(this, {
            _length: null,
            totalQty: null
        })
    }

    init(name = "CryptoHero", symbol = "hero", totalQty = "210000000") {
        super.init(name, symbol)
        this._length = 0
        this.totalQty = new BigNumber(totalQty)
    }
    
    onlyTokenOwner(_tokenId) {
        const { from } = Blockchain.transaction
        var owner = this.ownerOf(_tokenId)
        if (from != owner) {
            throw new Error("Sorry, But you don't have the permission as the owner of the token.")
        }
    }    

    _issue(_to, _heroId) {
        if (this.isSoldOut()) {
            throw new Error("Sorry, the card pool is empty now.")
        } else {
            var tokenId = this._length
            this._mint(_to, tokenId)
            this.tokenToChara.set(tokenId, _heroId)
            this.tokenPrice.set(_tokenId, Tool.fromNasToWei(100))            
            this._length += 1;
            return tokenId
        }
    }

    isSoldOut() {
        return new BigNumber(0).gte(this.totalQty)
    }

    isTokenClaimed(tokenId) {
        return this.tokenClaimed[tokenId]
    }        

    getCardsLeft() {
        return new BigNumber(this.totalQty).toString(10);
    }

    getCardIdByTokenId(_tokenId) {
        return this.tokenToChara.get(_tokenId)
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

    priceOf(_tokenId) {
        return this.tokenPrice.get(_tokenId)
    }    

    setTokenPrice(_tokenId, _value) {
        this.onlyTokenOwner(_tokenId)
        this.tokenPrice.set(_tokenId, Tool.fromNasToWei(_value))
    }    

    getTotalSupply() {
        return this._length
    }

    buyToken(_tokenId) {
        var value = new BigNumber(Blockchain.transaction.value);
        if (value < this.priceOf(_tokenId)) {
            throw new Error("Sorry, insufficient bid.")
        }
        const { from } = Blockchain.transaction

        const remain = this.priceOf(_tokenId) - value;
        Blockchain.transfer(from, remain)        
        
        const profit = value.multipliedBy(97).dividedBy(100)
        Blockchain.transfer(this.ownerOf(_tokenId), profit)        

        this.tokenOwner.set(_tokenId, from)
        this.tokenPrice.set(_tokenId, Tool.fromNasToWei(100))
    }    
}

class OwnerableContract extends CryptoHeroToken {
    constructor() {
        super()
        LocalContractStorage.defineProperties(this, { owner: null })
        LocalContractStorage.defineMapProperties(this, { "admins": null })                
    }

    init() {
        super.init()
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

    setAdmins(address) {
        this.onlyContractOwner()
        this.admins.set(address, "true")
    }        
}

class CryptoHeroContract extends OwnerableContract {
    constructor() {
        super()
        LocalContractStorage.defineProperties(this, {
            drawChances: null,            
            drawPrice: null,
            referCut: null
        })
        LocalContractStorage.defineMapProperties(this, {          
            "tokenClaimed": null,            
            "tokenToChara": null         
        })        
    } 

    init(initialPrice = "10000000000000", drawChances = {
        thug: 500,
        bigDipper: 250,
        goon: 10,
        easterEgg: 1
    }) {
        super.init()
        this.drawPrice = new BigNumber(initialPrice)
        this.referCutPercentage = 5
        this.drawChances = drawChances
    }

    countHerosBy(tokens) {
        const { getCardIdByTokenId } = this
        var tag = []
        var count = 0
        for (const i in tokens) {
            if (tag[getCardIdByTokenId(i)] == false) {
                count += 1
                tag[getCardIdByTokenId(i)] = true
            }
        }
        return {
            count,
            tag
        }
    }

    countHerosByAddress(_address) {
        const {
            countHerosBy,
            getTokenIDsByAddress
        } = this
        const tokens = getTokenIDsByAddress(_address)
        const heros = countHerosBy(tokens)
        return Object.assign(heros, tokens)
    }

    claim() {
        const { from } = Blockchain.transaction
        const {
            getCardIdByTokenId,
            countHerosByAddress,
            drawPrice
        } = this
        const {
            count,
            tag,
            tokens
        } = countHerosByAddress(from)
        if (count !== 108) {
            throw new Error("Sorry, you don't have enough token.")
        }

        tokens.forEach((tokenId) => {
            if (tag[getCardIdByTokenId(tokenId)]) {
                this.tokenClaimed[tokenId] = true
            }
        });
        this.drawPrice = new BigNumber(drawPrice).minus(Tool.fromNasToWei(0.0108))
    }

    getDrawPrice() {
        return this.drawPrice
    }

    // For keeping price to fiat
    changePrice(value) {
        this.onlyAdmins()
        this.drawPrice = new BigNumber(value)
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
        // Only the owner can have the withdraw fund, so be careful
        return Blockchain.transfer(this.owner, new BigNumber(value))
    }

    getReferPercentage() {
        return this.referCutPercentage
    }

    getType(r) {
        const {
            thug,
            bigDipper,
            goon
        } = this.drawChances
        if (r <= bigDipper * 36) {
            return {
                offset: 1,
                count: 36
            }
        }
        r -= bigDipper * 36;
        if (r <= thug * 72) {
            return {
                offset: 37,
                count: 72
            }
        }
        r -= thug * 72
        if (r <= goon * 6) {
            return {
                offset: 109,
                count: 6
            }
        }
        return {
            offset: 0,
            count: 1
        }
    }

    _dynamicDraw(from) {
        const {
            thug,
            bigDipper,
            goon,
            easterEgg
        } = this.drawChances
        const r = Tool.getRandomInt(0, bigDipper * 36 + thug * 72 + goon * 6 + easterEgg)
        const {
            offset,
            count
        } = this.getType(r)
        const randomHeroId = offset + Tool.getRandomInt(0, count)
        var tokenId = this._issue(from, randomHeroId)
        return tokenId
    }

    _issueMultipleCard(from, qty) {
        const resultArray = []
        for (let i = 0; i < qty; i += 1) {
            var tokenId = this._dynamicDraw(from)
            resultArray.push(tokenId)
        }
        // In the final the base is 0.0001, 0.00000000001 for dev only
        const totalAdd = Tool.fromNasToWei(0.00000000001).times(qty)
        this.drawPrice = totalAdd.plus(this.drawPrice)
        return resultArray
    }

    draw(referer) {
        var {
            from,
            value
        } = Blockchain.transaction
        const {
            drawPrice,
            referCutPercentage
        } = this
        const qty = value.dividedToIntegerBy(drawPrice)
        if (value.gt(0)) {
            const result = this._issueMultipleCard(from, qty)
            if (referer !== "") {
                const referCut = value.dividedToIntegerBy(100 / referCutPercentage)
                Blockchain.transfer(referer, referCut)
            }
            return result
        } else {
            throw new Error("You don't have enough token, try again with more.")
        }
    }
}

module.exports = CryptoHeroContract