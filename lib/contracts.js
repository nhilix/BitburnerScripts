import { getServers } from "/lib/util.js";

let types = [
    { func: ipAddress, type: "Generate IP Addresses" },
    { func: totalSum, type: "Total Ways to Sum" },
    { func: subArraySum, type: "Subarray with Maximum Sum" },
    { func: overlappingIntv, type: "Merge Overlapping Intervals" },
    { func: arrayJump, type: "Array Jumping Game" },
    { func: sanitizeParens, type: "Sanitize Parentheses in Expression" },
    { func: algoStockI, type: "Algorithmic Stock Trader I" },
    { func: algoStockII, type: "Algorithmic Stock Trader II" },
    { func: algoStockIII, type: "Algorithmic Stock Trader III" },
    { func: algoStockIV, type: "Algorithmic Stock Trader IV" },
    { func: minTriPath, type: "Minimum Path Sum in a Triangle" },
    { func: uniquePathI, type: "Unique Paths in a Grid I" },
    { func: uniquePathII, type: "Unique Paths in a Grid II" },
    { func: findMathExp, type: "Find All Valid Math Expressions" },
    { func: largestPrime, type: "Find Largest Prime Factor" },
    { func: spiralizeMat, type: "Spiralize Matrix" },
];
const argSchema = [
    ['s', false], // actually solve found contracts
    ['solve', false],
    ['f', false], // force solve even if only one attempt left
    ['force', false],
]
/** @param {NS} ns **/
export async function main(ns) {
    var ccts = [];
    var options = ns.flags(argSchema);
    var solve = options.s || options['solve'];
    var force = options.f || options['force'];
    // Find and collect all *.cct contracts across all servers
    for (var server of getServers(ns)) {
        var contracts = ns.ls(server, '.cct');
        if (contracts.length > 0) {
            for (var cct of contracts) {
                ns.tprint("Found contract: " + cct + " on " + server);
                ccts.push({ sName: server, fName: cct });
            }
        }
    }
    // If we set the solve flag then we want to attempt to solve each contract
    if (solve) {
        for (var cct of ccts) {
            trySolve(ns, cct, force);
        }
    }
}

/** @param {NS} ns **/
function trySolve(ns, cct, force) {
    let data = ns.codingcontract.getData(cct.fName, cct.sName),
        type = ns.codingcontract.getContractType(cct.fName, cct.sName),
        attempts = ns.codingcontract.getNumTriesRemaining(cct.fName, cct.sName);

    ns.tprint("Attempting to solve: "+type+" on "+cct.sName);

    var func = types.find(t => t.type === type);
    if (func) {
        var ans = func.func(data);
        if (ans != 'Could Not Solve') {
            if (attempts > 1 || (attempts === 1 && force)) {
                ns.tprint(ns.codingcontract.attempt(ans, cct.fName, cct.sName, { returnReward: true }));
            } else if (attempts === 1) {
                ns.tprint("ONLY ONE ATTEMPT REMAINING: use -f/--force to still attempt to solve");
            } else {
                ns.tprint("NO ATTEMPTS REMAINING, CANNOT SOLVE");
            }
        } else {
            ns.tprint("ANSWER: COULD NOT SOLVE, SKIPPING");
        }
    } else {
        ns.tprint("COULD NOT FIND SOLVER, SKIPPING");
    }
}

function validIP(str) {
    let parts = str.split('.');
    if (parts.length != 4) { return false; }
    for (let p of parts) {
        if (p[0] === '0' && parseInt(p) != 0) return false;
        if (parseInt(p) > 255 || parseInt(p) < 0) return false;
    }
    return true;
}
function ipAddress(data) {
    /*  Given a string containing only digits, return an array with all possible valid IP address combinations that can be created from the string:

        Note that an octet cannot begin with a '0' unless the number itself is actually 0. For example, '192.168.010.1' is not a valid IP.
        
        Examples:
        25525511135 -> [255.255.11.135, 255.255.111.35]
        1938718066 -> [193.87.180.66]
    */
    let ans = [];
    // Find all combinations of inserting 3 dots into the string, then determine for each combination if it is a validIP
    for (let p1 = 1; p1 <= 3; p1++) {
        for (let p2 = 1; p2 <= 3; p2++) {
            for (let p3 = 1; p3 <= 3; p3++) {
                for (let p4 = 1; p4 <= 3; p4++) {
                    if (p1 + p2 + p3 + p4 === data.length) {
                        let ip = data.substr(0, p1);
                        ip += '.' + data.substr(p1, p2);
                        ip += '.' + data.substr(p1 + p2, p3);
                        ip += '.' + data.substr(p1 + p2 + p3, p4);
                        if (validIP(ip)) ans.push(ip);
                    }
                }
            }
        }
    }
    return ans;
}

function totalSum(data) {
    /*  It is possible write four as a sum in exactly four different ways:
        
        4:
        3 + 1
        2 + 2
        2 + 1 + 1
        1 + 1 + 1 + 1
        
        Given any interger, how many different ways can that integer be written as a sum of at least two positive integers?
    */
    var ways = [1];
    ways.length = data + 1;
    ways.fill(0, 1);
    for (var i = 1; i < data; ++i) {
        for (var j = i; j <= data; ++j) {
            ways[j] += ways[j - i];
        }
    }
    return ways[data];
}

function subArraySum(data) {
    /*  Given an integer array, (input as a comma separated string of numbers)
        find the contiguous subarray (containing at least one number) which has the largest sum and return that sum. 
        'Sum' refers to the sum of all the numbers in the subarray.
    */
    var nums = data.slice();
    for (var i = 1; i < nums.length; i++) {
        nums[i] = Math.max(nums[i], nums[i] + nums[i - 1]);
    }
    return Math.max.apply(Math, nums);
}

function convert2DArrayToString(arr) {
    var components = [];
    arr.forEach(function (e) {
        var s = e.toString();
        s = ['[', s, ']'].join('');
        components.push(s);
    })
    return components.join(',').replace(/\s/g, '');
}
function overlappingIntv(data) {
    /*  Given an array of array of numbers representing a list of intervals, merge all overlapping intervals.
    
        Example:
        [[1, 3], [8, 10], [2, 6], [10, 16]]
        
        would merge into [[1, 6], [8, 16]].
        
        The intervals must be returned in ASCENDING order. You can assume that in an interval, the first number will always be smaller than the second.
    */
    var intervals = data.slice();
    intervals.sort(function (a, b) {
        return a[0] - b[0];
    })
    var result = [];
    var start = intervals[0][0];
    var end = intervals[0][1];
    for (var _i = 0, intervals_1 = intervals; _i < intervals_1.length; _i++) {
        var interval = intervals_1[_i];
        if (interval[0] <= end) {
            end = Math.max(end, interval[1]);
        } else {
            result.push([start, end]);
            start = interval[0];
            end = interval[1];
        }
    }
    result.push([start, end]);
    var sanitizedResult = convert2DArrayToString(result);
    return sanitizedResult;
}
function arrayJump(data) {
    /*  You are given the an array of integers,
    
        Example:
        5,1,9,0,9,8,0,2,7
        
        Each element in the array represents your MAXIMUM jump length at that position. This means that if you are at position i and 
        your maximum jump length is n, you can jump to any position from i to i+n. 
        
        Assuming you are initially positioned at the start of the array, determine whether you are able to reach the last index.
        
        Your answer should be submitted as 1 or 0, representing true and false respectively
    */
    var n = data.length;
    var i = 0;
    for (var reach = 0; i < n && i <= reach; ++i) {
        reach = Math.max(i + data[i], reach);
    }
    var solution = i === n;
    return solution ? 1 : 0;
}
function sanitizeParens(data) {
    /*  Given a string:

        Example:
        (a(aa(aa(a)))
        
        remove the minimum number of invalid parentheses in order to validate the string. If there are multiple minimal ways to validate the string,
        provide all of the possible results. The answer should be provided as an array of strings. 
        If it is impossible to validate the string the result should be an array with only an empty string.
        
        IMPORTANT: The string may contain letters, not just parentheses. Examples:
        "()())()" -> [()()(), (())()]
        "(a)())()" -> [(a)()(), (a())()]
        ")( -> [""]
    */
    var left = 0;
    var right = 0;
    var res = [];
    for (var i = 0; i < data.length; ++i) {
        if (data[i] === '(') {
            ++left;
        } else if (data[i] === ')') {
            left > 0 ? --left : ++right;
        }
    }

    function dfs(pair, index, left, right, s, solution, res) {
        if (s.length === index) {
            if (left === 0 && right === 0 && pair === 0) {
                for (var i = 0; i < res.length; i++) {
                    if (res[i] === solution) {
                        return;
                    }
                }
                res.push(solution);
            }
            return;
        }
        if (s[index] === '(') {
            if (left > 0) {
                dfs(pair, index + 1, left - 1, right, s, solution, res);
            }
            dfs(pair + 1, index + 1, left, right, s, solution + s[index], res);
        } else if (s[index] === ')') {
            if (right > 0) dfs(pair, index + 1, left, right - 1, s, solution, res);
            if (pair > 0) dfs(pair - 1, index + 1, left, right, s, solution + s[index], res);
        } else {
            dfs(pair, index + 1, left, right, s, solution + s[index], res);
        }
    }
    dfs(0, 0, left, right, data, '', res);

    return res;
}

function algoStockI(data) {
    /*  You are given an array of stock prices (which are numbers) where the i-th element represents the stock price on day i:

        Example:
        92,105,18,49,98,127,68,113

        Determine the maximum possible profit you can earn using at most one transaction (i.e. you can only buy and sell the stock once).
        If no profit can be made then the answer should be 0. Note that you have to buy the stock before you can sell it.
    */
    var maxCur = 0;
    var maxSoFar = 0;
    for (var i = 1; i < data.length; ++i) {
        maxCur = Math.max(0, (maxCur += data[i] - data[i - 1]));
        maxSoFar = Math.max(maxCur, maxSoFar);
    }
    return maxSoFar.toString();
}

function algoStockII(data) {
    /*  You are given an array of numbers representing stock prices, where the
        i-th element represents the stock price on day i.
        
        Example:
        92,105,18,49,98,127,68,113

        Determine the maximum possible profit you can earn using as many transactions
        as you’d like. A transaction is defined as buying and then selling one
        share of the stock. Note that you cannot engage in multiple transactions at
        once. In other words, you must sell the stock before you buy it again. If no
        profit can be made, then the answer should be 0.
    */
    var profit = 0;
    for (var p = 1; p < data.length; ++p) {
        profit += Math.max(data[p] - data[p - 1], 0);
    }
    return profit.toString();
}

function algoStockIII(data) {
    /*  You are given an array of numbers representing stock prices, where the
        i-th element represents the stock price on day i.
        
        Example:
        92,105,18,49,98,127,68,113

        Determine the maximum possible profit you can earn using at most two
        transactions. A transaction is defined as buying and then selling one share
        of the stock. Note that you cannot engage in multiple transactions at once.
        In other words, you must sell the stock before you buy it again. If no profit
        can be made, then the answer should be 0.
    */
    var hold1 = Number.MIN_SAFE_INTEGER;
    var hold2 = Number.MIN_SAFE_INTEGER;
    var release1 = 0;
    var release2 = 0;
    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
        var price = data_1[_i];
        release2 = Math.max(release2, hold2 + price);
        hold2 = Math.max(hold2, release1 - price);
        release1 = Math.max(release1, hold1 + price);
        hold1 = Math.max(hold1, price * -1);
    }
    return release2.toString();
}

function algoStockIV(data) {
    /*  You are given an array with two elements. The first element is an integer k.
        The second element is an array of numbers representing stock prices, where the
        i-th element represents the stock price on day i.
        
        Example:
        [ 3, [92,105,18,49,98,127,68,113] ]

        Determine the maximum possible profit you can earn using at most k transactions.
        A transaction is defined as buying and then selling one share of the stock.
        Note that you cannot engage in multiple transactions at once. In other words,
        you must sell the stock before you can buy it. If no profit can be made, then
        the answer should be 0.
    */
    var k = data[0];
    var prices = data[1];
    var len = prices.length;
    if (len < 2) {
        return 0;
    }
    if (k > len / 2) {
        var res = 0;
        for (var i = 1; i < len; ++i) {
            res += Math.max(prices[i] - prices[i - 1], 0);
        }
        return res;
    }
    var hold = [];
    var rele = [];
    hold.length = k + 1;
    rele.length = k + 1;
    for (var i = 0; i <= k; ++i) {
        hold[i] = Number.MIN_SAFE_INTEGER;
        rele[i] = 0;
    }
    var cur;
    for (var i = 0; i < len; ++i) {
        cur = prices[i];
        for (var j = k; j > 0; --j) {
            rele[j] = Math.max(rele[j], hold[j] + cur);
            hold[j] = Math.max(hold[j], rele[j - 1] - cur);
        }
    }
    return rele[k];
}

function minTriPath(data) {
    /*  You are given a 2D array of numbers (array of array of numbers) that represents a
        triangle (the first array has one element, and each array has one more element than
        the one before it, forming a triangle). Find the minimum path sum from the top to the
        bottom of the triangle. In each step of the path, you may only move to adjacent
        numbers in the row below.

        Example:
        [
            [1],
           [3,4],
          [2,5,3],
        ]
        Min Path: 1+3+2 = 6
    */
    var n = data.length;
    var dp = data[n - 1].slice();
    for (var i = n - 2; i > -1; --i) {
        for (var j = 0; j < data[i].length; ++j) {
            dp[j] = Math.min(dp[j], dp[j + 1]) + data[i][j];
        }
    }
    return dp[0];
}

function uniquePathI(data) {
    /*  You are given an array with two numbers: [m, n]. These numbers represent a
        m x n grid. Assume you are initially positioned in the top-left corner of that
        grid and that you are trying to reach the bottom-right corner. On each step,
        you may only move down or to the right.
        
        Determine how many unique paths there are from start to finish.
    */
    var n = data[0]; // Number of rows
    var m = data[1]; // Number of columns
    var currentRow = [];
    currentRow.length = n;
    for (var i = 0; i < n; i++) {
        currentRow[i] = 1;
    }
    for (var row = 1; row < m; row++) {
        for (var i = 1; i < n; i++) {
            currentRow[i] += currentRow[i - 1];
        }
    }
    return currentRow[n - 1];
}

function uniquePathII(data) {
    /*  You are given a 2D array of numbers (array of array of numbers) representing
        a grid. The 2D array contains 1’s and 0’s, where 1 represents an obstacle and
        0 represents a free space.

        Example:
        [
            [ 0,0,1,1,1 ],
            [ 1,0,0,1,1 ],
            [ 0,0,0,0,1 ],
            [ 1,1,1,0,0 ],
        ]
        
        Assume you are initially positioned in top-left corner of that grid and that you
        are trying to reach the bottom-right corner. In each step, you may only move down
        or to the right. Furthermore, you cannot move onto spaces which have obstacles.
        
        Determine how many unique paths there are from start to finish.
    */
    var obstacleGrid = [];
    obstacleGrid.length = data.length;
    for (var i = 0; i < obstacleGrid.length; ++i) {
        obstacleGrid[i] = data[i].slice();
    }
    for (var i = 0; i < obstacleGrid.length; i++) {
        for (var j = 0; j < obstacleGrid[0].length; j++) {
            if (obstacleGrid[i][j] == 1) {
                obstacleGrid[i][j] = 0;
            } else if (i == 0 && j == 0) {
                obstacleGrid[0][0] = 1;
            } else {
                obstacleGrid[i][j] = (i > 0 ? obstacleGrid[i - 1][j] : 0) + (j > 0 ? obstacleGrid[i][j - 1] : 0);
            }
        }
    }
    return obstacleGrid[obstacleGrid.length - 1][obstacleGrid[0].length - 1];
}

function findMathExp(data) {
    /*  You are given a string which contains only digits between 0 and 9 as well as a target
        number. Return all possible ways you can add the +, -, and * operators to the string
        of digits such that it evaluates to the target number.
        
        The answer should be provided as an array of strings containing the valid expressions.
        
        NOTE: Numbers in an expression cannot have leading 0’s
        
        Examples:
        Input: digits = “123”, target = 6
        Output: [1+2+3, 1*2*3]
        
        Input: digits = “105”, target = 5
        Output: [1*0+5, 10-5]
    */
    var num = data[0];
    var target = data[1];

    function helper(res, path, num, target, pos, evaluated, multed) {
        if (pos === num.length) {
            if (target === evaluated) {
                res.push(path);
            }
            return;
        }
        for (var i = pos; i < num.length; ++i) {
            if (i != pos && num[pos] == '0') {
                break;
            }
            var cur = parseInt(num.substring(pos, i + 1));
            if (pos === 0) {
                helper(res, path + cur, num, target, i + 1, cur, cur);
            } else {
                helper(res, path + '+' + cur, num, target, i + 1, evaluated + cur, cur);
                helper(res, path + '-' + cur, num, target, i + 1, evaluated - cur, -cur);
                helper(res, path + '*' + cur, num, target, i + 1, evaluated - multed + multed * cur, multed * cur);
            }
        }
    }

    if (num == null || num.length === 0) {
        return [];
    }
    var result = [];
    helper(result, '', num, target, 0, 0, 0);
    return result;
}

function largestPrime(data) {
    /*  Given a number, find its largest prime factor. A prime factor
        is a factor that is a prime number.

        Example: 15
        1, 3, 5 -> 5 largest
    */
    var fac = 2;
    var n = data;
    while (n > (fac - 1) * (fac - 1)) {
        while (n % fac === 0) {
            n = Math.round(n / fac);
        }
        ++fac;
    }
    return n === 1 ? fac - 1 : n;
}

function spiralizeMat(data) {
    /*  Given an array of arrays of numbers representing a 2D matrix, return the
        elements of that matrix in clockwise spiral order.
        
        Example: The spiral order of
        
        [1, 2, 3, 4]
        [5, 6, 7, 8]
        [9, 10, 11, 12]
        
        is [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
    */
    var spiral = [];
    var m = data.length;
    var n = data[0].length;
    var u = 0;
    var d = m - 1;
    var l = 0;
    var r = n - 1;
    var k = 0;
    while (true) {
        // Up
        for (var col = l; col <= r; col++) {
            spiral[k] = data[u][col];
            ++k;
        }
        if (++u > d) {
            break;
        }
        // Right
        for (var row = u; row <= d; row++) {
            spiral[k] = data[row][r];
            ++k;
        }
        if (--r < l) {
            break;
        }
        // Down
        for (var col = r; col >= l; col--) {
            spiral[k] = data[d][col];
            ++k;
        }
        if (--d < u) {
            break;
        }
        // Left
        for (var row = d; row >= u; row--) {
            spiral[k] = data[row][l];
            ++k;
        }
        if (++l > r) {
            break;
        }
    }

    return spiral;
}