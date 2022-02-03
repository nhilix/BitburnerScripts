/** @param {NS} ns **/
export async function main(ns) {
    let root = '/hacking/root.js';
    while(true){
        ns.run(root, 1, '--backdoor-only');
        await ns.sleep(60000 * 5);
    }
}