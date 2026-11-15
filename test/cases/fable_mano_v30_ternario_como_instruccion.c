#include <stdio.h>
int main() { int A = 5, B = 0, I; A > 3 ? printf("mayor\n") : printf("menor\n"); B = A > 3 ? A-- : A++; printf("%d %d\n", A, B); for (I = 0; I < 3; I++) printf("%s", I ? ", " : ""), printf("%d", I); printf("\n"); (void) A; return 0; }
