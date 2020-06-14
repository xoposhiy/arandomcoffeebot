import { makePairs } from './helpers';
import { User , PairArray} from './types';
import { deepStrictEqual } from 'assert';


let test_users: User['nickname'][] = ['a', 'b', 'c', 'd'];
let test_pairs: PairArray[] = [];

let result: PairArray[] = makePairs(test_users, test_pairs)

deepStrictEqual(result, [['a', 'b'], ['c', 'd']]) 



let test_users2: User['nickname'][] = ['a', 'b', 'c'];
let test_pairs2: PairArray[] = [];

let result2: PairArray[] = makePairs(test_users2, test_pairs2)

deepStrictEqual(result2, [['a', 'b'], ['c', 'kataeva']]) 



let test_users3: User['nickname'][] = ['a', 'b', 'c', 'd'];
let test_pairs3: PairArray[] = [['a', 'b']];

let result3: PairArray[] = makePairs(test_users3, test_pairs3)

deepStrictEqual(result3, [['a', 'c'], ['b', 'd']]) 



let test_users4: User['nickname'][] = ['a', 'b', 'c'];
let test_pairs4: PairArray[] = [['a', 'b']];

let result4: PairArray[] = makePairs(test_users4, test_pairs4)

deepStrictEqual(result4, [['a', 'c'], ['b', 'kataeva']]) 


let test_users5: User['nickname'][] = ['a',];
let test_pairs5: PairArray[] = [];

let result5: PairArray[] = makePairs(test_users5, test_pairs5)

deepStrictEqual(result5, [['a', 'kataeva']]) 


let test_users6: User['nickname'][] = [];
let test_pairs6: PairArray[] = [];

let result6: PairArray[] = makePairs(test_users6, test_pairs6)

deepStrictEqual(result6, [])



let test_users7: User['nickname'][] = ['kataeva'];
let test_pairs7: PairArray[] = [];

let result7: PairArray[] = makePairs(test_users7, test_pairs7)

deepStrictEqual(result7, [])


let test_users8: User['nickname'][] = ['a', 'kataeva'];
let test_pairs8: PairArray[] = [['a', 'kataeva']];

let result8: PairArray[] = makePairs(test_users8, test_pairs8)

deepStrictEqual(result8, []) 




deepStrictEqual(makePairs([ 'Kris_polyakova', 'kaktus_katya' ], [ [ 'Kris_polyakova', 'kataev' ], [ 'kataeva', 'kaktus_katya' ] ]),[['Kris_polyakova', 'kaktus_katya']])