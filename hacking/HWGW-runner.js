import { getRam, disableLogs } from '/lib/util.js';

let argSchema = [
    ['s',''], // target server name
    ['server-target',''],
    ['h', 20], // percent of max cash to hack each ratio
    ['hack-percent',20],
    ['r', 0], // GB to reserve on server
    ['reserve', 0],
    ['d', 100], // millisecond delay between growThreads
    ['delay', 100]
]

let hack = '/hacking/hack.js',
    grow = '/hacking/grow.js',
    weaken = '/hacking/weaken.js',
    delayMs = 100,
    hackSecurity = 0.002,
    growSecurity = 0.004;

/** @param {import('../.').NS} ns */
export async function main(ns) {
    disableLogs(ns, ['getServerMinSecurityLevel', 'getServerMaxMoney', 'getServer', 'getServerSecurityLevel', 'getServerMaxRam', 'getServerUsedRam', 'scan', 'sleep', 'run'])
    let options = ns.flags(argSchema),
        host = ns.getHostname(),
        hackPercentTarget = (options.h != 20 ? options.h : options['hack-percent'])/100,
        growPercentTarget = (1 / (1 - hackPercentTarget)) - 1,
        hackSize = ns.getScriptRam(hack),
        growSize = ns.getScriptRam(grow),
        weakenSize = ns.getScriptRam(weaken),
        reserve = options.r ? options.r : options['reserve'],
        target = options.s != '' ? options.s : options['server-target'],
        hwgwPort = ns.getPortHandle(2),
        hwgwTarget = hwgwPort.peek();

    if (hwgwTarget === 'NULL PORT DATA') { 
        hwgwPort.write([{host:host,target:target}]);
    } else {
        hwgwTarget.push({host:host,target:target});
        hwgwPort.clear();
        hwgwPort.write(hwgwTarget);
    }
    
    delayMs = options.d != 100 ? options.d : options['delay'];
    if (target === '') { ns.print("ERROR: Target must be specified"); return; }
    
    while (true) {
        // Calculate all relevant batch data each batch to ensure updated player/server/host information
        let player = ns.getPlayer(),
            tServer = ns.getServer(target),
            hServer = ns.getServer(host),
            weakenSecurity = Math.abs(ns.weakenAnalyze(1,hServer.cpuCores)), // security decrease by 1 thread
            weakenTime = ns.formulas.hacking.weakenTime(tServer, player), // How long a weaken will take (must assume minimum security)
            hackTime = ns.formulas.hacking.hackTime(tServer, player), // How long a hack will take (must assume minimum security)
            growTime = ns.formulas.hacking.growTime(tServer, player); // How long a grow will take (must assume minimum security)

        let hackPercent = ns.formulas.hacking.hackPercent(tServer, player), // % hacked by 1 thread
            hackThreads = Math.ceil(hackPercentTarget / hackPercent), // number of threads to reach hack percent target (default=20%)
            hackSecurityIncrease = hackSecurity * hackThreads, // calculate hack security increase
            hackWeakenThreads = Math.ceil(hackSecurityIncrease / weakenSecurity); // number of weaken threads to correct security increase

        let growPercent = ns.formulas.hacking.growPercent(tServer, 1, player, hServer.cpuCores) - 1, // % grown by 1 thread
            growThreads = Math.ceil(growPercentTarget / growPercent), // number of threads to reach grow percent target (default=25%)
            growSecurityIncrease = growSecurity * growThreads, // calculate grow security increase
            growWeakenThreads = Math.ceil(growSecurityIncrease / weakenSecurity); // number of weaken threads to correct security increase
        
        let ram = getRam(ns, host, reserve), // how much ram the host server has available
            batchSize = hackSize * hackThreads + growSize * growThreads + weakenSize * (hackWeakenThreads+growWeakenThreads),
            batchCount = Math.floor( ram / batchSize ); // how many batches can we support with this ram
        
        for (let i = 0; i < batchCount; i++) {
            executeBatch(ns, i*4, target,weakenTime,hackTime,hackThreads,hackWeakenThreads,growTime,growThreads,growWeakenThreads);
            // Wait 4x delayMs so that the first exec of the 2nd batch will start after the last exec of first batch, etc.
            await ns.sleep(delayMs * 4);
        }
        // Wait until the first batch is finished then start up a whole new set of batches
        await ns.sleep(weakenTime+delayMs*2);
    }
}

function executeBatch(ns, i, target,weakenTime,hackTime,hackThreads,hackWeakenThreads,growTime,growThreads,growWeakenThreads) {
    // hack should finish first, delayMs ahead of weaken
    ns.run(hack, hackThreads, '-s', target, '-d', (weakenTime - hackTime) - delayMs, i+1);
    // hackWeaken finishes second, taking exactly as long as weakenTime (in theory)
    ns.run(weaken, hackWeakenThreads, '-s', target, i+2);
    // grow finishes third, delayMs after weaken
    ns.run(grow, growThreads, '-s', target, '-d', (weakenTime - growTime) + delayMs, i+3);
    // finally growWeaken finishes last, delayMs after grow
    ns.run(weaken, growWeakenThreads, '-s', target, '-d', delayMs*2, i+4);
}