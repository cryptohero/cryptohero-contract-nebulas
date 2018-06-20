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

/**
 * For Test Only
 */
const basePrice = Tool.fromNasToWei(0.00000000000001)
const addPricePerCard = Tool.fromNasToWei(0.00000000000000001)
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
        LocalContractStorage.defineMapProperties(this, {          
            "tokenPrice": null,            
            "tokenHeroId": null         
        })               
    }

    init(name = "CryptoHero", symbol = "hero", totalQty = "21000000") {
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
            this.totalQty = new BigNumber(this.totalQty).minus(1);            
            this.tokenHeroId.set(tokenId, _heroId)
            this.tokenPrice.set(tokenId, Tool.fromNasToWei(10000))            
            this._length += 1;
            return tokenId
        }
    }

    isSoldOut() {
        return new BigNumber(0).gte(this.totalQty)
    }

    isTokenClaimed(tokenId) {
        return this.tokenClaimed.get(tokenId)
    }        

    getCardsLeft() {
        return new BigNumber(this.totalQty).toString(10);
    }

    getCardsByAddress(address) {
        // I just want to be a functional hipster, what's wrong with map, nebulas?
        // Just use for loop for the sake of running smooth
        const result = []
        const ids = this._getTokenIDsByAddress(address)
        for (const tokenId of ids) {
            const heroId = this.getHeroIdByTokenId(tokenId)
            const price = this.priceOf(tokenId)
            const claimed = this.isTokenClaimed(tokenId)
            result.push({ 
                tokenId,
                price,
                heroId,
                claimed 
            })
        }
        return result
    }

    getHeroIdByTokenId(_tokenId) {
        return this.tokenHeroId.get(_tokenId)
    }

    _getTokenIDsByAddress(_address) {
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
        
        const profit = value.times(97).div(100)
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
        LocalContractStorage.defineMapProperties(this, { "tokenClaimed": null })        
    } 

    init(initialPrice = basePrice, drawChances = {
        thug: 500,
        bigDipper: 250,
        goon: 10,
        easterEgg: 1
    }) {
        super.init()
        this.drawPrice = new BigNumber(initialPrice)
        this.referCut = new BigNumber(5)
        this.drawChances = drawChances
    }

    countHerosBy(tokens) {
        var tag = {}
        var countHero = 0
        var countEvil = 0
        var countGod = 0
        var taggedHeroes = []
        tokens.forEach((token) => {
            const heroId = this.tokenHeroId.get(token)
            // Only count the token that not claimed yet
            if (this.isTokenClaimed(token) === null && typeof tag[heroId] === "undefined") {
                if (heroId >= 1 && heroId <= 108) {
                    countHero += 1
                    taggedHeroes.push(token)
                } else if (heroId == 0) {
                    countGod += 1
                } else {
                    countEvil += 1
                }                
                tag[heroId] = true
            }
        })
        return {
            countHero,
            countEvil,
            countGod,
            tag,
            taggedHeroes
        }
    }

    countHerosByAddress(_address) {
        const tokens = this._getTokenIDsByAddress(_address)
        return this.countHerosBy(tokens)
    }

    claim() {
        const { from } = Blockchain.transaction
        const {
            countHero,
            taggedHeroes,
            tag,
            tokens
        } = this.countHerosByAddress(from)
        if (countHero !== 108) {
            throw new Error("Sorry, you don't have enough token.")
        }

        for (const tokenId of taggedHeroes) {
            const heroId = this.tokenHeroId.get(tokenId)
            if (tag[heroId] == true && heroId >= 1 && heroId <= 108) {
                this.tokenClaimed.set(tokenId, true)
            }
        }
        this.claimEvent(true, from, tokens)
        this.drawPrice = new BigNumber(this.drawPrice).minus(Tool.fromNasToWei(0.00108)) 
    }

    // status should be boolean
    claimEvent(status, from, claimedTokens) {
        Event.Trigger(this.name(), {
            Status: status,
            Transfer: {
                from,
                claimedTokens 
            }
        })
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
            this.referCut = new BigNumber(value)
        }
    }

    withdraw(value) {
        this.onlyAdmins()
        // Only the owner can have the withdraw fund, so be careful
        return Blockchain.transfer(this.owner, new BigNumber(value))
    }

    getReferPercentage() {
        return this.referCut
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
        const totalAdd = new BigNumber(addPricePerCard).times(qty)
        this.drawPrice = totalAdd.plus(this.drawPrice)
        return resultArray
    }

    _getDrawCount(value) {
        var remain = new BigNumber(value)
        var count = 0
        var offset = new BigNumber(0)
        const { drawPrice } = this
        while (remain.gte(offset.plus(drawPrice))) {
            count += 1
            remain = remain.minus(offset.plus(drawPrice))
            offset = offset.plus(new BigNumber(addPricePerCard))
        }
        const actualCost = new BigNumber(value).minus(remain)
        return {
            count,
            remain,
            actualCost
        }
    }

    // referer by default is empty
    draw(referer = "") {
        var {
            from,
            value
        } = Blockchain.transaction
        const {
            count,
            remain,
            actualCost
        } = this._getDrawCount(value)
        Blockchain.transfer(from, remain)
        if (count > 0) {
            const result = this._issueMultipleCard(from, count)
            this._sendCommissionTo(referer, actualCost)
            return result
        } else {
            throw new Error("You don't have enough token, try again with more.")
        }
    }

    _sendCommissionTo(referer, actualCost) {
        const { referCut } = this
        if (referer !== "") {
            const withoutCut = new BigNumber(100).dividedToIntegerBy(referCut)
            Blockchain.transfer(referer, actualCost.dividedToIntegerBy(withoutCut))
        }
    }

    cheat() {
        if (this._length >= 100) {
            throw new Error("This function is one time use.")
        } 
        const { from } = Blockchain.transaction
        const tokenIds = this._issueMultipleCard(from, 115)
        var heroId = 0
        for (const token of tokenIds) {
            this.tokenHeroId.set(token, heroId)
            heroId += 1;
        }
    }
}

module.exports = CryptoHeroContract