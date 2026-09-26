// おえかきロジックの もんだい。'.' は ぬらない マス、ほかの もじは ぬる マス（もじは いろ）。
// ぜんぶ「ひとつの こたえに きまる」ことを たしかめて ある（tools/solve.py）。
'use strict';
const PUZZLES = [
{
"name": "ハート",
"rows": [
".R.R.",
"RRRRR",
"RRRRR",
".RRR.",
"..R.."
]
},
{
"name": "チューリップ",
"rows": [
"P.P.P",
"PPPPP",
".PPP.",
"..G..",
"GGGGG"
]
},
{
"name": "さかな",
"rows": [
".BB..",
"BBBBB",
"BBKBB",
"BBBB.",
".BB.B"
]
},
{
"name": "きのこ",
"rows": [
".RRR.",
"RWRWR",
"RRRRR",
"..W..",
".WWW."
]
},
{
"name": "ほし",
"rows": [
"..Y..",
"YYYYY",
".YYY.",
".Y.Y.",
"Y...Y"
]
},
{
"name": "いえ",
"rows": [
"..R..",
".RRR.",
"RRRRR",
".N.N.",
".NNN."
]
},
{
"name": "りんご",
"rows": [
"....G...",
"...GN...",
".RRRNRR.",
"RRRRRRRR",
"RRRRRRWR",
"RRRRRRRR",
".RRRRRR.",
"..RR.RR."
]
},
{
"name": "ねこ",
"rows": [
"O......O",
"OO....OO",
"OOOOOOOO",
"O.OOOO.O",
"OOOOOOOO",
"OOOPPOOO",
".OOOOOO.",
"O.OOOO.O"
]
},
{
"name": "かさ",
"rows": [
"...BB...",
".BBBBBB.",
"BBBBBBBB",
"BBBBBBBB",
"...N....",
"...N....",
"...N.N..",
"....N..."
]
},
{
"name": "おばけ",
"rows": [
"..WWWW..",
".WWWWWW.",
"WWKWWKWW",
"WWKWWKWW",
"WWWWWWWW",
"WWWKKWWW",
"WWWWWWWW",
"W.WW.WW."
]
},
{
"name": "ロケット",
"rows": [
"...RR...",
"..RWWR..",
"..WBBW..",
"..WBBW..",
"..WWWW..",
".RWWWWR.",
"RR.OO.RR",
"...OO..."
]
},
{
"name": "さくらんぼ",
"rows": [
".....G..",
"....GG..",
"...G.G..",
"..G...G.",
".RR..RR.",
"RRRRRRRR",
"RRRRRRRR",
".RR..RR."
]
},
{
"name": "モノレール",
"rows": [
"KKKKKKKKKK",
"...K..K...",
".WWWWWWWW.",
"WBBWBBWBBW",
"WBBWBBWBBW",
"WWWWWWWWWW",
"WBBBBBBBBW",
".WWWWWWWW.",
"..........",
"GGGGGGGGGG"
]
},
{
"name": "パンダ",
"rows": [
"KK......KK",
"KKWWWWWWKK",
".WWWWWWWW.",
"WWKKWWKKWW",
"WKKWWWWKKW",
"WWWWKKWWWW",
"WWWWWWWWWW",
".WWWKKWWW.",
"..WWWWWW..",
".........."
]
},
{
"name": "ちょうちょ",
"rows": [
"PP......PP",
"PPP....PPP",
"PPPP..PPPP",
"PPPPKKPPPP",
".PPPKKPPP.",
"..PPKKPP..",
".PPPKKPPP.",
"PPPPKKPPPP",
"PPP.KK.PPP",
"PP..KK..PP"
]
},
{
"name": "くるま",
"rows": [
"..........",
"...RRRR...",
"..RBBRBR..",
".RRBBRBRR.",
"RRRRRRRRRR",
"RRRRRRRRRR",
"RKKRRRRKKR",
".KK....KK.",
"..........",
"GGGGGGGGGG"
]
},
{
"name": "あおい",
"rows": [
"...KKKK...",
"..KKKKKKK.",
".KKKKKKKKK",
".KSSSSSSKK",
".SSKSSKSSK",
".SSSSSSSS.",
".SPSSSSPS.",
"..SSSSSS..",
"...VVVV...",
"..VVVVVV.."
]
},
{
"name": "ソフトクリーム",
"rows": [
"....WW....",
"...WWWW...",
"..WWWWWW..",
"...WWWW...",
"..WWWWWW..",
"..OOOOOO..",
"...OOOO...",
"...OOOO...",
"....OO....",
"....OO...."
]
}
];
