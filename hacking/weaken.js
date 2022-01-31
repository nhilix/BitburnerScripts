let argSchema = [
    ['d',0], // delay to wait before execution of grow, in milliseconds
    ['s',''], // server to target
]

/** @param {NS} ns **/
export async function main(ns) {
    let options = ns.flags(argSchema);
    if (options.d != 0) {
        await ns.sleep(options.d);
    }
    await ns.weaken(options.s);
}