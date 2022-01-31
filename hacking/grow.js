let argSchema = [
    ['d',0], // delay to wait before execution of grow, in milliseconds
    ['s',''], // server to target
]

/** @param {NS} ns **/
export async function main(ns) {
    let options = ns.flags(argSchema);
    if (options.d) {
        await ns.sleep(options.d);
    }
    ns.grow(options.s);
}