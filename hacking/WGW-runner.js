import { getRam, disableLogs, formatNumberShort, formatDuration } from '/lib/util.js';

let argSchema = [
    ['s',''], // target server name
    ['server-target',''],
    ['r', 0], // GB to reserve on server
    ['reserve', 0],
    ['d', 100], // millisecond delay between growThreads
    ['delay', 100]
]

let grow = '/hacking/grow.js',
    weaken = '/hacking/weaken.js',
    delayMs = 100,
    growSecurity = 0.004;

/** @param {import('..').NS} ns */
export async function main(ns) {
    disableLogs(ns, ['getServerMinSecurityLevel', 'getServerMaxMoney', 'getServer', 'getServerSecurityLevel',
                     'getServerMaxRam', 'getServerUsedRam', 'scan', 'sleep', 'run', 'getServerMoneyAvailable'])
    let options = ns.flags(argSchema),
        host = ns.getHostname(),
        growPercentTarget = 1, // double server money each iter on way to max cash
        growSize = ns.getScriptRam(grow),
        weakenSize = ns.getScriptRam(weaken),
        reserve = options.r ? options.r : options['reserve'],
        target = options.s != '' ? options.s : options['server-target'],
        prepPort = ns.getPortHandle(1),
        prepping = prepPort.peek();

    delayMs = options.d != 100 ? options.d : options['delay'];
    if (prepping === 'NULL PORT DATA') { 
        prepPort.write([target]);
    } else {
        prepping.push(target);
        prepPort.clear();
        prepPort.write(prepping);
    }

    if (target === '') { ns.print("ERROR: Target must be specified"); return; }

    while (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) + 0.004) {
        let ram = getRam(ns, host, reserve),
            player = ns.getPlayer(),
            hServer = ns.getServer(host),
            tServer = ns.getServer(target),
            weakenTime = ns.formulas.hacking.weakenTime(tServer, player),
            weakenSecurity = Math.abs(ns.weakenAnalyze(1,hServer.cpuCores)), // security decrease by 1 thread
            threads = Math.floor(ram / weakenSize);

            // How much security to we need to decrease the server by to reach minimum
            let secToDec = Math.max(weakenSecurity, tServer.hackDifficulty - tServer.minDifficulty);
            // Take the smaller of maximum threads or threads required to reach minimum
            threads = Math.min(threads, Math.ceil(secToDec / weakenSecurity));
            // Resulting security will be the maximum resulting threads or the minimum security
            let security = Math.max(tServer.hackDifficulty - (threads * weakenSecurity), tServer.minDifficulty);

            ns.print(target + ": " + threads + " threads -> " +
                     formatNumberShort(ns,security) + "/" + tServer.minDifficulty + "(security) duration:" + formatDuration(ns, weakenTime / 1000));
            ns.run(weaken, threads, '-s', target);
        await ns.sleep(weakenTime + delayMs);
    }
    
    let maxMoney = ns.getServerMaxMoney(target);
    while (ns.getServerMoneyAvailable(target) < maxMoney * 0.99) {
        // Calculate all relevant batch data each batch to ensure updated player/server/host information
        let player = ns.getPlayer(),
            tServer = ns.getServer(target),
            hServer = ns.getServer(host),
            money = ns.getServerMoneyAvailable(target),
            weakenSecurity = Math.abs(ns.weakenAnalyze(1,hServer.cpuCores)), // security decrease by 1 thread
            weakenTime = ns.formulas.hacking.weakenTime(tServer, player), // How long a weaken will take (must assume minimum security)
            growTime = ns.formulas.hacking.growTime(tServer, player); // How long a grow will take (must assume minimum security)

        let growPercent = ns.formulas.hacking.growPercent(tServer, 1, player, hServer.cpuCores) - 1, // % grown by 1 thread
            growThreads = Math.ceil(growPercentTarget / growPercent), // number of threads to reach grow percent target (default=100%)
            growSecurityIncrease = growSecurity * growThreads, // calculate grow security increase
            growWeakenThreads = Math.ceil(growSecurityIncrease / weakenSecurity); // number of weaken threads to correct security increase
        
        let batchesToMax = 0;
        while (money < maxMoney) {
            money *= (1+growPercentTarget);
            batchesToMax++;
        }
        
        let ram = getRam(ns, host, reserve), // how much ram the host server has available
            batchSize = growSize * growThreads + weakenSize * growWeakenThreads,
            batchCount = Math.min(Math.floor( ram / batchSize ),batchesToMax); // how many batches can we support with this ram
        
        batchesToMax -= batchCount;
        
        for (let i = 0; i < batchCount; i++) {
            executeBatch(ns, i*2, target,weakenTime,growTime,growThreads,growWeakenThreads);
            // Wait 4x delayMs so that the first exec of the 2nd batch will start after the last exec of first batch, etc.
            await ns.sleep(delayMs * 2);
        }
        // Wait until the first batch is finished then start up a whole new set of batches
        await ns.sleep(weakenTime+delayMs);
        // If we maxed with the last batch we can break out now
        if (batchesToMax === 0) break;
    }

    prepPort = ns.getPortHandle(1);
    prepping = prepPort.peek();
    if (!(prepping === 'NULL PORT DATA')) { 
        let id = prepping.indexOf(target);
        if (id != -1) {
            prepping.splice(id,1);
            prepPort.clear();
            if (prepping.length > 0) prepPort.write(prepping);
        }
    }
}

function executeBatch(ns, i, target,weakenTime,growTime,growThreads,growWeakenThreads) {
    // grow finishes delayMs before weaken
    ns.run(grow, growThreads, '-s', target, '-d', (weakenTime - growTime) - delayMs, i+1);
    // finally growWeaken finishes after grow
    ns.run(weaken, growWeakenThreads, '-s', target, i+2);
}