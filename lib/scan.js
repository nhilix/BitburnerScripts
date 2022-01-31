import { canHack, tryRootAccess } from "/lib/util.js";

let doc = eval("document"),
    f = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "w0r1d_d43m0n"],
    css = `<style id="scanCSS">
        .sc {white-space:pre; color:#ccc; font:14px monospace; line-height: 16px; }
        .sc .s {color:#080;cursor:pointer;text-decoration:underline}
        .sc .f {color:#088}
        .sc .r {color:#6f3}
        .sc .r.f {color:#0ff}
        .sc .r::before {color:#6f3}
        .sc .hack {display:inline-block; font:12px monospace}
        .sc .red {color:red;}
        .sc .green {color:green;}
    </style>`,
    tprint = html => doc.getElementById("terminal").insertAdjacentHTML('beforeend', `<li>${html}</li>`);

/** @param {NS} ns **/
export let main = ns => {
    let tIn = doc.getElementById("terminal-input"),
        tEv = tIn[Object.keys(tIn)[1]];
    doc.head.insertAdjacentHTML('beforeend', doc.getElementById("scanCSS") ? "" : css);
    var verbose = ns.args[0];
    if (verbose != null) verbose = verbose === '-v' || verbose === '--verbose';
    let s = ["home"],
        p = [""],
        r = { home: "home" },
        fName = x => {
            let hackable = canHack(ns, x);
            let reqHack = ns.getServerRequiredHackingLevel(x);
            let hoverText = ["Req Level: ", ns.getServerRequiredHackingLevel(x),
                "&#10;Req Ports: ", ns.getServerNumPortsRequired(x),
                "&#10;Memory: ", ns.nFormat(ns.getServerMaxRam(x) * 1e9, '0.00b'),
                "&#10;Security: ", Math.round(ns.getServerSecurityLevel(x)),
                "/", ns.getServerMinSecurityLevel(x),
                "&#10;Money: ", ns.nFormat(ns.getServerMoneyAvailable(x), '$0.00a'), " (",
                Math.round(100 * ns.getServerMoneyAvailable(x) / ns.getServerMaxMoney(x)), "%)"
            ].join("");

            return `<a class="s${f.includes(x) ? " f" : ""}${tryRootAccess(ns, x) ? " r" : ""}" title='${hoverText}''
    
                onClick="(function()
                {
                    const terminalInput = document.getElementById('terminal-input');
                    terminalInput.value='home;connect ${x};cls';
                    const handler = Object.keys(terminalInput)[1];
                    terminalInput[handler].onChange({target:terminalInput});
                    terminalInput[handler].onKeyDown({keyCode:13,preventDefault:()=>null});
                })();"
                
                >${x}</a>` +
                ` <span class="hack ${(hackable ? 'green' : 'red')}">(${reqHack})</span>` +
                `${' @'.repeat(ns.ls(x, ".cct").length)}`;
        };
    let addSc = (x = s[0], p1 = ["\n"], o = p1.join("") + fName(x)) => {
        for (let i = 0; i < s.length; i++) {
            if (p[i] != x) continue;
            let p2 = p1.slice();
            p2[p2.length - 1] = p2[p2.push(p.slice(i + 1).includes(p[i]) ? "├╴" : "└╴") - 2].replace("├╴", "│ ").replace("└╴", "  ");
            o += addSc(s[i], p2);
        }
        return o;
    };
    for (let i = 0, j; i < s.length; i++)
        for (j of ns.scan(s[i]))
            if (!s.includes(j)) {
                if (j.includes('leaf') && !verbose) continue;
                s.push(j), p.push(s[i]);
            }
    tprint(`<div class="sc new">${addSc()}</div>`);
};