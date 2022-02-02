/** @param {import('../.').NS} ns */
export async function main(ns) {
    // Inspect some extra player information
    ns.tail();
    while (true) {
        let player = ns.getPlayer();
        ns.print(player.hacking + " -> " + player.hacking_exp);
        await ns.sleep(10000);
    }
}