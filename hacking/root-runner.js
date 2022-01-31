/** @param {NS} ns **/
export async function main(ns) {
    let rootHack = '/hacking/rootHack.js';
    while(true){
        ns.run(rootHack);
        await ns.sleep(60000 * 5);
    }
}