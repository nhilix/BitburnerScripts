import { getServerInfo, formatMoney, formatNumberShort, formatRam } from '/lib/util.js';

let argSchema = [
    ['s',''], // server to analyze
    ['server',''],
]

/** @param {import("../.").NS} ns **/
export async function main(ns) {
    let options = ns.flags(argSchema),
        server = options.s != '' ? options.s : options['server'];
    
    if (server === '') server = ns.getHostname();
    let info = getServerInfo(ns,server);
    let hackP = ns.formulas.hacking.hackPercent(ns.getServer(server), ns.getPlayer()),
        growP = ns.formulas.hacking.growPercent(ns.getServer(server), 1, ns.getPlayer()) - 1,
        weakenP = ns.weakenAnalyze(1);


    ns.tprint(
        '\n' + server + ":\n" + 
        '   Security: ' + formatNumberShort(ns,info.security) + '/' + info.minSec + '\n' +
        '   Money: ' + formatMoney(ns,info.cash) + '/' + formatMoney(ns,info.maxCash) + '\n' +
        '   Hack Rating: ' + formatNumberShort(ns,info.quotient) + '\n' +
        '   RAM: ' + formatRam(ns,info.usedRam) + '/' + formatRam(ns,info.maxRam) + '\n' +
        '   Growth: ' + formatNumberShort(ns,info.growthRate) + '\n' +
        '   Hack%/Thread: ' + hackP + '\n' + 
        '   HackSec20%: ' + Math.ceil(0.2/hackP) * 0.002 + '\n' +
        '   HackThreads: ' + Math.ceil(0.2/hackP) + '\n' + 
        '   HackWeakenThreads: ' + Math.ceil((Math.ceil(0.2/hackP) * 0.002) / Math.abs(weakenP)) + '\n' + 
        '   Grow%/Thread: ' + growP + '\n' + 
        '   GrowSec25%: ' + Math.ceil(0.25/growP) * 0.004 + '\n' +
        '   GrowThreads: ' + Math.ceil(0.2/growP) + '\n' + 
        '   GrowWeakenThreads: ' + Math.ceil((Math.ceil(0.25/growP) * 0.004) / Math.abs(weakenP)) + '\n'
    );
}