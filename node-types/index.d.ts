// Type definitions for non-npm package Node.js 18.11
// Project: https://nodejs.org/
// Definitions by: Microsoft TypeScript <https://github.com/Microsoft>
//                 DefinitelyTyped <https://github.com/DefinitelyTyped>
//                 Alberto Schiabel <https://github.com/jkomyno>
//                 Alvis HT Tang <https://github.com/alvis>
//                 Andrew Makarov <https://github.com/r3nya>
//                 Benjamin Toueg <https://github.com/btoueg>
//                 Chigozirim C. <https://github.com/smac89>
//                 David Junger <https://github.com/touffy>
//                 Deividas Bakanas <https://github.com/DeividasBakanas>
//                 Eugene Y. Q. Shen <https://github.com/eyqs>
//                 Hannes Magnusson <https://github.com/Hannes-Magnusson-CK>
//                 Huw <https://github.com/hoo29>
//                 Kelvin Jin <https://github.com/kjin>
//                 Klaus Meinhardt <https://github.com/ajafff>
//                 Lishude <https://github.com/islishude>
//                 Mariusz Wiktorczyk <https://github.com/mwiktorczyk>
//                 Mohsen Azimi <https://github.com/mohsen1>
//                 Nicolas Even <https://github.com/n-e>
//                 Nikita Galkin <https://github.com/galkin>
//                 Parambir Singh <https://github.com/parambirs>
//                 Sebastian Silbermann <https://github.com/eps1lon>
//                 Simon Schick <https://github.com/SimonSchick>
//                 Thomas den Hollander <https://github.com/ThomasdenH>
//                 Wilco Bakker <https://github.com/WilcoBakker>
//                 wwwy3y3 <https://github.com/wwwy3y3>
//                 Samuel Ainsworth <https://github.com/samuela>
//                 Kyle Uehlein <https://github.com/kuehlein>
//                 Thanik Bhongbhibhat <https://github.com/bhongy>
//                 Marcin Kopacz <https://github.com/chyzwar>
//                 Trivikram Kamat <https://github.com/trivikr>
//                 Junxiao Shi <https://github.com/yoursunny>
//                 Ilia Baryshnikov <https://github.com/qwelias>
//                 ExE Boss <https://github.com/ExE-Boss>
//                 Piotr Blazejewicz <https://github.com/peterblazejewicz>
//                 Anna Henningsen <https://github.com/addaleax>
//                 Victor Perin <https://github.com/victorperin>
//                 Yongsheng Zhang <https://github.com/ZYSzys>
//                 NodeJS Contributors <https://github.com/NodeJS>
//                 Linus Unneb�ck <https://github.com/LinusU>
//                 wafuwafu13 <https://github.com/wafuwafu13>
//                 Matteo Collina <https://github.com/mcollina>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/**
 * License for programmatically and manually incorporated
 * documentation aka. `JSDoc` from https://github.com/nodejs/node/tree/master/doc
 *
 * Copyright Node.js contributors. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

// NOTE: These definitions support NodeJS and TypeScript 4.9+.

// Reference required types from the default lib:
/// <reference lib="es2020" />
/// <reference lib="esnext.asynciterable" />
/// <reference lib="esnext.intl" />
/// <reference lib="esnext.bigint" />

// Base definitions for all NodeJS modules that are not specific to any version of TypeScript:
/// <reference path="node_modules/@types/node/assert.d.ts" />
/// <reference path="node_modules/@types/node/assert/strict.d.ts" />
/// <reference path="node_modules/@types/node/globals.d.ts" />
/// <reference path="node_modules/@types/node/async_hooks.d.ts" />
/// <reference path="node_modules/@types/node/buffer.d.ts" />
/// <reference path="node_modules/@types/node/child_process.d.ts" />
/// <reference path="node_modules/@types/node/cluster.d.ts" />
/// <reference path="node_modules/@types/node/console.d.ts" />
/// <reference path="node_modules/@types/node/constants.d.ts" />
/// <reference path="node_modules/@types/node/crypto.d.ts" />
/// <reference path="node_modules/@types/node/dgram.d.ts" />
/// <reference path="node_modules/@types/node/diagnostics_channel.d.ts" />
/// <reference path="node_modules/@types/node/dns.d.ts" />
/// <reference path="node_modules/@types/node/dns/promises.d.ts" />
/// <reference path="node_modules/@types/node/dns/promises.d.ts" />
/// <reference path="node_modules/@types/node/domain.d.ts" />
/// <reference path="node_modules/@types/node/events.d.ts" />
/// <reference path="node_modules/@types/node/fs.d.ts" />
/// <reference path="node_modules/@types/node/fs/promises.d.ts" />
/// <reference path="node_modules/@types/node/http.d.ts" />
/// <reference path="node_modules/@types/node/http2.d.ts" />
/// <reference path="node_modules/@types/node/https.d.ts" />
/// <reference path="node_modules/@types/node/inspector.d.ts" />
/// <reference path="node_modules/@types/node/module.d.ts" />
/// <reference path="node_modules/@types/node/net.d.ts" />
/// <reference path="node_modules/@types/node/os.d.ts" />
/// <reference path="node_modules/@types/node/path.d.ts" />
/// <reference path="node_modules/@types/node/perf_hooks.d.ts" />
/// <reference path="node_modules/@types/node/process.d.ts" />
/// <reference path="node_modules/@types/node/punycode.d.ts" />
/// <reference path="node_modules/@types/node/querystring.d.ts" />
/// <reference path="node_modules/@types/node/readline.d.ts" />
/// <reference path="node_modules/@types/node/readline/promises.d.ts" />
/// <reference path="node_modules/@types/node/repl.d.ts" />
/// <reference path="node_modules/@types/node/stream.d.ts" />
/// <reference path="node_modules/@types/node/stream/promises.d.ts" />
/// <reference path="node_modules/@types/node/stream/consumers.d.ts" />
/// <reference path="node_modules/@types/node/stream/web.d.ts" />
/// <reference path="node_modules/@types/node/string_decoder.d.ts" />
/// <reference path="node_modules/@types/node/test.d.ts" />
/// <reference path="node_modules/@types/node/timers.d.ts" />
/// <reference path="node_modules/@types/node/timers/promises.d.ts" />
/// <reference path="node_modules/@types/node/tls.d.ts" />
/// <reference path="node_modules/@types/node/trace_events.d.ts" />
/// <reference path="node_modules/@types/node/tty.d.ts" />
/// <reference path="node_modules/@types/node/url.d.ts" />
/// <reference path="node_modules/@types/node/util.d.ts" />
/// <reference path="node_modules/@types/node/v8.d.ts" />
/// <reference path="node_modules/@types/node/vm.d.ts" />
/// <reference path="node_modules/@types/node/wasi.d.ts" />
/// <reference path="node_modules/@types/node/worker_threads.d.ts" />
/// <reference path="node_modules/@types/node/zlib.d.ts" />
/// <reference path="node_modules/@types/node/globals.global.d.ts" />
