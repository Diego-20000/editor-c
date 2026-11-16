#include <stdio.h>
int constructor(int toString) { return toString * 2; }
int valueOf(int hasOwnProperty) { return hasOwnProperty + 1; }
int main() {
    int __proto__ = 3, prototype = 4, arguments = 5, eval = 6, await = 7, async = 8, let = 9, var = 10;
    int function = 11, this = 12, new = 13, class = 14, yield = 15, NaN = 16, undefined = 17, Infinity = 18;
    int null = 19, delete = 20, in = 22, of = 23, with = 24, try = 25, catch = 26, throw = 27, finally = 28;
    int length = 29, name = 30, Math = 31, BigInt = 32, Number = 33, Object = 34, self = 35, window = 36, globalThis = 37;
    int export = 38, import = 39, super = 40, instanceof = 41, debugger = 42, extends = 43, enum_ = 44, static_ = 45;
    printf("%d %d\n", constructor(__proto__), valueOf(prototype));
    printf("%d\n", arguments + eval + await + async + let + var + function + this + new + class + yield + NaN + undefined + Infinity);
    printf("%d\n", null + delete + in + of + with + try + catch + throw + finally + length + name + Math + BigInt + Number + Object + self + window + globalThis);
    printf("%d\n", export + import + super + instanceof + debugger + extends + enum_ + static_);
    return 0;
}
