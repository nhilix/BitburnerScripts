import { getServers, getServerInfo, tryRootAccess, disableLogs, formatDuration, formatNumberShort } from '/lib/util.js';

let argSchema = [
    ['a', false], // use all player owned servers as the RAM pool
    ['all-servers', false],
    ['r', 0], // RAM to reserve on any server being utilized
    ['reserve-ram', 0],
    ['s', ''], // target server to be prepped
    ['target-server', ''],
    ['n', 0], // if non-zero, target only up to this many servers
    ['number-of-servers', 0],
    ['R', false], // reverse target order, i.e. prioritize worst servers first (useful to build hacking lvl early)
    ['reverse', false], 
    ['T', false], // Open tail logs on execution
    ['tail', false],
];

let delayMs = 30, // delay between execution finishes of Weaken/Grow
    growScript = '/hacking/grow.js', // base delay/grow script
    weakenScript = '/hacking/weaken.js', // base delay/weaken script
    useAll = false,
    reserveRam = 0,
    weakenTarget = '',
    numTargets = 0,
    reverse = false;

/** @param {NS} ns **/
export async function main(ns) {
    let options = ns.flags(argSchema),
        growSecInc = ns.growthAnalyzeSecurity(1),
        growSize = ns.getScriptRam(growScript),
        weakenSize = ns.getScriptRam(weakenScript),
        player = ns.getPlayer(),
        home = ns.getServer('home'),
        targets = [],
        targetInfo = {};
    useAll = options.a ? options.a : options['all-servers'];
    reserveRam = options.r ? options.r : options['reserve-ram'];
    weakenTarget = options.s != '' ? options.s : options['target-server'];
    numTargets = options.n != 0 ? options.n : options['number-of-servers'];
    reverse = options.R ? options.R : options['reverse'];
    if(options.T ? options.T : options['tail']) ns.tail();
    disableLogs(ns, ['getServerMinSecurityLevel', 'getServerMaxMoney', 'getServer', 'getServerSecurityLevel', 'getServerMaxRam', 'getServerUsedRam', 'scan', 'sleep', 'exec'])
    if (weakenTarget === '') {
        let juicyOrNot = reverse ? 'lamest' : 'juiciest';
        ns.tprint("No target (-s,--target-server) provided. Prepping "+juicyOrNot+" targets I can find.");
        targets = getServers(ns); // All non-player servers
        targets = targets.filter(t => tryRootAccess(ns, t)); // Only select ones we have root access
        targets = targets.filter(t => !['home', 'darkweb'].includes(t)); // filter out some servers we will never need to weaken
        targets = targets.filter(t => ns.getServerMaxMoney(t) > 0); // filter out servers that can't have money on them
    } else {
        targets = [weakenTarget];
    }
    for (let t of targets) {
        targetInfo[t] = getServerInfo(ns,t); // contains a ton of relevant information packing into a nice dict format
    }
    // Sort targets by cash to security quotient
    targets.sort((t1, t2) => {
        return (targetInfo[t1].quotient - targetInfo[t2].quotient) * (reverse ? -1 : 1); // reverse option will revert sort order
    });
    // If we have a desired number of targets
    if (numTargets != 0) {
        // Until we have the right number of targets
        while(targets.length > numTargets) {
            targets.shift(); // remove left most index 
        }
    }
    ns.tprint("Going to prep: " + targets)

    // List of servers to use for prepping
    let servers = ['home'];
    if (useAll) { // If useAll, then add all player owned servers to the list
        let pServers = ns.getPurchasedServers();
        if (pServers.length > 0) {
            for (let s of pServers) {
                servers.push(s);
                await ns.scp([growScript, weakenScript], s);
            }
        }
    }

    /*  Our Goal: Prepare a server for batch hacking by grow/weakening until maximum money and minimum security. This in itself is a small batch process.

        Process:
        While the target is not at minimum security:
            Execute weaken scripts with a delay of delayMs
        While the target is not at maximum money and minimum security:
            Execute grow and weaken scripts with a target execution completion delay of delayMs
            wait twice delayMs
    */

    // First, blast server securities to minimum so our G/W batching is as efficient as possible
    let targetsCopy = targets,
        weakenFinishTimes = [],
        target = targetsCopy.pop(),
        info = targetInfo[target],
        security = info.security,
        minSec = info.minSec,
        tServer = ns.getServer(target),
        weakenTime = ns.formulas.hacking.weakenTime(tServer, player),
        ram = 0,
        sId = 0,
        s = servers[0],
        hServer = ns.getServer(s),
        weakenSecDec = ns.weakenAnalyze(1, hServer.cpuCores);
    // While we have targets to prep
    while (targetsCopy.length > 0) {

        // Determine if our target is still valid.  If security is within a single weaken thread decrease, we can skip to next target
        if (security <= (minSec + weakenSecDec)) {
            target = targetsCopy.pop();
            if (target == null) { break; } // Finished processing targets
            info = targetInfo[target];
            security = info.security;
            minSec = info.minSec;
            tServer = ns.getServer(target);
            weakenTime = ns.formulas.hacking.weakenTime(tServer, player);
        }

        ram = getRam(ns, s);
        // Find the first server with space for weaken threads
        while (ram < weakenSize) {
            sId++;
            if (sId >= servers.length) break;
            // Try using the next server as our host (hServer), update the weaken affect
            s = servers[sId];
            ram = getRam(ns, s);
            hServer = ns.getServer(s);
            weakenSecDec = ns.weakenAnalyze(1, hServer.cpuCores);
        }

        // If we have enough ram for atleast one thread
        if (ram >= weakenSize) {
            // Maximum threads we can run on this server
            let threads = Math.floor(ram / weakenSize);
            // How much security to we need to decrease the server by to reach minimum
            let secToDec = Math.max(weakenSecDec, security - minSec);
            // Take the smaller of maximum threads or threads required to reach minimum
            threads = Math.min(threads, Math.floor(secToDec / weakenSecDec));
            // Resulting security will be the maximum resulting threads or the minimum security
            security = Math.max(security - (threads * weakenSecDec), minSec);
            // Push the expected finish time with relevant data to our weakenFinishTimes dictionary
            weakenFinishTimes.push({
                target: target,
                host: s,
                finish: Date.now() + weakenTime,
                isMinSec: security <= (minSec + weakenSecDec),
            });
            ns.print(target + ": " + threads + " threads -> " +
                     formatNumberShort(ns,security) + "/" + minSec + "(security) duration:" + formatDuration(ns, weakenTime / 1000));
            // Add the Date.now() argument just to make the script call unique.  This lets us run weaken on our target with
            // more threads as ram frees up from previous jobs
            ns.exec(weakenScript, s, threads, '-s', target, Date.now());
            await ns.sleep(delayMs);
        }

        // We filled up all available servers, lets wait until one frees up
        if (targetsCopy.length > 0 && ram < weakenSize) {
            // Find the time of the next finishing weaken
            let finish = weakenFinishTimes.sort((t1, t2) => { return t1.finish - t2.finish }).shift();
            if (finish != null) {
                let tFin = Math.max(finish.finish - Date.now(), 0); // Don't allow negative times, incase two threads finished too close together
                ns.print(target+': ' + formatDuration(ns, tFin / 1000) + ' until free space');
                await ns.sleep(tFin);
                // Set our host server to the newly freed up server
                sId = servers.indexOf(finish.host);
                s = servers[sId];
                hServer = ns.getServer(s);
                weakenSecDec = ns.weakenAnalyze(1, hServer.cpuCores);
            } else {
                // Catch-all sleep to keep from freezing in infinite loop
                await ns.sleep(300);
            }
        }
    }

    weakenFinishTimes = weakenFinishTimes.sort((t1, t2) => { return t1.finish - t2.finish });
    while (weakenFinishTimes.length > 0) {
        if (Date.now() > weakenFinishTimes[0].finish) {
            let done = weakenFinishTimes.shift();
            ns.toast(done.target + ": weakening complete!", 'success', 5000);
        }
        await ns.sleep(1000);
    }
}

function getRam(ns, name) {
    return ns.getServerMaxRam(name) - ns.getServerUsedRam(name) - reserveRam;
}