import { getServerInfo, formatMoney, formatNumberShort, formatRam } from '/lib/util.js';

let argSchema = [
    ['s',''], // server to analyze
    ['server',''],
]

/** @param {NS} ns **/
export async function main(ns) {
    let options = ns.flags(argSchema),
        server = options.s != '' ? options.s : options['server'];
    
    if (server === '') server = ns.getHostname();
    let info = getServerInfo(ns,server);
    ns.tprint(
        '\n' + server + ":\n" + 
        '   Security: ' + formatNumberShort(ns,info.security) + '/' + info.minSec + '\n' +
        '   Money: ' + formatMoney(ns,info.cash) + '/' + formatMoney(ns,info.maxCash) + '\n' +
        '   Hack Rating: ' + formatNumberShort(ns,info.quotient) + '\n' +
        '   RAM: ' + formatRam(ns,info.usedRam) + '/' + formatRam(ns,info.maxRam) + '\n' +
        '   Growth: ' + formatNumberShort(ns,info.growthRate) + '\n'
    );
}