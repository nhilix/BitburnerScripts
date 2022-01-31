/** @param {NS} ns **/
export async function main(ns) {
    let leafHack = '/hacking/leafHack.js';
    while (true) {
        // Re-run leaf hack every 30min, as we gain hacking XP 
        ns.run(leafHack, 1, '-r', 24, '-N', 5);
        await ns.sleep(60 * 30 * 1000); // 30min
        if (ns.getHackingLevel() > 1300) return; // After we've basically unlocked all servers this just kills the momentum
    }
}