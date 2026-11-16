#include <stdio.h>
int main() { int I, J, S = 0; for (I = 0, J = 10; I < J; I++, J--) S += J - I; printf("%d %d %d\n", S, I, J); for (I = 0; I < 5; I++); printf("%d\n", I); for (;;) { if (++S > 40) break; } printf("%d\n", S); I = (S = 3, S + 2); printf("%d\n", I); for (I = 10; I--; ) S++; printf("%d %d\n", I, S); return 0; }
