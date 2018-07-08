import BigNumber from './bignumber';

interface Descriptor {
    // serialize value to string;
    stringify?(value: any): string;

    // deserialize value from string;
    parse?(value: string): any;
}

interface DescriptorMap {
    [fieldName: string]: Descriptor | null;
}

interface ContractStorage {
    // get and return value by key from Native Storage.
    rawGet(key: string): string;
    // set key and value pair to Native Storage,
    // return 0 for success, otherwise failure.
    rawSet(key: string, value: string): number;

    // define a object property named `fieldname` to `obj` with descriptor.
    // default descriptor is JSON.parse/JSON.stringify descriptor.
    // return this.
    defineProperty(obj: any, fieldName: string, descriptor?: Descriptor): any;

    // define object properties to `obj` from `props`.
    // default descriptor is JSON.parse/JSON.stringify descriptor.
    // return this.
    defineProperties(obj: any, props: DescriptorMap): any;

    // define a StorageMap property named `fieldname` to `obj` with descriptor.
    // default descriptor is JSON.parse/JSON.stringify descriptor.
    // return this.
    defineMapProperty(obj: any, fieldName: string, descriptor?: Descriptor): any;

    // define StorageMap properties to `obj` from `props`.
    // default descriptor is JSON.parse/JSON.stringify descriptor.
    // return this.
    defineMapProperties(obj: any, props: DescriptorMap): any;

    // delete key from Native Storage.
    // return 0 for success, otherwise failure.
    del(key: string): number;

    // get value by key from Native Storage,
    // deserialize value by calling `descriptor.parse` and return.
    get(key: string): any;

    // set key and value pair to Native Storage,
    // the value will be serialized to string by calling `descriptor.stringify`.
    // return 0 for success, otherwise failure.
    set(key: string, value: any): number;
}
//用于编写代码时的提示
export declare const LocalContractStorage: ContractStorage;


export interface StorageMap<T> {
    // delete key from Native Storage, return 0 for success, otherwise failure.
    del(key: string): number;

    // get value by key from Native Storage,
    // deserialize value by calling `descriptor.parse` and return.
    get(key: string): T;

    // set key and value pair to Native Storage,
    // the value will be serialized to string by calling `descriptor.stringify`.
    // return 0 for success, otherwise failure.
    set(key: string, value: any): number;
}

//blockchain结构,根据官方文档yy的

interface DynamicParameter {
    [fieldName: string]: any;
}

interface IBlockchain {
    // current block 
    block: {
        //块的时间戳,单位:?
        timestamp: number;
        //随机数种子
        seed: any;
        //区块高度
        height: number;
    };

    // current transaction, transaction's value/gasPrice/gasLimit auto change to BigNumber object
    transaction: {
        hash: string; //交易哈希
        from: string; //交易发送地址
        to: string; //交易目的地址
        value: BigNumber; //交易金额, 一个BigNumber对象
        nonce: number; //交易nonce
        timestamp: number; //交易时间戳,单位:?
        gasPrice: BigNumber; //gas出价, 一个BigNumber对象
        gasLimit: BigNumber; //gas上限值, 一个BigNumber对象
    }

    // transfer NAS from contract to address
    transfer(address: string, value: BigNumber): boolean;

    // verify address
    // 返回值:
    // 87: 用户钱包地址
    // 88: 合约地址
    // 0: 地址非法
    verifyAddress(address: string): 87 | 88 | 0;

    getAccountState(address: string): {
        balance: BigNumber | number | string,
        nonce: BigNumber | number | string
    }
}
//代码提示用
export declare const Blockchain: IBlockchain;


//Event,根据官方文档yy的
interface IEvent {
    Trigger(topic: string, jsonObj: Object): void;
}
//代码提示用
export declare const Event: IEvent;

// //math库,根据官方文档yy的
// class Math {
//     //随机范围[0,1)
//     public static get random():(()=>void) & {seed:(seed:string)=>void} { 
//         return null;
//     };
// }


// Date:
// 不支持的方法：toDateString(), toTimeString(), getTimezoneOffset(), toLocaleXXX()。
// new Date()/Date.now()返回当前块的时间戳，单位为毫秒。
// getXXX返回getUTCXXX的结果。


//-----------------------------以下为需参与编译的代码----------------------------------



// //地址类型
// type Address = string;


// // //字典类型
// // interface Dic<TValue> {
// //     [fieldName: string]: TValue;
// // }

// //便于使用的map interface
// interface MyStorageMap<TValue> {
//     // delete key from Native Storage, return 0 for success, otherwise failure.
//     del(key: string): number;

//     // get value by key from Native Storage,
//     // deserialize value by calling `descriptor.parse` and return.
//     get(key: string): TValue;

//     // set key and value pair to Native Storage,
//     // the value will be serialized to string by calling `descriptor.stringify`.
//     // return 0 for success, otherwise failure.
//     set(key: string, value: TValue): number;
// }

// /**
//  * 断言
//  * @param result 比较结果
//  * @param reason 断言失败的原因
//  */
// function assert(result:boolean, reason?:string){
//     if(!reason){
//         reason = 'no reason';
//     }
//     if(!result){
//         throw new Error(reason);
//     }
// }

// /**
//  * 从arrayMap中获取分页数据
//  * @param arrMap
//  * @param startIndex 数组的起始位置,默认为0
//  * @param totalLength 数组长度
//  * @param offset 
//  * @param limit 
//  * @param desc 是否降序
//  */
// function getDatasFromArrayMap<TDataType>(arrMap:MyStorageMap<TDataType>, startIndex:number, totalLength:number, offset:number, limit: number, desc:boolean){
//     //计算出最大页数
//     assert(offset < totalLength, `offset is out of range, total:${totalLength}`);

//     const items:TDataType[] = [];

//     //按照顺序依次获取
//     if(!desc){
//         for(let i=startIndex+offset; i<=startIndex+offset+limit-1; i++){
//             if(i>startIndex+totalLength-1){break;}
//             const item = arrMap.get(i.toString());
//             items.push(item);
//         }
//     }else{
//         for(let i=startIndex+totalLength-1-offset; i>= startIndex+totalLength-1-offset-limit+1; i--){
//             if(i<1){break;}
//             const item = arrMap.get(i.toString());
//             items.push(item);
//         }
//     }

//     return items;
// }